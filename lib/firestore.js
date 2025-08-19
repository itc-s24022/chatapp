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
    arrayRemove,
    setDoc
} from 'firebase/firestore';
import { db } from './firebase';

// Check if Firebase is properly initialized
const isFirebaseReady = () => {
    try {
        return db && typeof db !== 'undefined';
    } catch (error) {
        console.error('Firebase not initialized:', error);
        return false;
    }
};

// サーバー関連
export const createServer = async (name, ownerId, ownerName) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const serverData = {
        name,
        ownerId,
        members: [ownerId],
        createdAt: serverTimestamp(),
        channels: [],
        icon: null
    };
    const serverRef = await addDoc(collection(db, 'servers'), serverData);

    // デフォルトロールを作成
    const roleIds = {};
    for (const roleData of DEFAULT_ROLES) {
        const roleRef = await addDoc(collection(db, 'serverRoles'), {
            ...roleData,
            serverId: serverRef.id,
            createdAt: serverTimestamp()
        });
        roleIds[roleData.name] = roleRef.id;
    }

    // オーナーをメンバーとして追加（オーナーロールを付与）
    await addMemberToServer(serverRef.id, ownerId, ownerName, [roleIds['オーナー']]);

    // デフォルトチャンネル作成
    await createChannel('一般', 'text', serverRef.id, ownerId);
    return serverRef.id;
};

export const getUserServers = (userId, callback, errorCallback) => {
    if (!isFirebaseReady()) {
        console.error('Firebase not initialized');
        return () => {};
    }

    console.log('getUserServers 呼び出し - ユーザーID:', userId);
    const q = query(
        collection(db, 'servers'),
        where('members', 'array-contains', userId)
    );
    console.log('Firestore クエリ作成完了');
    return onSnapshot(q, callback, errorCallback);
};

export async function getUserById(uid) {
    if (!isFirebaseReady()) {
        console.error('Firebase not initialized');
        return {};
    }

    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        return snap.data();
    }
    return {};
}

export const joinServer = async (serverId, userId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const serverRef = doc(db, 'servers', serverId);
    await updateDoc(serverRef, {
        members: arrayUnion(userId)
    });
};

// チャンネル関連
export const createChannel = async (name, type, serverId, creatorId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

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
    if (!isFirebaseReady()) {
        console.error('Firebase not initialized');
        return () => {};
    }

    const q = query(
        collection(db, 'channels'),
        where('serverId', '==', serverId)
    );
    return onSnapshot(q, callback);
};

export const deleteChannel = async (channelId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    await deleteDoc(doc(db, 'channels', channelId));
};

// サーバーから退会
export const leaveServer = async (serverId, userId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        // サーバーの所有者は退会できない
        const serverDoc = await getDoc(doc(db, 'servers', serverId));
        if (!serverDoc.exists()) {
            throw new Error('サーバーが見つかりません');
        }
        const serverData = serverDoc.data();
        if (serverData.ownerId === userId) {
            throw new Error('サーバーの所有者は退会できません');
        }

        // サーバーメンバーコレクションから削除
        const memberQuery = query(
            collection(db, 'serverMembers'),
            where('serverId', '==', serverId),
            where('uid', '==', userId)
        );
        const memberSnapshot = await getDocs(memberQuery);
        if (!memberSnapshot.empty) {
            await deleteDoc(memberSnapshot.docs[0].ref);
        }

        // サーバーのメンバーリストからも削除
        const serverRef = doc(db, 'servers', serverId);
        await updateDoc(serverRef, {
            members: arrayRemove(userId)
        });

        console.log('サーバーから退会しました');
        return true;
    } catch (error) {
        console.error('サーバー退会エラー:', error);
        throw error;
    }
};

// メッセージ関連
export const sendMessage = async (channelId, userId, userName, content, replyTo = null) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

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
    if (!isFirebaseReady()) {
        console.error('Firebase not initialized');
        return () => {};
    }

    const q = query(
        collection(db, 'messages'),
        where('channelId', '==', channelId)
    );
    return onSnapshot(q, callback);
};

export const editMessage = async (messageId, newContent) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
        content: newContent,
        edited: true,
        editedAt: serverTimestamp()
    });
};

export const deleteMessage = async (messageId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    await deleteDoc(doc(db, 'messages', messageId));
};

export const addReaction = async (messageId, userId, emoji) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

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
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

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

// フレンド関連の関数
// ユーザーのフレンド一覧を取得
export const getUserFriends = (userId, callback, errorCallback) => {
    if (!isFirebaseReady()) {
        console.error('Firebase not initialized');
        if (errorCallback) errorCallback(new Error('Firebaseが初期化されていません'));
        return () => {};
    }

    try {
        const friendsRef = collection(db, 'friends');
        const q = query(
            friendsRef,
            where('participants', 'array-contains', userId),
            where('status', '==', 'accepted')
        );
        return onSnapshot(q, callback, errorCallback);
    } catch (error) {
        console.error('フレンド取得エラー:', error);
        if (errorCallback) errorCallback(error);
        return () => {};
    }
};

// フレンドリクエストを送信
export const sendFriendRequest = async (senderId, senderName, receiverEmail) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        console.log('フレンドリクエスト送信開始:', { senderId, senderName, receiverEmail });

        // 受信者のユーザー情報を取得（重複を排除）
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', receiverEmail.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);
        console.log('ユーザー検索結果:', querySnapshot.size, '件');

        if (querySnapshot.empty) {
            throw new Error('指定されたメールアドレスのユーザーが見つかりません');
        }

        const receiverDoc = querySnapshot.docs[0];
        const receiverId = receiverDoc.id;
        const receiverData = receiverDoc.data();
        console.log('受信者情報:', { receiverId, receiverData });

        if (receiverId === senderId) {
            throw new Error('自分自身にフレンドリクエストを送ることはできません');
        }

        // 既存のフレンド関係をチェック
        const friendsRef = collection(db, 'friends');
        const existingQuery = query(
            friendsRef,
            where('participants', 'array-contains', senderId)
        );
        const existingSnapshot = await getDocs(existingQuery);
        const existingFriend = existingSnapshot.docs.find(doc =>
            doc.data().participants.includes(receiverId)
        );

        if (existingFriend) {
            const status = existingFriend.data().status;
            if (status === 'accepted') {
                throw new Error('既にフレンドです');
            } else if (status === 'pending') {
                throw new Error('既にフレンドリクエストを送信済みです');
            }
        }

        // フレンドリクエストを作成
        await addDoc(friendsRef, {
            senderId,
            senderName,
            receiverId,
            receiverName: receiverData.displayName || receiverData.email || `ユーザー${receiverId.substring(0, 4)}`,
            participants: [senderId, receiverId],
            status: 'pending',
            createdAt: serverTimestamp()
        });

        console.log('フレンドリクエスト送信完了');
        return true;
    } catch (error) {
        console.error('フレンドリクエスト送信エラー:', error);
        throw error;
    }
};

// フレンドリクエストを承認
export const acceptFriendRequest = async (requestId, currentUserId, currentUserName, senderId, senderName) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        const friendRef = doc(db, 'friends', requestId);
        await updateDoc(friendRef, {
            status: 'accepted',
            acceptedAt: serverTimestamp()
        });

        // DMチャンネルを作成
        await createDMChannel(currentUserId, senderId, currentUserName, senderName);
        console.log('フレンドリクエスト承認完了');
    } catch (error) {
        console.error('フレンドリクエスト承認エラー:', error);
        throw error;
    }
};

// フレンドリクエストを拒否
export const declineFriendRequest = async (requestId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        const friendRef = doc(db, 'friends', requestId);
        await deleteDoc(friendRef);
        console.log('フレンドリクエスト拒否完了');
    } catch (error) {
        console.error('フレンドリクエスト拒否エラー:', error);
        throw error;
    }
};

// ユーザーのフレンドリクエスト一覧を取得
export const getFriendRequests = (userId, callback, errorCallback) => {
    if (!isFirebaseReady()) {
        console.error('Firebase not initialized');
        if (errorCallback) errorCallback(new Error('Firebaseが初期化されていません'));
        return () => {};
    }

    try {
        const friendsRef = collection(db, 'friends');
        const q = query(
            friendsRef,
            where('receiverId', '==', userId),
            where('status', '==', 'pending')
        );
        return onSnapshot(q, callback, errorCallback);
    } catch (error) {
        console.error('フレンドリクエスト取得エラー:', error);
        if (errorCallback) errorCallback(error);
        return () => {};
    }
};

// フレンドをブロック
export const blockFriend = async (userId, friendId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        const blocksRef = collection(db, 'blocks');
        await addDoc(blocksRef, {
            userId,
            blockedUserId: friendId,
            createdAt: serverTimestamp()
        });

        // フレンド関係を削除
        const friendsRef = collection(db, 'friends');
        const q = query(
            friendsRef,
            where('participants', 'array-contains', userId)
        );
        const querySnapshot = await getDocs(q);
        const friendDoc = querySnapshot.docs.find(doc =>
            doc.data().participants.includes(friendId)
        );

        if (friendDoc) {
            await deleteDoc(doc(db, 'friends', friendDoc.id));
        }

        console.log('ユーザーをブロックしました');
    } catch (error) {
        console.error('ブロックエラー:', error);
        throw error;
    }
};

// ブロックを解除
export const unblockFriend = async (userId, friendId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        const blocksRef = collection(db, 'blocks');
        const q = query(
            blocksRef,
            where('userId', '==', userId),
            where('blockedUserId', '==', friendId)
        );
        const querySnapshot = await getDocs(q);

        querySnapshot.docs.forEach(async (blockDoc) => {
            await deleteDoc(doc(db, 'blocks', blockDoc.id));
        });

        console.log('ブロックを解除しました');
    } catch (error) {
        console.error('ブロック解除エラー:', error);
        throw error;
    }
};

// フレンドリクエストに応答する関数
export const respondToFriendRequest = async (requestId, accept) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        const requestRef = doc(db, 'friends', requestId);
        const requestDoc = await getDoc(requestRef);
        if (!requestDoc.exists()) {
            throw new Error('フレンドリクエストが見つかりません');
        }
        const requestData = requestDoc.data();

        if (accept) {
            // リクエストを受け入れる
            await updateDoc(requestRef, {
                status: 'accepted',
                updatedAt: serverTimestamp()
            });

            // DMチャンネルを作成
            await createDMChannel(
                requestData.senderId,
                requestData.receiverId,
                requestData.senderName,
                requestData.receiverName
            );

            console.log('フレンドリクエスト承認完了');
        } else {
            // リクエストを拒否する
            await deleteDoc(requestRef);
            console.log('フレンドリクエスト拒否完了');
        }

        return { success: true };
    } catch (error) {
        console.error('フレンドリクエスト応答エラー:', error);
        throw error;
    }
};

// ブロックされたユーザー一覧を取得
export const getBlockedUsers = (userId, callback, errorCallback) => {
    if (!isFirebaseReady()) {
        console.error('Firebase not initialized');
        if (errorCallback) errorCallback(new Error('Firebaseが初期化されていません'));
        return () => {};
    }

    try {
        const blocksRef = collection(db, 'blocks');
        const q = query(
            blocksRef,
            where('userId', '==', userId)
        );
        return onSnapshot(q, callback, errorCallback);
    } catch (error) {
        console.error('ブロック一覧取得エラー:', error);
        if (errorCallback) errorCallback(error);
        return () => {};
    }
};

// DM関連の関数
// ユーザーのDMチャンネル一覧を取得
export const getUserDMs = (userId, callback, errorCallback) => {
    if (!isFirebaseReady()) {
        console.error('Firebase not initialized');
        if (errorCallback) errorCallback(new Error('Firebaseが初期化されていません'));
        return () => {};
    }

    try {
        const channelsRef = collection(db, 'channels');
        const q = query(
            channelsRef,
            where('type', '==', 'dm'),
            where('participants', 'array-contains', userId),
            orderBy('lastMessageAt', 'desc')
        );
        return onSnapshot(q, callback, errorCallback);
    } catch (error) {
        console.error('DM取得エラー:', error);
        // lastMessageAtでソートできない場合はcreatedAtでソート
        const channelsRef = collection(db, 'channels');
        const q = query(
            channelsRef,
            where('type', '==', 'dm'),
            where('participants', 'array-contains', userId),
            orderBy('createdAt', 'desc')
        );
        return onSnapshot(q, callback, errorCallback);
    }
};

// DMチャンネルを作成
export const createDMChannel = async (userId1, userId2, userName1, userName2) => {
    try {
        if (!isFirebaseReady()) {
            throw new Error('Firebaseが初期化されていません');
        }

        // ユーザー名がundefinedまたは'匿名'の場合は、Firestoreから取得またはメールアドレスを使用
        if (!userName1 || userName1 === '匿名') {
            try {
                const user1Ref = doc(db, 'users', userId1);
                const user1Doc = await getDoc(user1Ref);
                if (user1Doc.exists()) {
                    const userData = user1Doc.data();
                    userName1 = userData.displayName || userData.email || `ユーザー${userId1.substring(0, 4)}`;
                } else {
                    userName1 = `ユーザー${userId1.substring(0, 4)}`;
                }
            } catch (error) {
                console.error('Error fetching user1 data:', error);
                userName1 = `ユーザー${userId1.substring(0, 4)}`;
            }
        }

        if (!userName2 || userName2 === '匿名') {
            try {
                const user2Ref = doc(db, 'users', userId2);
                const user2Doc = await getDoc(user2Ref);
                if (user2Doc.exists()) {
                    const userData = user2Doc.data();
                    userName2 = userData.displayName || userData.email || `ユーザー${userId2.substring(0, 4)}`;
                } else {
                    userName2 = `ユーザー${userId2.substring(0, 4)}`;
                }
            } catch (error) {
                console.error('Error fetching user2 data:', error);
                userName2 = `ユーザー${userId2.substring(0, 4)}`;
            }
        }

        // 既存のDMチャンネルがあるかチェック
        try {
            const channelsRef = collection(db, 'channels');
            const q = query(
                channelsRef,
                where('type', '==', 'dm'),
                where('participants', 'array-contains', userId1)
            );
            const querySnapshot = await getDocs(q);
            const existingDM = querySnapshot.docs.find(doc => {
                const data = doc.data();
                return data.participants.includes(userId2);
            });

            if (existingDM) {
                return {
                    id: existingDM.id,
                    ...existingDM.data()
                };
            }
        } catch (error) {
            console.error('Error checking existing DM:', error);
        }

        // participantNamesオブジェクトを安全に作成
        const participantNames = {};
        participantNames[userId1] = userName1;
        participantNames[userId2] = userName2;

        // 新しいDMチャンネルを作成
        try {
            const channelsRef = collection(db, 'channels');
            const dmRef = await addDoc(channelsRef, {
                type: 'dm',
                participants: [userId1, userId2],
                participantNames: participantNames,
                createdAt: serverTimestamp(),
                lastMessage: null,
                lastMessageAt: null
            });

            console.log('DMチャンネル作成完了:', dmRef.id);
            return {
                id: dmRef.id,
                type: 'dm',
                participants: [userId1, userId2],
                participantNames: participantNames
            };
        } catch (error) {
            console.error('Error creating DM channel:', error);
            throw error;
        }
    } catch (error) {
        console.error('DMチャンネル作成エラー:', error);
        throw error;
    }
};

// DMにメッセージを送信
export const sendDMMessage = async (channelId, userId, userName, content, replyToId = null) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        // メッセージを追加
        const messagesRef = collection(db, 'messages');
        const messageData = {
            channelId,
            userId,
            userName,
            content,
            timestamp: serverTimestamp(),
            edited: false
        };

        if (replyToId) {
            // 返信先のメッセージ内容を取得
            const replyToRef = doc(db, 'messages', replyToId);
            const replyToDoc = await getDoc(replyToRef);
            if (replyToDoc.exists()) {
                messageData.replyTo = replyToDoc.data().content.substring(0, 50) + (replyToDoc.data().content.length > 50 ? '...' : '');
                messageData.replyToId = replyToId;
            }
        }

        await addDoc(messagesRef, messageData);

        // DMチャンネルの最終メッセージ情報を更新
        const channelRef = doc(db, 'channels', channelId);
        await updateDoc(channelRef, {
            lastMessage: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
            lastMessageAt: serverTimestamp(),
            lastMessageUserId: userId,
            lastMessageUserName: userName
        });

        console.log('DMメッセージ送信完了');
    } catch (error) {
        console.error('DMメッセージ送信エラー:', error);
        throw error;
    }
};

// DMチャンネルを非表示
export const hideDMChannel = async (channelId, userId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        // DMチャンネルに非表示フラグを追加
        const channelRef = doc(db, 'channels', channelId);
        const channelDoc = await getDoc(channelRef);
        if (channelDoc.exists()) {
            const data = channelDoc.data();
            const hiddenFor = data.hiddenFor || [];
            if (!hiddenFor.includes(userId)) {
                hiddenFor.push(userId);
                await updateDoc(channelRef, {
                    hiddenFor
                });
            }
        }
        console.log('DMチャンネルを非表示にしました');
    } catch (error) {
        console.error('DMチャンネル非表示エラー:', error);
        throw error;
    }
};

// DMチャンネルを表示
export const showDMChannel = async (channelId, userId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        const channelRef = doc(db, 'channels', channelId);
        const channelDoc = await getDoc(channelRef);
        if (channelDoc.exists()) {
            const data = channelDoc.data();
            const hiddenFor = data.hiddenFor || [];
            const newHiddenFor = hiddenFor.filter(id => id !== userId);
            await updateDoc(channelRef, {
                hiddenFor: newHiddenFor
            });
        }
        console.log('DMチャンネルを表示しました');
    } catch (error) {
        console.error('DMチャンネル表示エラー:', error);
        throw error;
    }
};

// DMチャンネルのユーザー名を更新
export const updateDMChannelNames = async (userId, newDisplayName) => {
    try {
        if (!isFirebaseReady()) {
            throw new Error('Firebaseが初期化されていません');
        }

        // ユーザーが参加している全てのDMチャンネルを取得
        const channelsRef = collection(db, 'channels');
        const q = query(
            channelsRef,
            where('type', '==', 'dm'),
            where('participants', 'array-contains', userId)
        );
        const querySnapshot = await getDocs(q);

        // 各DMチャンネルのparticipantNamesを更新
        const updatePromises = querySnapshot.docs.map(doc => {
            const channelRef = doc.ref;
            const channelData = doc.data();
            const participantNames = channelData.participantNames || {};

            // ユーザー名を更新
            participantNames[userId] = newDisplayName;

            return updateDoc(channelRef, { participantNames });
        });

        await Promise.all(updatePromises);
        console.log('DMチャンネルのユーザー名を更新しました:', userId, newDisplayName);
    } catch (error) {
        console.error('DMチャンネル名更新エラー:', error);
        throw error;
    }
};

// オンラインステータス更新
export const updateOnlineStatus = async (userId, status) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            onlineStatus: status,
            lastSeen: serverTimestamp()
        });
    } catch (error) {
        console.error('オンラインステータス更新エラー:', error);
        throw error;
    }
};

// ユーザーのオンラインステータスを取得
export const getUserOnlineStatus = (userId, callback, errorCallback) => {
    if (!isFirebaseReady()) {
        console.error('Firebase not initialized');
        if (errorCallback) errorCallback(new Error('Firebaseが初期化されていません'));
        return () => {};
    }

    try {
        const userRef = doc(db, 'users', userId);
        return onSnapshot(userRef, callback, errorCallback);
    } catch (error) {
        console.error('オンラインステータス取得エラー:', error);
        if (errorCallback) errorCallback(error);
        return () => {};
    }
};

// サーバーメンバー管理
export const getServerMembers = (serverId, callback) => {
    if (!isFirebaseReady()) {
        console.error('Firebase not initialized');
        return () => {};
    }

    const q = query(
        collection(db, 'serverMembers'),
        where('serverId', '==', serverId)
    );
    return onSnapshot(q, callback);
};

export const addMemberToServer = async (serverId, userId, userName, roles = []) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    // @everyoneロールを取得
    const everyoneRoleQuery = query(
        collection(db, 'serverRoles'),
        where('serverId', '==', serverId),
        where('isDefault', '==', true)
    );
    const everyoneSnapshot = await getDocs(everyoneRoleQuery);
    const everyoneRoleId = everyoneSnapshot.docs[0]?.id;
    const memberRoles = roles.length > 0 ? roles : (everyoneRoleId ? [everyoneRoleId] : []);

    const memberData = {
        serverId,
        uid: userId,
        displayName: userName,
        roles: memberRoles,
        joinedAt: serverTimestamp(),
        avatar: null
    };

    // サーバーのメンバーリストにも追加
    const serverRef = doc(db, 'servers', serverId);
    await updateDoc(serverRef, {
        members: arrayUnion(userId)
    });

    return await addDoc(collection(db, 'serverMembers'), memberData);
};

export const updateMemberRoles = async (serverId, userId, newRoles) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const q = query(
        collection(db, 'serverMembers'),
        where('serverId', '==', serverId),
        where('uid', '==', userId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const memberDoc = snapshot.docs[0];
        await updateDoc(memberDoc.ref, { roles: newRoles });
    }
};

// メンバーの権限チェック
export const getMemberPermissions = async (serverId, userId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const memberQuery = query(
        collection(db, 'serverMembers'),
        where('serverId', '==', serverId),
        where('uid', '==', userId)
    );
    const memberSnapshot = await getDocs(memberQuery);
    if (memberSnapshot.empty) return [];

    const member = memberSnapshot.docs[0].data();
    const roleIds = member.roles || [];
    if (roleIds.length === 0) return [];

    // ロールの権限を取得
    const roleQuery = query(
        collection(db, 'serverRoles'),
        where('serverId', '==', serverId)
    );
    const roleSnapshot = await getDocs(roleQuery);
    const roles = roleSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(role => roleIds.includes(role.id));

    // 全ての権限をマージ
    const permissions = new Set();
    roles.forEach(role => {
        if (role.permissions) {
            role.permissions.forEach(permission => permissions.add(permission));
        }
    });

    return Array.from(permissions);
};

// 権限チェック関数
export const hasPermission = (permissions, requiredPermission) => {
    return permissions.includes(DEFAULT_PERMISSIONS.ADMINISTRATOR) ||
        permissions.includes(requiredPermission);
};

export const removeMemberFromServer = async (serverId, userId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    // サーバーメンバーコレクションから削除
    const q = query(
        collection(db, 'serverMembers'),
        where('serverId', '==', serverId),
        where('uid', '==', userId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        await deleteDoc(snapshot.docs[0].ref);
    }

    // サーバーのメンバーリストからも削除
    const serverRef = doc(db, 'servers', serverId);
    await updateDoc(serverRef, {
        members: arrayRemove(userId)
    });
};

// 権限管理システム
export const DEFAULT_PERMISSIONS = {
    // 一般管理
    ADMINISTRATOR: 'administrator',
    MANAGE_SERVER: 'manage_server',
    MANAGE_ROLES: 'manage_roles',
    MANAGE_CHANNELS: 'manage_channels',
    // メッセージ・チャット操作
    SEND_MESSAGES: 'send_messages',
    EDIT_DELETE_MESSAGES: 'edit_delete_messages',
    PIN_MESSAGES: 'pin_messages',
    EMBED_LINKS: 'embed_links',
    ATTACH_FILES: 'attach_files',
    MENTION_EVERYONE: 'mention_everyone',
    USE_EXTERNAL_EMOJIS: 'use_external_emojis',
    // メンバー管理
    VIEW_MEMBERS: 'view_members',
    ADD_FRIENDS: 'add_friends',
    MANAGE_MEMBERS: 'manage_members',
    ASSIGN_ROLES: 'assign_roles'
};

export const DEFAULT_ROLES = [
    {
        name: 'オーナー',
        color: '#f04747',
        permissions: Object.values(DEFAULT_PERMISSIONS),
        position: 100,
        isDefault: false,
        canBeDeleted: false
    },
    {
        name: '管理者',
        color: '#f04747',
        permissions: [
            DEFAULT_PERMISSIONS.MANAGE_SERVER,
            DEFAULT_PERMISSIONS.MANAGE_ROLES,
            DEFAULT_PERMISSIONS.MANAGE_CHANNELS,
            DEFAULT_PERMISSIONS.SEND_MESSAGES,
            DEFAULT_PERMISSIONS.EDIT_DELETE_MESSAGES,
            DEFAULT_PERMISSIONS.PIN_MESSAGES,
            DEFAULT_PERMISSIONS.EMBED_LINKS,
            DEFAULT_PERMISSIONS.ATTACH_FILES,
            DEFAULT_PERMISSIONS.MENTION_EVERYONE,
            DEFAULT_PERMISSIONS.USE_EXTERNAL_EMOJIS,
            DEFAULT_PERMISSIONS.VIEW_MEMBERS,
            DEFAULT_PERMISSIONS.MANAGE_MEMBERS,
            DEFAULT_PERMISSIONS.ASSIGN_ROLES
        ],
        position: 90,
        isDefault: false,
        canBeDeleted: true
    },
    {
        name: 'モデレーター',
        color: '#5865f2',
        permissions: [
            DEFAULT_PERMISSIONS.SEND_MESSAGES,
            DEFAULT_PERMISSIONS.EDIT_DELETE_MESSAGES,
            DEFAULT_PERMISSIONS.PIN_MESSAGES,
            DEFAULT_PERMISSIONS.EMBED_LINKS,
            DEFAULT_PERMISSIONS.ATTACH_FILES,
            DEFAULT_PERMISSIONS.VIEW_MEMBERS,
            DEFAULT_PERMISSIONS.MANAGE_MEMBERS
        ],
        position: 80,
        isDefault: false,
        canBeDeleted: true
    },
    {
        name: '@everyone',
        color: '#99aab5',
        permissions: [
            DEFAULT_PERMISSIONS.SEND_MESSAGES,
            DEFAULT_PERMISSIONS.EMBED_LINKS,
            DEFAULT_PERMISSIONS.ATTACH_FILES,
            DEFAULT_PERMISSIONS.VIEW_MEMBERS,
            DEFAULT_PERMISSIONS.ADD_FRIENDS
        ],
        position: 0,
        isDefault: true,
        canBeDeleted: false
    }
];

// サーバー設定
export const updateServerSettings = async (serverId, settings) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const serverRef = doc(db, 'servers', serverId);
    await updateDoc(serverRef, settings);
};

// ユーザー検索とメンバー招待
export const searchUserByEmail = async (email) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        // まずusersコレクションで検索（重複を排除）
        const q = query(
            collection(db, 'users'),
            where('email', '==', email.toLowerCase().trim())
        );
        const snapshot = await getDocs(q);

        // 重複を排除してユーザーを返す
        const uniqueUsers = {};
        snapshot.docs.forEach(doc => {
            const userData = doc.data();
            const emailKey = userData.email.toLowerCase().trim();
            if (!uniqueUsers[emailKey]) {
                uniqueUsers[emailKey] = {
                    id: doc.id,
                    ...userData
                };
            }
        });

        return Object.values(uniqueUsers);
    } catch (error) {
        console.error('ユーザー検索エラー:', error);
        return [];
    }
};

export const inviteUserToServer = async (serverId, userEmail, inviterName) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const users = await searchUserByEmail(userEmail);
    if (users.length === 0) {
        // ユーザーが見つからない場合は、メール招待として処理
        const inviteData = {
            serverId,
            userId: null, // 未登録ユーザー
            userEmail: userEmail,
            userName: null,
            inviterName,
            status: 'pending',
            type: 'email_invite', // メール招待フラグ
            createdAt: serverTimestamp()
        };
        return await addDoc(collection(db, 'serverInvites'), inviteData);
    }

    const user = users[0];

    // 既にサーバーのメンバーかチェック
    const memberQuery = query(
        collection(db, 'serverMembers'),
        where('serverId', '==', serverId),
        where('uid', '==', user.uid || user.id)
    );
    const memberSnapshot = await getDocs(memberQuery);
    if (!memberSnapshot.empty) {
        throw new Error('このユーザーは既にサーバーのメンバーです');
    }

    const inviteData = {
        serverId,
        userId: user.uid || user.id,
        userEmail: user.email,
        userName: user.displayName || user.email || `ユーザー${(user.uid || user.id).substring(0, 4)}`,
        inviterName,
        status: 'pending',
        type: 'user_invite',
        createdAt: serverTimestamp()
    };

    return await addDoc(collection(db, 'serverInvites'), inviteData);
};

// タグ別にユーザーを招待
export const inviteUsersByTag = async (serverId, tag, inviterName) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        // 指定されたタグを持つユーザーを検索
        const usersRef = collection(db, 'users');
        const q = query(
            usersRef,
            where('tags', 'array-contains', tag)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error(`タグ "${tag}" を持つユーザーが見つかりません`);
        }

        const invitePromises = [];
        querySnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            const userId = userDoc.id;

            // 既にサーバーのメンバーかチェック
            const memberQuery = query(
                collection(db, 'serverMembers'),
                where('serverId', '==', serverId),
                where('uid', '==', userId)
            );

            invitePromises.push(
                getDocs(memberQuery).then(memberSnapshot => {
                    if (memberSnapshot.empty) {
                        // メンバーでない場合は招待を作成
                        return addDoc(collection(db, 'serverInvites'), {
                            serverId,
                            userId: userId,
                            userEmail: userData.email,
                            userName: userData.displayName || userData.email || `ユーザー${userId.substring(0, 4)}`,
                            inviterName,
                            status: 'pending',
                            type: 'tag_invite',
                            tag: tag,
                            createdAt: serverTimestamp()
                        });
                    }
                    return null;
                })
            );
        });

        await Promise.all(invitePromises);
        console.log(`タグ "${tag}" のユーザーを招待しました`);
        return true;
    } catch (error) {
        console.error('タグ別招待エラー:', error);
        throw error;
    }
};

export const getServerInvites = (userId, callback) => {
    if (!isFirebaseReady()) {
        console.error('Firebase not initialized');
        return () => {};
    }

    const q = query(
        collection(db, 'serverInvites'),
        where('userId', '==', userId),
        where('status', '==', 'pending')
    );
    return onSnapshot(q, callback);
};

export const acceptServerInvite = async (inviteId, serverId, userId, userName) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    await addMemberToServer(serverId, userId, userName);
    await deleteDoc(doc(db, 'serverInvites', inviteId));
};

export const declineServerInvite = async (inviteId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    await deleteDoc(doc(db, 'serverInvites', inviteId));
};

// ユーザー情報の保存（初回ログイン時）
export const saveUserInfo = async (userId, userData) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const userRef = doc(db, 'users', userId);
    try {
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            // ドキュメントが存在する場合は更新
            await updateDoc(userRef, {
                ...userData,
                lastLogin: serverTimestamp()
            });
        } else {
            // ドキュメントが存在しない場合は新規作成
            await setDoc(userRef, {
                uid: userId,
                ...userData,
                tags: [], // タグフィールドを追加
                avatar: null,
                status: 'online',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });
        }
        console.log('ユーザー情報保存完了:', userId);
    } catch (error) {
        console.error('ユーザー情報保存エラー:', error);
        // エラーが発生した場合でも新規作成を試みる
        try {
            await setDoc(userRef, {
                uid: userId,
                ...userData,
                tags: [], // タグフィールドを追加
                avatar: null,
                status: 'online',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });
            console.log('ユーザー情報新規作成完了:', userId);
        } catch (innerError) {
            console.error('ユーザー情報新規作成エラー:', innerError);
            throw innerError;
        }
    }
};

// ユーザープロフィール更新
export const updateUserProfile = async (userId, profileData) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const userQuery = query(
        collection(db, 'users'),
        where('uid', '==', userId)
    );
    const snapshot = await getDocs(userQuery);
    if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await updateDoc(userDoc.ref, {
            ...profileData,
            updatedAt: serverTimestamp()
        });

        // ユーザー名が変更された場合、関連するDMチャンネルを更新
        if (profileData.displayName) {
            await updateDMChannelNames(userId, profileData.displayName);
        }
    }
};

// ユーザータグの更新
export const updateUserTags = async (userId, tags) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const userQuery = query(
        collection(db, 'users'),
        where('uid', '==', userId)
    );
    const snapshot = await getDocs(userQuery);
    if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await updateDoc(userDoc.ref, {
            tags: tags,
            updatedAt: serverTimestamp()
        });
    }
};

// タグでユーザーを検索
export const searchUsersByTag = async (tag) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        const usersRef = collection(db, 'users');
        const q = query(
            usersRef,
            where('tags', 'array-contains', tag)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('タグ別ユーザー検索エラー:', error);
        return [];
    }
};

// 全てのタグを取得
export const getAllTags = async () => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        const tagSet = new Set();
        querySnapshot.forEach(doc => {
            const tags = doc.data().tags || [];
            tags.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet);
    } catch (error) {
        console.error('タグ取得エラー:', error);
        return [];
    }
};

// ユーザーステータス更新
export const updateUserStatus = async (userId, status) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const userQuery = query(
        collection(db, 'users'),
        where('uid', '==', userId)
    );
    const snapshot = await getDocs(userQuery);
    if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await updateDoc(userDoc.ref, {
            status,
            lastSeen: serverTimestamp()
        });
    }
};

// オンラインユーザー取得
export const getOnlineUsers = (callback) => {
    if (!isFirebaseReady()) {
        console.error('Firebase not initialized');
        return () => {};
    }

    const q = query(
        collection(db, 'users'),
        where('status', '==', 'online')
    );
    return onSnapshot(q, callback);
};

// 画像アップロード関連
export const uploadImage = async (file, folder = 'images') => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    // ファイルをBase64に変換
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const imageData = {
                    data: reader.result,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    folder,
                    uploadedAt: serverTimestamp()
                };
                const imageRef = await addDoc(collection(db, 'images'), imageData);
                resolve({
                    id: imageRef.id,
                    url: reader.result,
                    name: file.name,
                    type: file.type
                });
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const getImage = async (imageId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const imageDoc = await getDoc(doc(db, 'images', imageId));
    if (imageDoc.exists()) {
        return { id: imageDoc.id, ...imageDoc.data() };
    }
    return null;
};

// ユーザーアバター更新
export const updateUserAvatar = async (userId, imageId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const userQuery = query(
        collection(db, 'users'),
        where('uid', '==', userId)
    );
    const snapshot = await getDocs(userQuery);
    if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        await updateDoc(userDoc.ref, { avatar: imageId });
    }
};

// サーバーアイコン更新
export const updateServerIcon = async (serverId, imageId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const serverRef = doc(db, 'servers', serverId);
    await updateDoc(serverRef, { icon: imageId });
};

// サーバー削除
export const deleteServer = async (serverId, userId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    // サーバーの所有者チェック
    const serverDoc = await getDoc(doc(db, 'servers', serverId));
    if (!serverDoc.exists()) {
        throw new Error('サーバーが見つかりません');
    }
    const serverData = serverDoc.data();
    if (serverData.ownerId !== userId) {
        throw new Error('サーバーを削除する権限がありません');
    }

    // サーバーに関連するデータを削除
    // 1. チャンネル削除
    const channelsQuery = query(
        collection(db, 'channels'),
        where('serverId', '==', serverId)
    );
    const channelsSnapshot = await getDocs(channelsQuery);
    for (const channelDoc of channelsSnapshot.docs) {
        await deleteDoc(channelDoc.ref);
        // チャンネルのメッセージも削除
        const messagesQuery = query(
            collection(db, 'messages'),
            where('channelId', '==', channelDoc.id)
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        for (const messageDoc of messagesSnapshot.docs) {
            await deleteDoc(messageDoc.ref);
        }
    }

    // 2. サーバーメンバー削除
    const membersQuery = query(
        collection(db, 'serverMembers'),
        where('serverId', '==', serverId)
    );
    const membersSnapshot = await getDocs(membersQuery);
    for (const memberDoc of membersSnapshot.docs) {
        await deleteDoc(memberDoc.ref);
    }

    // 3. サーバーロール削除
    const rolesQuery = query(
        collection(db, 'serverRoles'),
        where('serverId', '==', serverId)
    );
    const rolesSnapshot = await getDocs(rolesQuery);
    for (const roleDoc of rolesSnapshot.docs) {
        await deleteDoc(roleDoc.ref);
    }

    // 4. サーバー招待削除
    const invitesQuery = query(
        collection(db, 'serverInvites'),
        where('serverId', '==', serverId)
    );
    const invitesSnapshot = await getDocs(invitesQuery);
    for (const inviteDoc of invitesSnapshot.docs) {
        await deleteDoc(inviteDoc.ref);
    }

    // 5. サーバー削除
    await deleteDoc(doc(db, 'servers', serverId));
};

// メッセージに画像添付
export const sendMessageWithImage = async (channelId, userId, userName, content, imageId, replyTo = null) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const messageData = {
        channelId,
        userId,
        userName,
        content,
        timestamp: serverTimestamp(),
        reactions: {},
        edited: false,
        replyTo,
        attachments: imageId ? [{ type: 'image', id: imageId }] : []
    };
    return await addDoc(collection(db, 'messages'), messageData);
};

export const getServerRoles = (serverId, callback) => {
    if (!isFirebaseReady()) {
        console.error('Firebase not initialized');
        return () => {};
    }

    const q = query(
        collection(db, 'serverRoles'),
        where('serverId', '==', serverId),
        orderBy('position', 'asc')
    );
    return onSnapshot(q, callback);
};

export const createServerRole = async (serverId, roleData) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const role = {
        serverId,
        ...roleData,
        createdAt: serverTimestamp()
    };
    return await addDoc(collection(db, 'serverRoles'), role);
};

export const updateServerRole = async (roleId, roleData) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    const roleRef = doc(db, 'serverRoles', roleId);
    await updateDoc(roleRef, roleData);
};

export const deleteServerRole = async (roleId) => {
    if (!isFirebaseReady()) {
        throw new Error('Firebaseが初期化されていません');
    }

    await deleteDoc(doc(db, 'serverRoles', roleId));
};