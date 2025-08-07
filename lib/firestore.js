import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "./firebase";

// サーバー関連の関数
export const createServer = async (name, ownerId, ownerName) => {
    try {
        const serverRef = collection(db, 'servers');
        const newServer = {
            name,
            ownerId,
            ownerName,
            createdAt: serverTimestamp(),
            members: [ownerId],
            icon: null
        };
        const docRef = await addDoc(serverRef, newServer);
        return docRef.id;
    } catch (error) {
        console.error("サーバー作成エラー:", error);
        throw error;
    }
};

export const getUserServers = (userId, callback, errorCallback) => {
    try {
        const serversRef = collection(db, 'servers');
        const q = query(serversRef, where('members', 'array-contains', userId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            callback(snapshot);
        }, (error) => {
            console.error("サーバー取得エラー:", error);
            if (errorCallback) errorCallback(error);
        });
        return unsubscribe;
    } catch (error) {
        console.error("サーバー取得クエリエラー:", error);
        if (errorCallback) errorCallback(error);
        return () => {};
    }
};

export const deleteServer = async (serverId, userId) => {
    try {
        const serverRef = doc(db, 'servers', serverId);
        const serverDoc = await getDoc(serverRef);

        if (!serverDoc.exists()) {
            throw new Error("サーバーが存在しません");
        }

        const serverData = serverDoc.data();
        if (serverData.ownerId !== userId) {
            throw new Error("サーバーを削除する権限がありません");
        }

        await deleteDoc(serverRef);
        return true;
    } catch (error) {
        console.error("サーバー削除エラー:", error);
        throw error;
    }
};

export const updateServerIcon = async (serverId, imageId) => {
    try {
        const serverRef = doc(db, 'servers', serverId);
        await updateDoc(serverRef, {
            icon: imageId
        });
        return true;
    } catch (error) {
        console.error("アイコン更新エラー:", error);
        throw error;
    }
};

// チャンネル関連の関数
export const createChannel = async (name, type, serverId, creatorId) => {
    try {
        const channelsRef = collection(db, 'channels');
        const newChannel = {
            name,
            type,
            serverId,
            creatorId,
            createdAt: serverTimestamp()
        };
        const docRef = await addDoc(channelsRef, newChannel);
        return docRef.id;
    } catch (error) {
        console.error("チャンネル作成エラー:", error);
        throw error;
    }
};

export const getServerChannels = (serverId, callback) => {
    try {
        const channelsRef = collection(db, 'channels');
        const q = query(channelsRef, where('serverId', '==', serverId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            callback(snapshot);
        }, (error) => {
            console.error("チャンネル取得エラー:", error);
        });
        return unsubscribe;
    } catch (error) {
        console.error("チャンネル取得クエリエラー:", error);
        return () => {};
    }
};

// メッセージ関連の関数
export const sendMessage = async (channelId, userId, userName, content, replyToId) => {
    try {
        const messagesRef = collection(db, 'messages');
        const newMessage = {
            channelId,
            userId,
            userName,
            content,
            timestamp: serverTimestamp(),
            replyTo: replyToId || null
        };
        const docRef = await addDoc(messagesRef, newMessage);
        return docRef.id;
    } catch (error) {
        console.error("メッセージ送信エラー:", error);
        throw error;
    }
};

export const sendMessageWithImage = async (channelId, userId, userName, content, imageId, replyToId) => {
    try {
        const messagesRef = collection(db, 'messages');
        const newMessage = {
            channelId,
            userId,
            userName,
            content,
            attachments: [{
                id: imageId,
                type: 'image'
            }],
            timestamp: serverTimestamp(),
            replyTo: replyToId || null
        };
        const docRef = await addDoc(messagesRef, newMessage);
        return docRef.id;
    } catch (error) {
        console.error("画像付きメッセージ送信エラー:", error);
        throw error;
    }
};

export const getChannelMessages = (channelId, callback) => {
    try {
        const messagesRef = collection(db, 'messages');
        const q = query(messagesRef, where('channelId', '==', channelId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            callback(snapshot);
        }, (error) => {
            console.error("メッセージ取得エラー:", error);
        });
        return unsubscribe;
    } catch (error) {
        console.error("メッセージ取得クエリエラー:", error);
        return () => {};
    }
};

export const editMessage = async (messageId, newContent) => {
    try {
        const messageRef = doc(db, 'messages', messageId);
        await updateDoc(messageRef, {
            content: newContent,
            edited: true
        });
        return true;
    } catch (error) {
        console.error("メッセージ編集エラー:", error);
        throw error;
    }
};

export const deleteMessage = async (messageId) => {
    try {
        const messageRef = doc(db, 'messages', messageId);
        await deleteDoc(messageRef);
        return true;
    } catch (error) {
        console.error("メッセージ削除エラー:", error);
        throw error;
    }
};

// リアクション関連の関数
export const addReaction = async (messageId, userId, emoji) => {
    try {
        const messageRef = doc(db, 'messages', messageId);
        const messageDoc = await getDoc(messageRef);

        if (!messageDoc.exists()) {
            throw new Error("メッセージが存在しません");
        }

        const messageData = messageDoc.data();
        const reactions = messageData.reactions || {};

        if (!reactions[emoji]) {
            reactions[emoji] = [];
        }

        if (!reactions[emoji].includes(userId)) {
            reactions[emoji] = [...reactions[emoji], userId];
            await updateDoc(messageRef, { reactions });
        }

        return true;
    } catch (error) {
        console.error("リアクション追加エラー:", error);
        throw error;
    }
};

export const removeReaction = async (messageId, userId, emoji) => {
    try {
        const messageRef = doc(db, 'messages', messageId);
        const messageDoc = await getDoc(messageRef);

        if (!messageDoc.exists()) {
            throw new Error("メッセージが存在しません");
        }

        const messageData = messageDoc.data();
        const reactions = messageData.reactions || {};

        if (reactions[emoji] && reactions[emoji].includes(userId)) {
            reactions[emoji] = reactions[emoji].filter(id => id !== userId);
            if (reactions[emoji].length === 0) {
                delete reactions[emoji];
            }
            await updateDoc(messageRef, { reactions });
        }

        return true;
    } catch (error) {
        console.error("リアクション削除エラー:", error);
        throw error;
    }
};

// DM関連の関数
export const getUserDMs = (userId, callback, errorCallback) => {
    try {
        const channelsRef = collection(db, 'channels');
        const q = query(channelsRef,
            where('type', '==', 'dm'),
            where('participants', 'array-contains', userId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            callback(snapshot);
        }, (error) => {
            console.error("DM取得エラー:", error);
            if (errorCallback) errorCallback(error);
        });

        return unsubscribe;
    } catch (error) {
        console.error("DM取得クエリエラー:", error);
        if (errorCallback) errorCallback(error);
        return () => {};
    }
};

export const sendDMMessage = async (channelId, userId, userName, content, replyToId) => {
    try {
        const messagesRef = collection(db, 'messages');
        const newMessage = {
            channelId,
            userId,
            userName,
            content,
            timestamp: serverTimestamp(),
            replyTo: replyToId || null
        };
        const docRef = await addDoc(messagesRef, newMessage);
        return docRef.id;
    } catch (error) {
        console.error("DM送信エラー:", error);
        throw error;
    }
};

// 招待関連の関数
export const inviteUserToServer = async (serverId, email, inviterName) => {
    try {
        const invitesRef = collection(db, 'invites');
        const newInvite = {
            serverId,
            email,
            inviterName,
            status: 'pending',
            createdAt: serverTimestamp()
        };
        const docRef = await addDoc(invitesRef, newInvite);
        return docRef.id;
    } catch (error) {
        console.error("招待作成エラー:", error);
        throw error;
    }
};

// ユーザー情報関連の関数
export const saveUserInfo = async (userId, userInfo) => {
    try {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            await updateDoc(userRef, {
                ...userInfo,
                updatedAt: serverTimestamp()
            });
        } else {
            await setDoc(userRef, {
                ...userInfo,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }

        return true;
    } catch (error) {
        console.error("ユーザー情報保存エラー:", error);
        throw error;
    }
};

// 権限関連の関数
export const getMemberPermissions = async (serverId, userId) => {
    try {
        const serverRef = doc(db, 'servers', serverId);
        const serverDoc = await getDoc(serverRef);

        if (!serverDoc.exists()) {
            throw new Error("サーバーが存在しません");
        }

        const serverData = serverDoc.data();

        // オーナーは全権限を持つ
        if (serverData.ownerId === userId) {
            return Object.values(DEFAULT_PERMISSIONS);
        }

        // メンバーの権限を取得（ここではデフォルト権限を返す）
        // 実際の実装ではロールシステムから権限を取得する
        return [
            DEFAULT_PERMISSIONS.VIEW_CHANNELS,
            DEFAULT_PERMISSIONS.SEND_MESSAGES,
            DEFAULT_PERMISSIONS.READ_MESSAGE_HISTORY
        ];
    } catch (error) {
        console.error("権限取得エラー:", error);
        throw error;
    }
};

export const hasPermission = (permissions, permission) => {
    return permissions.includes(permission);
};

export const DEFAULT_PERMISSIONS = {
    VIEW_CHANNELS: 'view_channels',
    SEND_MESSAGES: 'send_messages',
    READ_MESSAGE_HISTORY: 'read_message_history',
    ATTACH_FILES: 'attach_files',
    MANAGE_CHANNELS: 'manage_channels',
    MANAGE_ROLES: 'manage_roles',
    MANAGE_MEMBERS: 'manage_members'
};

// 画像関連の関数
export const getImage = async (imageId) => {
    try {
        const imageRef = doc(db, 'images', imageId);
        const imageDoc = await getDoc(imageRef);

        if (!imageDoc.exists()) {
            throw new Error("画像が存在しません");
        }

        return {
            id: imageDoc.id,
            ...imageDoc.data()
        };
    } catch (error) {
        console.error("画像取得エラー:", error);
        throw error;
    }
};