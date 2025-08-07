import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/router";
import ErrorBoundary from '../components/ErrorBoundary';
import {
    createServer,
    getUserServers,
    createChannel,
    getServerChannels,
    sendMessage,
    sendMessageWithImage,
    getChannelMessages,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    getUserDMs,
    // createDMChannel,  // 未使用のためコメントアウト
    sendDMMessage,
    // sendFriendRequest,  // 未使用のためコメントアウト
    // getServerMembers,  // 未使用のためコメントアウト
    // addMemberToServer,  // 未使用のためコメントアウト
    inviteUserToServer,
    saveUserInfo,
    getMemberPermissions,
    hasPermission,
    DEFAULT_PERMISSIONS,
    getImage,
    deleteServer,
    updateServerIcon,
    // updateUserTags,  // 未使用のためコメントアウト
    // searchUsersByTag,  // 未使用のためコメントアウト
    // inviteUsersByTag,  // 未使用のためコメントアウト
    // getAllTags  // 未使用のためコメントアウト
} from "../lib/firestore";
import ServerSidebar from "../components/ServerSidebar";
import ChannelSidebar from "../components/ChannelSidebar";
import FriendsList from "../components/FriendsList";
import MemberList from "../components/MemberList";
import ServerInvites from "../components/ServerInvites";
import RoleManager from "../components/RoleManager";
import ImageUploader from "../components/ImageUploader";
import VoiceChannel from "../components/VoiceChannel";
import TagManager from "../components/TagManager";
import Image from 'next/image';

export default function ChatPage() {
    const [user, setUser] = useState(null);
    const [servers, setServers] = useState([]);
    const [currentServer, setCurrentServer] = useState(null);
    const [channels, setChannels] = useState([]);
    const [currentChannel, setCurrentChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [editingMessage, setEditingMessage] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    // const [dmChannels, setDmChannels] = useState([]);  // 未使用のためコメントアウト
    const [showMemberList, setShowMemberList] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showRoleManager, setShowRoleManager] = useState(false);
    const [showImageUploader, setShowImageUploader] = useState(false);
    const [showTagManager, setShowTagManager] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [userPermissions, setUserPermissions] = useState([]);
    const [imageAttachment, setImageAttachment] = useState(null);
    const [hoveredMessage, setHoveredMessage] = useState(null);
    const [isVoiceChannelActive, setIsVoiceChannelActive] = useState(false);
    const [voiceParticipants, setVoiceParticipants] = useState([]);
    const [speakingUsers, setSpeakingUsers] = useState(new Set());
    const [isMuted, setIsMuted] = useState(false);
    const [isDMMode, setIsDMMode] = useState(false);
    const messagesEndRef = useRef(null);
    const router = useRouter();

    // 認証状態チェック
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                console.log('ユーザー認証成功:', currentUser.uid, currentUser.email);
                setUser(currentUser);
                try {
                    await saveUserInfo(currentUser.uid, {
                        displayName: currentUser.displayName || '匿名',
                        email: currentUser.email,
                        photoURL: currentUser.photoURL
                    });
                    console.log('ユーザー情報保存完了');
                } catch (error) {
                    console.error('ユーザー情報保存エラー:', error);
                }
            } else {
                console.log('ユーザー未認証 - ログインページへリダイレクト');
                router.push("/login");
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    // ユーザーのサーバー取得 useEffect
    useEffect(() => {
        if (!user) return;
        console.log('サーバー取得開始 - ユーザーID:', user.uid);
        const unsubscribe = getUserServers(user.uid, (snapshot) => {
            console.log('サーバー取得結果:', snapshot.docs.length, '件');
            const serverList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setServers(serverList);
            console.log('設定されたサーバーリスト:', serverList);

            // 初期選択：DMモードを優先
            if (serverList.length === 0) {
                console.log('サーバーが見つかりませんでした - DMモードに切り替え');
                setIsDMMode(true);
                setCurrentServer({ id: 'dm', name: 'ダイレクトメッセージ' });
            } else if (!currentServer) {
                console.log('最初のサーバーを選択:', serverList[0]);
                setCurrentServer(serverList[0]);
                setIsDMMode(false);
            }
        }, (error) => {
            console.error('サーバー取得エラー:', error);
        });
        return () => unsubscribe();
    }, [user, currentServer]); // currentServerを依存配列に追加

    // DM取得
    useEffect(() => {
        if (!user) return;
        const unsubscribe = getUserDMs(user.uid, (snapshot) => {
            const dmList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // setDmChannels(dmList);  // 未使用のためコメントアウト
            console.log('DM一覧取得:', dmList);
        });
        return () => unsubscribe();
    }, [user]);

    // サーバーのチャンネル取得
    useEffect(() => {
        if (!currentServer || currentServer.id === 'dm') {
            setChannels([]);
            return;
        }
        const unsubscribe = getServerChannels(currentServer.id, (snapshot) => {
            const channelList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setChannels(channelList);
            if (channelList.length > 0 && !currentChannel) {
                setCurrentChannel(channelList[0]);
            }
        });
        return () => unsubscribe();
    }, [currentServer]);

    // チャンネルのメッセージ取得
    useEffect(() => {
        if (!currentChannel) return;
        const unsubscribe = getChannelMessages(currentChannel.id, (snapshot) => {
            const messageList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => {
                // timestampが存在しない場合の処理
                if (!a.timestamp || !b.timestamp) return 0;
                const timeA = a.timestamp.seconds || 0;
                const timeB = b.timestamp.seconds || 0;
                return timeA - timeB;
            });
            setMessages(messageList);
            scrollToBottom();
        });
        return () => unsubscribe();
    }, [currentChannel]);

    // ユーザー権限取得
    useEffect(() => {
        if (!user || !currentServer || currentServer.id === 'dm') {
            setUserPermissions([]);
            return;
        }
        const fetchPermissions = async () => {
            try {
                const permissions = await getMemberPermissions(currentServer.id, user.uid);
                setUserPermissions(permissions);
            } catch (error) {
                console.error('権限取得エラー:', error);
                setUserPermissions([]);
            }
        };
        fetchPermissions();
    }, [user, currentServer]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // DM関連のヘルパー関数
    const getOtherParticipant = (dmChannel) => {
        if (!dmChannel || dmChannel.type !== 'dm') return null;
        return dmChannel.participants.find(p => p !== user.uid);
    };

    const getOtherParticipantName = (dmChannel) => {
        if (!dmChannel || dmChannel.type !== 'dm') return '';
        const otherParticipantId = getOtherParticipant(dmChannel);
        return dmChannel.participantNames?.[otherParticipantId] || '不明なユーザー';
    };

    const handleServerSelect = (serverId) => {
        console.log('サーバー選択:', serverId);
        // 現在のボイスチャンネルを非アクティブにする
        if (currentChannel && currentChannel.type === 'voice') {
            console.log('サーバー変更時のボイスチャンネル非アクティブ化');
            setIsVoiceChannelActive(false);
        }

        if (serverId === 'dm') {
            setCurrentServer({ id: 'dm', name: 'ダイレクトメッセージ' });
            setChannels([]);
            setCurrentChannel(null);
            setMessages([]);
            setIsDMMode(true);
        } else {
            const server = servers.find(s => s.id === serverId);
            if (server) {
                setCurrentServer(server);
                setCurrentChannel(null);
                setMessages([]);
                setIsDMMode(false);
            } else {
                console.error('サーバーが見つかりません:', serverId);
            }
        }
    };

    // DMチャンネル選択ハンドラ
    const handleDMChannelSelect = (dmChannel) => {
        console.log('DMチャンネル選択:', dmChannel);
        setCurrentChannel(dmChannel);
        setCurrentServer({ id: 'dm', name: 'ダイレクトメッセージ' });
        setIsDMMode(true);
    };

    const handleSendMessage = async () => {
        if ((!input.trim() && !imageAttachment) || !user || !currentChannel) return;
        // サーバーチャンネルの場合は送信権限チェック
        if (currentServer?.id !== 'dm' && !hasPermission(userPermissions, DEFAULT_PERMISSIONS.SEND_MESSAGES)) {
            alert('メッセージを送信する権限がありません');
            return;
        }
        try {
            if (editingMessage) {
                await editMessage(editingMessage.id, input.trim());
                setEditingMessage(null);
            } else {
                // DMの場合とサーバーチャンネルの場合で処理を分岐
                if (currentChannel.type === 'dm') {
                    // DM送信
                    if (imageAttachment) {
                        await sendMessageWithImage(
                            currentChannel.id,
                            user.uid,
                            user.displayName || "匿名",
                            input.trim(),
                            imageAttachment.id,
                            replyingTo?.id
                        );
                    } else {
                        await sendDMMessage(
                            currentChannel.id,
                            user.uid,
                            user.displayName || "匿名",
                            input.trim(),
                            replyingTo?.id
                        );
                    }
                } else {
                    // サーバーチャンネル送信
                    if (imageAttachment) {
                        await sendMessageWithImage(
                            currentChannel.id,
                            user.uid,
                            user.displayName || "匿名",
                            input.trim(),
                            imageAttachment.id,
                            replyingTo?.id
                        );
                    } else {
                        await sendMessage(
                            currentChannel.id,
                            user.uid,
                            user.displayName || "匿名",
                            input.trim(),
                            replyingTo?.id
                        );
                    }
                }
                setReplyingTo(null);
            }
            setInput("");
            setImageAttachment(null);
        } catch (error) {
            console.error('メッセージ送信エラー:', error);
            alert('メッセージの送信に失敗しました');
        }
    };

    const handleImageUpload = (uploadedImage) => {
        setImageAttachment(uploadedImage);
        setShowImageUploader(false);
    };

    const handleServerCreate = async (serverName) => {
        if (!user) return;
        try {
            await createServer(serverName, user.uid, user.displayName || "匿名");
        } catch (error) {
            console.error('サーバー作成エラー:', error);
            alert('サーバーの作成に失敗しました');
        }
    };

    const handleChannelCreate = async (channelData) => {
        if (!user || !currentServer || currentServer.id === 'dm') return;
        try {
            await createChannel(channelData.name, channelData.type, currentServer.id, user.uid);
        } catch (error) {
            console.error('チャンネル作成エラー:', error);
            alert('チャンネルの作成に失敗しました');
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            router.push("/login");
        } catch (error) {
            console.error('ログアウトエラー:', error);
        }
    };

    const handleReaction = async (messageId, emoji) => {
        if (!user) return;
        try {
            const message = messages.find(m => m.id === messageId);
            const userReacted = message.reactions?.[emoji]?.includes(user.uid);
            if (userReacted) {
                await removeReaction(messageId, user.uid, emoji);
            } else {
                await addReaction(messageId, user.uid, emoji);
            }
        } catch (error) {
            console.error('リアクションエラー:', error);
        }
    };

    const handleInviteUser = async () => {
        if (!inviteEmail.trim() || !currentServer || currentServer.id === 'dm') return;
        try {
            await inviteUserToServer(currentServer.id, inviteEmail.trim(), user.displayName || '匿名');
            setInviteEmail("");
            setShowInviteModal(false);
            alert('招待を送信しました');
        } catch (error) {
            console.error('招待エラー:', error);
            alert('招待に失敗しました: ' + error.message);
        }
    };

    const handleServerDelete = async (serverId) => {
        try {
            await deleteServer(serverId, user.uid);
            // 削除されたサーバーが現在選択されている場合、DMに切り替え
            if (currentServer?.id === serverId) {
                handleServerSelect('dm');
            }
        } catch (error) {
            console.error('サーバー削除エラー:', error);
            alert('サーバー削除に失敗しました: ' + error.message);
        }
    };

    const handleServerIconUpdate = async (serverId, imageId) => {
        try {
            await updateServerIcon(serverId, imageId);
        } catch (error) {
            console.error('アイコン更新エラー:', error);
            alert('アイコン更新に失敗しました');
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === today.toDateString()) {
            return "今日";
        } else if (date.toDateString() === yesterday.toDateString()) {
            return "昨日";
        } else {
            return date.toLocaleDateString();
        }
    };

    return (
        <ErrorBoundary>
            <div style={{
                display: 'flex',
                height: '100vh',
                backgroundColor: '#36393f',
                color: '#dcddde',
                fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
            }}>
                {/* サーバーサイドバー */}
                <ServerSidebar
                    servers={servers}
                    currentServer={currentServer?.id}
                    onServerSelect={handleServerSelect}
                    onCreateServer={handleServerCreate}
                    onDeleteServer={handleServerDelete}
                    onUpdateServerIcon={handleServerIconUpdate}
                    currentUser={user}
                />
                {/* チャンネルサイドバー / フレンドリスト */}
                {isDMMode || currentServer?.id === 'dm' ? (
                    <FriendsList
                        user={user}
                        onDMChannelSelect={handleDMChannelSelect}
                        currentChannel={currentChannel}
                    />
                ) : currentServer ? (
                    <ChannelSidebar
                        server={currentServer}
                        channels={channels}
                        currentChannel={currentChannel?.id}
                        onChannelSelect={(channelId) => {
                            const channel = channels.find(c => c.id === channelId);
                            console.log('チャンネル選択:', channel?.name, channel?.type);
                            // 現在のチャンネルがボイスチャンネルの場合、非アクティブにする
                            if (currentChannel && currentChannel.type === 'voice') {
                                console.log('現在のボイスチャンネルを非アクティブ化');
                                setIsVoiceChannelActive(false);
                            }
                            setCurrentChannel(channel);
                            // 新しいチャンネルがボイスチャンネルの場合は自動的にアクティブにする
                            if (channel && channel.type === 'voice') {
                                console.log('新しいボイスチャンネルをアクティブ化');
                                setIsVoiceChannelActive(true);
                            }
                        }}
                        onCreateChannel={handleChannelCreate}
                        user={user}
                        voiceParticipants={voiceParticipants}
                        speakingUsers={speakingUsers}
                        isMuted={isMuted}
                    />
                ) : null}
                {/* メインチャットエリア */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    {/* ヘッダー */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 20px',
                        backgroundColor: '#2f3136',
                        borderBottom: '1px solid #202225'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <h2 style={{
                                margin: 0,
                                fontSize: 18,
                                fontWeight: 600,
                                color: '#ffffff'
                            }}>
                                {currentChannel ?
                                    (currentChannel.type === 'dm' ?
                                            `💬 ${getOtherParticipantName(currentChannel)}` :
                                            currentChannel.type === 'voice' ?
                                                `🔊 ${currentChannel.name || 'ボイスチャンネル'}` :
                                                `# ${currentChannel.name || 'チャンネル'}`
                                    ) :
                                    isDMMode ? 'フレンドを選択してください' : 'チャンネルを選択してください'
                                }
                            </h2>
                            {/* currentServerのチェックを追加 */}
                            {currentServer && currentServer.id !== 'dm' && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setShowMemberList(true)}
                                        style={{
                                            backgroundColor: '#40444b',
                                            color: '#dcddde',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '6px 12px',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        👥 メンバー
                                    </button>
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        style={{
                                            backgroundColor: '#40444b',
                                            color: '#dcddde',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '6px 12px',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        ➕ 招待
                                    </button>
                                    {hasPermission(userPermissions, DEFAULT_PERMISSIONS.MANAGE_ROLES) && (
                                        <button
                                            onClick={() => setShowRoleManager(true)}
                                            style={{
                                                backgroundColor: '#40444b',
                                                color: '#dcddde',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '6px 12px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            🎭 ロール
                                        </button>
                                    )}
                                    {hasPermission(userPermissions, DEFAULT_PERMISSIONS.MANAGE_MEMBERS) && (
                                        <button
                                            onClick={() => setShowTagManager(true)}
                                            style={{
                                                backgroundColor: '#40444b',
                                                color: '#dcddde',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '6px 12px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            🏷️ タグ
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        {user && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button
                                    onClick={() => router.push("/mypage")}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#b9bbbe',
                                        cursor: 'pointer',
                                        padding: '8px',
                                        borderRadius: '4px'
                                    }}
                                >
                                    👤 {user.displayName || "匿名"}
                                </button>
                                <button
                                    onClick={handleSignOut}
                                    style={{
                                        backgroundColor: '#5865f2',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ログアウト
                                </button>
                            </div>
                        )}
                    </div>
                    {/* メッセージエリア */}
                    {currentChannel ? (
                        currentChannel.type === 'voice' ? (
                            // ボイスチャンネル用のUI
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'column',
                                backgroundColor: '#36393f',
                                gap: '20px'
                            }}>
                                <div style={{
                                    fontSize: '64px',
                                    marginBottom: '20px'
                                }}>
                                    🔊
                                </div>
                                <h2 style={{
                                    color: '#ffffff',
                                    fontSize: '32px',
                                    fontWeight: '600',
                                    margin: '0 0 16px 0'
                                }}>
                                    {currentChannel.name || 'ボイスチャンネル'}
                                </h2>
                                <p style={{
                                    color: '#b9bbbe',
                                    fontSize: '16px',
                                    margin: '0 0 32px 0',
                                    textAlign: 'center'
                                }}>
                                    ボイスチャンネルに接続されています
                                </p>
                                {voiceParticipants.length > 0 && (
                                    <div style={{
                                        display: 'flex',
                                        gap: '16px',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center'
                                    }}>
                                        {voiceParticipants.map(participant => (
                                            <div key={participant.id} style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <div style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    borderRadius: '50%',
                                                    backgroundColor: speakingUsers.has(participant.id) ? '#43b581' : '#5865f2',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '32px',
                                                    fontWeight: '600',
                                                    border: speakingUsers.has(participant.id) ? '4px solid #43b581' : '4px solid transparent',
                                                    transition: 'all 0.2s ease'
                                                }}>
                                                    {participant.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{
                                                    color: '#ffffff',
                                                    fontSize: '14px',
                                                    fontWeight: '600'
                                                }}>
                                                    {participant.name}
                                                </span>
                                                {participant.muted && (
                                                    <span style={{ fontSize: '12px' }}>🔇</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // テキストチャンネル・DM用のメッセージエリア
                            <>
                                <div style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: '20px'
                                }}>
                                    {messages.map((msg, index) => {
                                        const prevMsg = messages[index - 1];
                                        const showDate = !prevMsg || formatDate(msg.timestamp) !== formatDate(prevMsg.timestamp);
                                        // 自分のメッセージかどうか判定
                                        const isMyMessage = msg.userId === user.uid;
                                        // DM用のレイアウトかサーバー用のレイアウトかを判定
                                        const isDMLayout = currentChannel?.type === 'dm';
                                        // 連続メッセージかチェック（同じユーザーが5分以内に投稿）
                                        const isConsecutive = prevMsg &&
                                            prevMsg.userId === msg.userId &&
                                            msg.timestamp && prevMsg.timestamp &&
                                            msg.timestamp.toDate && prevMsg.timestamp.toDate &&
                                            (msg.timestamp.toDate() - prevMsg.timestamp.toDate()) < 5 * 60 * 1000;
                                        return (
                                            <div key={msg.id}>
                                                {showDate && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        margin: '24px 16px 8px',
                                                        gap: '12px'
                                                    }}>
                                                        <div style={{
                                                            height: '1px',
                                                            backgroundColor: '#40444b',
                                                            flex: 1
                                                        }} />
                                                        <span style={{
                                                            color: '#72767d',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            backgroundColor: '#36393f',
                                                            padding: '2px 8px',
                                                            borderRadius: '8px'
                                                        }}>
                                                            {formatDate(msg.timestamp)}
                                                        </span>
                                                        <div style={{
                                                            height: '1px',
                                                            backgroundColor: '#40444b',
                                                            flex: 1
                                                        }} />
                                                    </div>
                                                )}
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: isDMLayout && isMyMessage ? 'flex-end' : 'flex-start',
                                                    margin: isConsecutive ? '2px 16px' : '8px 16px',
                                                    position: 'relative'
                                                }}
                                                     onMouseEnter={() => setHoveredMessage(msg.id)}
                                                     onMouseLeave={() => setHoveredMessage(null)}>
                                                    {/* ユーザー名表示（他人のメッセージで初回のみ、またはサーバーモード） */}
                                                    {(!isDMLayout || (!isMyMessage && !isConsecutive)) && (
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            marginBottom: '4px',
                                                            marginLeft: isDMLayout && isMyMessage ? '0' : '12px'
                                                        }}>
                                                            <div style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '50%',
                                                                backgroundColor: '#5865f2',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                fontSize: '12px',
                                                                fontWeight: '600'
                                                            }}>
                                                                {(msg.userName || '匿名').charAt(0).toUpperCase()}
                                                            </div>
                                                            <span style={{
                                                                fontWeight: '600',
                                                                color: '#ffffff',
                                                                fontSize: '14px'
                                                            }}>
                                                                {msg.userName || '匿名'}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '11px',
                                                                color: '#72767d'
                                                            }}>
                                                                {formatTime(msg.timestamp)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {/* メッセージバブル */}
                                                    <div style={{
                                                        maxWidth: '70%',
                                                        minWidth: '60px',
                                                        position: 'relative'
                                                    }}>
                                                        {/* 返信先表示 */}
                                                        {msg.replyTo && (
                                                            <div style={{
                                                                backgroundColor: isDMLayout && isMyMessage ? '#4c5bdb' : '#4f545c',
                                                                padding: '6px 12px',
                                                                borderRadius: '12px 12px 4px 4px',
                                                                marginBottom: '2px',
                                                                fontSize: '13px',
                                                                color: '#dcddde',
                                                                opacity: 0.8,
                                                                borderLeft: (isDMLayout && isMyMessage) ? '3px solid #ffffff' : '3px solid #5865f2'
                                                            }}>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}>
                                                                    <span>↳</span>
                                                                    <span style={{ fontWeight: '600' }}>返信:</span>
                                                                    <span>{msg.replyTo}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* メインメッセージバブル */}
                                                        <div style={{
                                                            backgroundColor: isDMLayout && isMyMessage ? '#5865f2' : '#40444b',
                                                            color: isDMLayout && isMyMessage ? '#ffffff' : '#dcddde',
                                                            padding: '12px 16px',
                                                            borderRadius: isDMLayout && isMyMessage ? '18px 18px 4px 18px' :
                                                                isDMLayout ? '18px 18px 18px 4px' : '18px',
                                                            fontSize: '15px',
                                                            lineHeight: '1.375',
                                                            wordWrap: 'break-word',
                                                            position: 'relative',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                        }}>
                                                            {/* メッセージ内容 */}
                                                            {msg.content && (
                                                                <div style={{ marginBottom: msg.attachments?.length ? '8px' : '0' }}>
                                                                    {msg.content}
                                                                </div>
                                                            )}
                                                            {/* 添付ファイル表示 */}
                                                            {msg.attachments && msg.attachments.map((attachment, idx) => (
                                                                <div key={idx} style={{ marginTop: msg.content ? '8px' : '0' }}>
                                                                    {attachment.type === 'image' && (
                                                                        <div style={{
                                                                            borderRadius: '12px',
                                                                            overflow: 'hidden',
                                                                            maxWidth: '300px'
                                                                        }}>
                                                                            <ImageDisplay imageId={attachment.id} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {/* 編集済み表示 */}
                                                            {msg.edited && (
                                                                <div style={{
                                                                    fontSize: '10px',
                                                                    color: (isDMLayout && isMyMessage) ? 'rgba(255,255,255,0.7)' : '#72767d',
                                                                    fontStyle: 'italic',
                                                                    marginTop: '4px',
                                                                    textAlign: 'right'
                                                                }}>
                                                                    編集済み
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* 時刻表示（DMレイアウトまたは連続メッセージの場合） */}
                                                        {(isDMLayout || isConsecutive) && (
                                                            <div style={{
                                                                fontSize: '11px',
                                                                color: '#72767d',
                                                                marginTop: '2px',
                                                                textAlign: (isDMLayout && isMyMessage) ? 'right' : 'left',
                                                                paddingLeft: (isDMLayout && isMyMessage) ? '0' : '12px',
                                                                paddingRight: (isDMLayout && isMyMessage) ? '12px' : '0'
                                                            }}>
                                                                {formatTime(msg.timestamp)}
                                                            </div>
                                                        )}
                                                        {/* リアクション表示 */}
                                                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                            <div style={{
                                                                display: 'flex',
                                                                gap: '4px',
                                                                marginTop: '6px',
                                                                flexWrap: 'wrap',
                                                                justifyContent: (isDMLayout && isMyMessage) ? 'flex-end' : 'flex-start'
                                                            }}>
                                                                {Object.entries(msg.reactions).map(([emoji, users]) => (
                                                                    <button
                                                                        key={emoji}
                                                                        onClick={() => handleReaction(msg.id, emoji)}
                                                                        style={{
                                                                            backgroundColor: users.includes(user.uid) ?
                                                                                ((isDMLayout && isMyMessage) ? '#ffffff' : '#5865f2') :
                                                                                'rgba(64, 68, 75, 0.6)',
                                                                            color: users.includes(user.uid) ?
                                                                                ((isDMLayout && isMyMessage) ? '#5865f2' : '#ffffff') :
                                                                                '#dcddde',
                                                                            border: 'none',
                                                                            borderRadius: '12px',
                                                                            padding: '2px 8px',
                                                                            fontSize: '12px',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px',
                                                                            transition: 'all 0.1s ease',
                                                                            backdropFilter: 'blur(10px)'
                                                                        }}
                                                                    >
                                                                        <span>{emoji}</span>
                                                                        <span style={{ fontSize: '10px', fontWeight: '600' }}>
                                                                            {users.length}
                                                                        </span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* メッセージアクション */}
                                                    {hoveredMessage === msg.id && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '-8px',
                                                            [(isDMLayout && isMyMessage) ? 'left' : 'right']: '20px',
                                                            display: 'flex',
                                                            gap: '2px',
                                                            backgroundColor: '#2f3136',
                                                            padding: '4px',
                                                            borderRadius: '8px',
                                                            border: '1px solid #40444b',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                            zIndex: 10
                                                        }}>
                                                            <button
                                                                onClick={() => setReplyingTo(msg)}
                                                                style={{
                                                                    backgroundColor: 'transparent',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    padding: '6px',
                                                                    color: '#b9bbbe',
                                                                    cursor: 'pointer',
                                                                    fontSize: '14px'
                                                                }}
                                                                title="返信"
                                                            >
                                                                💬
                                                            </button>
                                                            {msg.userId === user.uid && (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingMessage(msg);
                                                                            setInput(msg.content);
                                                                        }}
                                                                        style={{
                                                                            backgroundColor: 'transparent',
                                                                            border: 'none',
                                                                            borderRadius: '4px',
                                                                            padding: '6px',
                                                                            color: '#b9bbbe',
                                                                            cursor: 'pointer',
                                                                            fontSize: '14px'
                                                                        }}
                                                                        title="編集"
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                    <button
                                                                        onClick={() => deleteMessage(msg.id)}
                                                                        style={{
                                                                            backgroundColor: 'transparent',
                                                                            border: 'none',
                                                                            borderRadius: '4px',
                                                                            padding: '6px',
                                                                            color: '#b9bbbe',
                                                                            cursor: 'pointer',
                                                                            fontSize: '14px'
                                                                        }}
                                                                        title="削除"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button
                                                                onClick={() => handleReaction(msg.id, '👍')}
                                                                style={{
                                                                    backgroundColor: 'transparent',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    padding: '6px',
                                                                    color: '#b9bbbe',
                                                                    cursor: 'pointer',
                                                                    fontSize: '14px'
                                                                }}
                                                                title="いいね"
                                                            >
                                                                👍
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                                {/* 入力エリア */}
                                <div style={{
                                    padding: '20px',
                                    backgroundColor: '#36393f',
                                    borderTop: '1px solid #40444b'
                                }}>
                                    {(editingMessage || replyingTo) && (
                                        <div style={{
                                            backgroundColor: '#2f3136',
                                            padding: '8px 12px',
                                            borderRadius: '4px',
                                            marginBottom: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{ color: '#dcddde', fontSize: '14px' }}>
                                                {editingMessage ? '編集中...' :
                                                    currentChannel?.type === 'dm' ?
                                                        `${getOtherParticipantName(currentChannel)}に返信中...` :
                                                        `${replyingTo.userName}に返信中...`}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    setEditingMessage(null);
                                                    setReplyingTo(null);
                                                    setInput('');
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#72767d',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                    {/* 画像プレビュー */}
                                    {imageAttachment && (
                                        <div style={{
                                            backgroundColor: '#2f3136',
                                            padding: '8px 12px',
                                            borderRadius: '4px',
                                            marginBottom: '8px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Image
                                                    src={imageAttachment.url}
                                                    alt="添付画像"
                                                    width={40}
                                                    height={40}
                                                    style={{
                                                        objectFit: 'cover',
                                                        borderRadius: '4px'
                                                    }}
                                                />
                                                <span style={{ color: '#dcddde', fontSize: '14px' }}>
                                                    {imageAttachment.name}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setImageAttachment(null)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#72767d',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )}
                                    <div style={{
                                        backgroundColor: '#40444b',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        gap: '12px'
                                    }}>
                                        <textarea
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            placeholder={
                                                currentChannel?.type === 'dm' ?
                                                    `${getOtherParticipantName(currentChannel)}にメッセージを送信` :
                                                    `#${currentChannel?.name || 'チャンネル'} にメッセージを送信`
                                            }
                                            style={{
                                                flex: 1,
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                color: '#dcddde',
                                                fontSize: '16px',
                                                resize: 'none',
                                                outline: 'none',
                                                fontFamily: 'inherit',
                                                lineHeight: '1.375',
                                                minHeight: '24px',
                                                maxHeight: '120px'
                                            }}
                                            rows={1}
                                        />
                                        {((currentServer?.id !== 'dm' && hasPermission(userPermissions, DEFAULT_PERMISSIONS.ATTACH_FILES)) || currentChannel?.type === 'dm') && (
                                            <button
                                                onClick={() => setShowImageUploader(true)}
                                                style={{
                                                    backgroundColor: '#40444b',
                                                    color: '#dcddde',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    width: '32px',
                                                    height: '32px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '16px'
                                                }}
                                            >
                                                📎
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!input.trim() && !imageAttachment}
                                            style={{
                                                backgroundColor: (input.trim() || imageAttachment) ? '#5865f2' : '#4f545c',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                width: '32px',
                                                height: '32px',
                                                cursor: (input.trim() || imageAttachment) ? 'pointer' : 'not-allowed',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '16px'
                                            }}
                                        >
                                            ➤
                                        </button>
                                    </div>
                                </div>
                            </>
                        )
                    ) : (
                        // チャンネル未選択時の表示
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            backgroundColor: '#36393f',
                            gap: '20px'
                        }}>
                            <div style={{
                                fontSize: '64px',
                                marginBottom: '20px'
                            }}>
                                💬
                            </div>
                            <h2 style={{
                                color: '#ffffff',
                                fontSize: '24px',
                                fontWeight: '600',
                                margin: '0'
                            }}>
                                {isDMMode ? 'フレンドを選択してください' : 'チャンネルを選択してください'}
                            </h2>
                            <p style={{
                                color: '#b9bbbe',
                                fontSize: '16px',
                                margin: '0',
                                textAlign: 'center'
                            }}>
                                {isDMMode ?
                                    '左側のフレンドリストからチャットを開始するフレンドを選択してください。' :
                                    '左側のチャンネルリストからチャンネルを選択してください。'
                                }
                            </p>
                        </div>
                    )}
                    {/* メンバーリストモーダル */}
                    {showMemberList && currentServer && currentServer.id !== 'dm' && (
                        <MemberList
                            server={currentServer}
                            currentUser={user}
                            onClose={() => setShowMemberList(false)}
                        />
                    )}
                    {/* タグ管理モーダル */}
                    {showTagManager && currentServer && currentServer.id !== 'dm' && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}>
                            <div style={{
                                backgroundColor: '#36393f',
                                borderRadius: '8px',
                                padding: '24px',
                                width: '500px',
                                maxWidth: '90vw'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '16px'
                                }}>
                                    <h3 style={{
                                        color: '#ffffff',
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        margin: 0
                                    }}>
                                        タグ管理
                                    </h3>
                                    <button
                                        onClick={() => setShowTagManager(false)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#b9bbbe',
                                            cursor: 'pointer',
                                            fontSize: '16px',
                                            padding: '4px'
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                                <TagManager
                                    user={user}
                                    currentServer={currentServer}
                                />
                            </div>
                        </div>
                    )}
                    {/* 招待モーダル */}
                    {showInviteModal && currentServer && currentServer.id !== 'dm' && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}>
                            <div style={{
                                backgroundColor: '#36393f',
                                borderRadius: '8px',
                                padding: '24px',
                                width: '400px',
                                maxWidth: '90vw'
                            }}>
                                <h2 style={{
                                    color: '#ffffff',
                                    fontSize: '20px',
                                    fontWeight: '600',
                                    margin: '0 0 16px 0'
                                }}>
                                    ユーザーを招待
                                </h2>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="メールアドレス"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#40444b',
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: '#dcddde',
                                        fontSize: '16px',
                                        marginBottom: '16px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '12px'
                                }}>
                                    <button
                                        onClick={() => {
                                            setShowInviteModal(false);
                                            setInviteEmail('');
                                        }}
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: '#ffffff',
                                            padding: '10px 16px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        キャンセル
                                    </button>
                                    <button
                                        onClick={handleInviteUser}
                                        disabled={!inviteEmail.trim()}
                                        style={{
                                            backgroundColor: inviteEmail.trim() ? '#5865f2' : '#4f545c',
                                            border: 'none',
                                            color: 'white',
                                            padding: '10px 16px',
                                            borderRadius: '4px',
                                            cursor: inviteEmail.trim() ? 'pointer' : 'not-allowed',
                                            fontSize: '14px'
                                        }}
                                    >
                                        招待
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* ロール管理モーダル */}
                    {showRoleManager && currentServer && currentServer.id !== 'dm' && (
                        <RoleManager
                            server={currentServer}
                            currentUser={user}
                            onClose={() => setShowRoleManager(false)}
                        />
                    )}
                    {/* 画像アップロードモーダル */}
                    {showImageUploader && (
                        <ImageUploader
                            onUpload={handleImageUpload}
                            onClose={() => setShowImageUploader(false)}
                        />
                    )}
                </div>
                {/* サーバー招待通知 */}
                <ServerInvites user={user} />
                {/* ボイスチャンネル */}
                {isVoiceChannelActive && currentChannel?.type === 'voice' && (
                    <VoiceChannel
                        channel={currentChannel}
                        currentUser={user}
                        isActive={isVoiceChannelActive}
                        onParticipantsUpdate={(participants) => setVoiceParticipants(participants)}
                        onSpeakingUsersUpdate={(users) => setSpeakingUsers(users)}
                        onMuteStateUpdate={(muted) => setIsMuted(muted)}
                    />
                )}
            </div>
        </ErrorBoundary>
    );
}

// ImageDisplayコンポーネント
function ImageDisplay({ imageId }) {
    const [imageData, setImageData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchImage = async () => {
            if (!imageId) {
                setLoading(false);
                return;
            }
            try {
                const data = await getImage(imageId);
                setImageData(data);
            } catch (error) {
                console.error('画像取得エラー:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchImage();
    }, [imageId]);

    if (loading) {
        return (
            <div style={{
                width: '200px',
                height: '200px',
                backgroundColor: '#2f3136',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#72767d'
            }}>
                読み込み中...
            </div>
        );
    }

    if (!imageData) {
        return (
            <div style={{
                width: '200px',
                height: '200px',
                backgroundColor: '#2f3136',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#72767d'
            }}>
                画像を読み込めませんでした
            </div>
        );
    }

    return (
        <Image
            src={imageData.data}
            alt={imageData.name || '画像'}
            width={400}
            height={300}
            style={{
                borderRadius: '8px',
                cursor: 'pointer'
            }}
            onClick={() => window.open(imageData.data, '_blank')}
        />
    );
}