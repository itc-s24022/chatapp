
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
export const createServer = async (name, ownerId, ownerName) => {
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
        where('serverId', '==', serverId)
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
        where('channelId', '==', channelId)
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
export const sendFriendRequest = async (fromUserId, fromUserName, toUserId, toUserName) => {
    const requestData = {
        fromUserId,
        fromUserName,
        toUserId,
        toUserName,
        status: 'pending',
        createdAt: serverTimestamp()
    };
    
    return await addDoc(collection(db, 'friendRequests'), requestData);
};

export const getFriendRequests = (userId, callback) => {
    const q = query(
        collection(db, 'friendRequests'),
        where('toUserId', '==', userId),
        where('status', '==', 'pending')
    );
    
    return onSnapshot(q, callback);
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

export const declineFriendRequest = async (requestId) => {
    await deleteDoc(doc(db, 'friendRequests', requestId));
};

export const createDMChannel = async (user1Id, user2Id) => {
    // 既存のDMチャンネルがあるかチェック
    const existingQuery = query(
        collection(db, 'dmChannels'),
        where('members', 'array-contains', user1Id)
    );
    
    const existingDMs = await getDocs(existingQuery);
    const existingDM = existingDMs.docs.find(doc => 
        doc.data().members.includes(user2Id)
    );
    
    if (existingDM) {
        return existingDM.ref;
    }
    
    const dmData = {
        type: 'dm',
        members: [user1Id, user2Id],
        createdAt: serverTimestamp(),
        lastMessage: null,
        lastMessageTime: null
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

// サーバーメンバー管理
export const getServerMembers = (serverId, callback) => {
    const q = query(
        collection(db, 'serverMembers'),
        where('serverId', '==', serverId)
    );
    
    return onSnapshot(q, callback);
};

export const addMemberToServer = async (serverId, userId, userName, roles = []) => {
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
    const serverRef = doc(db, 'servers', serverId);
    await updateDoc(serverRef, settings);
};

// ユーザー検索とメンバー招待
export const searchUserByEmail = async (email) => {
    try {
        // まずusersコレクションで検索
        const q = query(
            collection(db, 'users'),
            where('email', '==', email)
        );
        
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        if (users.length > 0) {
            return users;
        }
        
        // usersコレクションにない場合は、Firebase Authから検索
        // 実際の実装では、サーバーサイドでAdmin SDKを使用する必要があります
        // ここでは仮のユーザーデータを返すか、エラーハンドリングを改善
        return [];
    } catch (error) {
        console.error('ユーザー検索エラー:', error);
        return [];
    }
};

export const inviteUserToServer = async (serverId, userEmail, inviterName) => {
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
        userName: user.displayName || '匿名',
        inviterName,
        status: 'pending',
        type: 'user_invite',
        createdAt: serverTimestamp()
    };
    
    return await addDoc(collection(db, 'serverInvites'), inviteData);
};

export const getServerInvites = (userId, callback) => {
    const q = query(
        collection(db, 'serverInvites'),
        where('userId', '==', userId),
        where('status', '==', 'pending')
    );
    
    return onSnapshot(q, callback);
};

export const acceptServerInvite = async (inviteId, serverId, userId, userName) => {
    await addMemberToServer(serverId, userId, userName);
    await deleteDoc(doc(db, 'serverInvites', inviteId));
};

export const declineServerInvite = async (inviteId) => {
    await deleteDoc(doc(db, 'serverInvites', inviteId));
};

// ユーザー情報の保存（初回ログイン時）
export const saveUserInfo = async (userId, userData) => {
    const userRef = doc(db, 'users', userId);
    try {
        await updateDoc(userRef, {
            ...userData,
            lastLogin: serverTimestamp()
        });
    } catch (error) {
        // ドキュメントが存在しない場合は新規作成
        await addDoc(collection(db, 'users'), {
            uid: userId,
            ...userData,
            avatar: null,
            status: 'online',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        });
    }
};

// ユーザープロフィール更新
export const updateUserProfile = async (userId, profileData) => {
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
    }
};

// ユーザーステータス更新
export const updateUserStatus = async (userId, status) => {
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
    const q = query(
        collection(db, 'users'),
        where('status', '==', 'online')
    );
    
    return onSnapshot(q, callback);
};

// 画像アップロード関連
export const uploadImage = async (file, folder = 'images') => {
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
    const imageDoc = await getDoc(doc(db, 'images', imageId));
    if (imageDoc.exists()) {
        return { id: imageDoc.id, ...imageDoc.data() };
    }
    return null;
};

// ユーザーアバター更新
export const updateUserAvatar = async (userId, imageId) => {
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
    const serverRef = doc(db, 'servers', serverId);
    await updateDoc(serverRef, { icon: imageId });
};

// メッセージに画像添付
export const sendMessageWithImage = async (channelId, userId, userName, content, imageId, replyTo = null) => {
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
    const q = query(
        collection(db, 'serverRoles'),
        where('serverId', '==', serverId),
        orderBy('position', 'asc')
    );
    
    return onSnapshot(q, callback);
};

export const createServerRole = async (serverId, roleData) => {
    const role = {
        serverId,
        ...roleData,
        createdAt: serverTimestamp()
    };
    
    return await addDoc(collection(db, 'serverRoles'), role);
};

export const updateServerRole = async (roleId, roleData) => {
    const roleRef = doc(db, 'serverRoles', roleId);
    await updateDoc(roleRef, roleData);
};

export const deleteServerRole = async (roleId) => {
    await deleteDoc(doc(db, 'serverRoles', roleId));
};
