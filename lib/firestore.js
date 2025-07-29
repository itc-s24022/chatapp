
import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDocs, 
    getDoc,
    query, 
    where, 
    orderBy, 
    onSnapshot,
    serverTimestamp,
    arrayUnion,
    arrayRemove 
} from 'firebase/firestore';
import { db } from './firebase';

// サーバー関連
export const createServer = async (name, ownerId) => {
    const serverData = {
        name,
        ownerId,
        members: [ownerId],
        createdAt: serverTimestamp(),
        channels: []
    };
    
    const serverRef = await addDoc(collection(db, 'servers'), serverData);
    
    // デフォルトチャンネル作成
    await createChannel('一般', 'text', serverRef.id, ownerId);
    
    return serverRef.id;
};

export const getUserServers = (userId, callback) => {
    const q = query(
        collection(db, 'servers'),
        where('members', 'array-contains', userId)
    );
    
    return onSnapshot(q, callback);
};

export const joinServer = async (serverId, userId) => {
    const serverRef = doc(db, 'servers', serverId);
    await updateDoc(serverRef, {
        members: arrayUnion(userId)
    });
};

// チャンネル関連
export const createChannel = async (name, type, serverId, creatorId) => {
    const channelData = {
        name,
        type, // 'text' or 'voice'
        serverId,
        creatorId,
        createdAt: serverTimestamp(),
        members: [],
        permissions: {}
    };
    
    return await addDoc(collection(db, 'channels'), channelData);
};

export const getServerChannels = (serverId, callback) => {
    const q = query(
        collection(db, 'channels'),
        where('serverId', '==', serverId),
        orderBy('createdAt', 'asc')
    );
    
    return onSnapshot(q, callback);
};

export const deleteChannel = async (channelId) => {
    await deleteDoc(doc(db, 'channels', channelId));
};

// メッセージ関連
export const sendMessage = async (channelId, userId, userName, content, replyTo = null) => {
    const messageData = {
        channelId,
        userId,
        userName,
        content,
        timestamp: serverTimestamp(),
        reactions: {},
        edited: false,
        replyTo
    };
    
    return await addDoc(collection(db, 'messages'), messageData);
};

export const getChannelMessages = (channelId, callback) => {
    const q = query(
        collection(db, 'messages'),
        where('channelId', '==', channelId),
        orderBy('timestamp', 'asc')
    );
    
    return onSnapshot(q, callback);
};

export const editMessage = async (messageId, newContent) => {
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
        content: newContent,
        edited: true,
        editedAt: serverTimestamp()
    });
};

export const deleteMessage = async (messageId) => {
    await deleteDoc(doc(db, 'messages', messageId));
};

export const addReaction = async (messageId, userId, emoji) => {
    const messageRef = doc(db, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    const reactions = messageDoc.data().reactions || {};
    
    if (!reactions[emoji]) {
        reactions[emoji] = [];
    }
    
    if (!reactions[emoji].includes(userId)) {
        reactions[emoji].push(userId);
    }
    
    await updateDoc(messageRef, { reactions });
};

export const removeReaction = async (messageId, userId, emoji) => {
    const messageRef = doc(db, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    const reactions = messageDoc.data().reactions || {};
    
    if (reactions[emoji]) {
        reactions[emoji] = reactions[emoji].filter(id => id !== userId);
        if (reactions[emoji].length === 0) {
            delete reactions[emoji];
        }
    }
    
    await updateDoc(messageRef, { reactions });
};

// フレンド・DM関連
export const sendFriendRequest = async (fromUserId, toUserId) => {
    const requestData = {
        fromUserId,
        toUserId,
        status: 'pending',
        createdAt: serverTimestamp()
    };
    
    return await addDoc(collection(db, 'friendRequests'), requestData);
};

export const acceptFriendRequest = async (requestId, fromUserId, toUserId) => {
    // フレンドリストに追加
    await addDoc(collection(db, 'friends'), {
        user1: fromUserId,
        user2: toUserId,
        createdAt: serverTimestamp()
    });
    
    // リクエスト削除
    await deleteDoc(doc(db, 'friendRequests', requestId));
    
    // DMチャンネル作成
    await createDMChannel(fromUserId, toUserId);
};

export const createDMChannel = async (user1Id, user2Id) => {
    const dmData = {
        type: 'dm',
        members: [user1Id, user2Id],
        createdAt: serverTimestamp()
    };
    
    return await addDoc(collection(db, 'dmChannels'), dmData);
};

export const getUserDMs = (userId, callback) => {
    const q = query(
        collection(db, 'dmChannels'),
        where('members', 'array-contains', userId)
    );
    
    return onSnapshot(q, callback);
};

export const getUserFriends = (userId, callback) => {
    const q1 = query(
        collection(db, 'friends'),
        where('user1', '==', userId)
    );
    
    const q2 = query(
        collection(db, 'friends'),
        where('user2', '==', userId)
    );
    
    // 両方のクエリを監視
    const unsubscribe1 = onSnapshot(q1, callback);
    const unsubscribe2 = onSnapshot(q2, callback);
    
    return () => {
        unsubscribe1();
        unsubscribe2();
    };
};
