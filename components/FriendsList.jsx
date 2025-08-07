import { useState, useEffect, useRef } from 'react';
import { auth } from '../lib/firebase'; // パスを修正
import {
    getUserFriends,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    getUserDMs,
    createDMChannel,
    sendMessage,
    getChannelMessages
} from '../lib/firestore';
export default function FriendsList({ user, onDMChannelSelect }) {
    const [friends, setFriends] = useState([]);
    const [dmChannels, setDmChannels] = useState([]);
    const [currentDM, setCurrentDM] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [activeTab, setActiveTab] = useState("friends");
    const [friendRequests, setFriendRequests] = useState([]);
    const messagesEndRef = useRef(null);
    useEffect(() => {
        if (!user) return;
        // フレンド取得
        const unsubscribeFriends = getUserFriends(user.uid, (snapshot) => {
            const friendsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 承認済みフレンドと保留中のリクエストを分類
            const acceptedFriends = friendsList.filter(f => f.status === 'accepted');
            const pendingRequests = friendsList.filter(f =>
                f.status === 'pending' && f.receiverId === user.uid
            );

            // 承認済みフレンドの情報を正規化
            const normalizedFriends = acceptedFriends.map(friend => ({
                ...friend,
                friendId: friend.senderId === user.uid ? friend.receiverId : friend.senderId,
                friendName: friend.senderId === user.uid ? friend.receiverName : friend.senderName
            }));

            setFriends(normalizedFriends);
            setFriendRequests(pendingRequests);
        });
        // DM取得
        const unsubscribeDMs = getUserDMs(user.uid, (snapshot) => {
            const dmList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setDmChannels(dmList);
        });
        return () => {
            unsubscribeFriends();
            unsubscribeDMs();
        };
    }, [user]);
    // DMのメッセージ取得
    useEffect(() => {
        if (!currentDM) return;
        const unsubscribe = getChannelMessages(currentDM.id, (snapshot) => {
            const messageList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => {
                if (!a.timestamp || !b.timestamp) return 0;
                const timeA = a.timestamp.seconds || 0;
                const timeB = b.timestamp.seconds || 0;
                return timeA - timeB;
            });
            setMessages(messageList);
            scrollToBottom();
        });
        return () => unsubscribe();
    }, [currentDM]);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    const handleSendFriendRequest = async () => {
        if (!searchEmail.trim() || searchEmail === user.email) return;
        try {
            await sendFriendRequest(user.uid, user.displayName || '匿名', searchEmail.trim());
            setSearchEmail("");
            alert('フレンドリクエストを送信しました');
        } catch (error) {
            console.error('フレンドリクエストエラー:', error);
            alert('フレンドリクエストに失敗しました: ' + error.message);
        }
    };
    const handleAcceptFriendRequest = async (request) => {
        try {
            await acceptFriendRequest(
                request.id,
                user.uid,
                user.displayName || '匿名',
                request.senderId,
                request.senderName
            );
            alert('フレンドリクエストを承認しました');
        } catch (error) {
            console.error('承認エラー:', error);
            alert('承認に失敗しました');
        }
    };
    const handleDeclineFriendRequest = async (requestId) => {
        try {
            await declineFriendRequest(requestId);
            alert('フレンドリクエストを拒否しました');
        } catch (error) {
            console.error('拒否エラー:', error);
            alert('拒否に失敗しました');
        }
    };
    const handleStartDM = async (friendId, friendName) => {
        try {
            // 既存のDMチャンネルを探す
            const existingDM = dmChannels.find(dm =>
                dm.participants.includes(friendId) && dm.participants.includes(user.uid)
            );
            if (existingDM) {
                setCurrentDM(existingDM);
                setActiveTab("dms");
                if (onDMChannelSelect) {
                    onDMChannelSelect(existingDM);
                }
            } else {
                // 新しいDMチャンネルを作成
                const dmChannel = await createDMChannel(
                    user.uid,
                    friendId,
                    user.displayName || '匿名',
                    friendName
                );
                setCurrentDM(dmChannel);
                setActiveTab("dms");
                if (onDMChannelSelect) {
                    onDMChannelSelect(dmChannel);
                }
            }
        } catch (error) {
            console.error('DM開始エラー:', error);
            alert('DMの開始に失敗しました');
        }
    };
    const handleSelectDM = (dm) => {
        setCurrentDM(dm);
        if (onDMChannelSelect) {
            onDMChannelSelect(dm);
        }
    };
    const handleSendMessage = async () => {
        if (!input.trim() || !user || !currentDM) return;
        try {
            await sendMessage(
                currentDM.id,
                user.uid,
                user.displayName || "匿名",
                input.trim()
            );
            setInput("");
        } catch (error) {
            console.error('メッセージ送信エラー:', error);
            alert('メッセージの送信に失敗しました');
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
    const getOtherParticipant = (dm) => {
        return dm.participants.find(p => p !== user.uid);
    };
    const getOtherParticipantName = (dm) => {
        const otherParticipantId = getOtherParticipant(dm);
        return dm.participantNames?.[otherParticipantId] || '不明なユーザー';
    };
    return (
        <div style={{
            width: '240px',
            backgroundColor: '#2f3136',
            borderRight: '1px solid #202225',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh'
        }}>
            {/* ヘッダー */}
            <div style={{
                padding: '20px',
                borderBottom: '1px solid #40444b'
            }}>
                <h2 style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: '0 0 16px 0'
                }}>
                    ダイレクトメッセージ
                </h2>
                {/* タブ */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    backgroundColor: '#40444b',
                    borderRadius: '4px',
                    padding: '2px'
                }}>
                    <button
                        onClick={() => setActiveTab("friends")}
                        style={{
                            flex: 1,
                            backgroundColor: activeTab === "friends" ? '#5865f2' : 'transparent',
                            color: activeTab === "friends" ? '#ffffff' : '#b9bbbe',
                            border: 'none',
                            padding: '6px 8px',
                            borderRadius: '3px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        フレンド
                    </button>
                    <button
                        onClick={() => setActiveTab("dms")}
                        style={{
                            flex: 1,
                            backgroundColor: activeTab === "dms" ? '#5865f2' : 'transparent',
                            color: activeTab === "dms" ? '#ffffff' : '#b9bbbe',
                            border: 'none',
                            padding: '6px 8px',
                            borderRadius: '3px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        DM
                    </button>
                    <button
                        onClick={() => setActiveTab("add")}
                        style={{
                            flex: 1,
                            backgroundColor: activeTab === "add" ? '#5865f2' : 'transparent',
                            color: activeTab === "add" ? '#ffffff' : '#b9bbbe',
                            border: 'none',
                            padding: '6px 8px',
                            borderRadius: '3px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        追加
                    </button>
                </div>
            </div>
            {/* コンテンツエリア */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {/* フレンドリクエスト通知 */}
                {friendRequests.length > 0 && (
                    <div style={{
                        backgroundColor: '#faa61a',
                        padding: '8px 20px',
                        borderBottom: '1px solid #40444b'
                    }}>
                        <div style={{
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            {friendRequests.length}件のフレンドリクエスト
                        </div>
                    </div>
                )}
                {/* フレンドタブ */}
                {activeTab === "friends" && (
                    <div style={{ padding: '12px 0', height: '100%', overflowY: 'auto' }}>
                        {/* フレンドリクエスト */}
                        {friendRequests.map(request => (
                            <div key={request.id} style={{
                                padding: '8px 20px',
                                borderBottom: '1px solid #40444b',
                                backgroundColor: '#40444b'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <div>
                                        <div style={{
                                            color: '#ffffff',
                                            fontSize: '14px',
                                            fontWeight: '500'
                                        }}>
                                            {request.senderName}
                                        </div>
                                        <div style={{
                                            color: '#b9bbbe',
                                            fontSize: '12px'
                                        }}>
                                            フレンドリクエスト
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={() => handleAcceptFriendRequest(request)}
                                            style={{
                                                backgroundColor: '#3ba55c',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                padding: '4px 8px',
                                                fontSize: '10px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            承認
                                        </button>
                                        <button
                                            onClick={() => handleDeclineFriendRequest(request.id)}
                                            style={{
                                                backgroundColor: '#ed4245',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '3px',
                                                padding: '4px 8px',
                                                fontSize: '10px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            拒否
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* フレンド一覧 */}
                        {friends.map(friend => (
                            <div key={friend.id} style={{
                                padding: '8px 20px',
                                cursor: 'pointer',
                                transition: 'background-color 0.1s ease'
                            }}
                                 onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#36393f'}
                                 onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            backgroundColor: '#5865f2',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: '14px',
                                            fontWeight: '600'
                                        }}>
                                            {(friend.friendName || '匿').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{
                                                color: '#dcddde',
                                                fontSize: '14px',
                                                fontWeight: '500'
                                            }}>
                                                {friend.friendName}
                                            </div>
                                            <div style={{
                                                color: '#b9bbbe',
                                                fontSize: '12px'
                                            }}>
                                                オンライン
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleStartDM(friend.friendId, friend.friendName)}
                                        style={{
                                            backgroundColor: '#5865f2',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '3px',
                                            padding: '4px 8px',
                                            fontSize: '10px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        メッセージ
                                    </button>
                                </div>
                            </div>
                        ))}
                        {friends.length === 0 && friendRequests.length === 0 && (
                            <div style={{
                                padding: '40px 20px',
                                textAlign: 'center',
                                color: '#72767d',
                                fontSize: '14px'
                            }}>
                                フレンドがいません<br />
                                「追加」タブからフレンドを追加してみましょう
                            </div>
                        )}
                    </div>
                )}
                {/* DMタブ */}
                {activeTab === "dms" && (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '12px 0', height: '100%', overflowY: 'auto' }}>
                            {dmChannels.map(dm => (
                                <div key={dm.id} style={{
                                    padding: '8px 20px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.1s ease',
                                    backgroundColor: currentDM?.id === dm.id ? '#40444b' : 'transparent'
                                }}
                                     onClick={() => handleSelectDM(dm)}
                                     onMouseOver={(e) => {
                                         if (currentDM?.id !== dm.id) {
                                             e.currentTarget.style.backgroundColor = '#36393f';
                                         }
                                     }}
                                     onMouseOut={(e) => {
                                         if (currentDM?.id !== dm.id) {
                                             e.currentTarget.style.backgroundColor = 'transparent';
                                         }
                                     }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            backgroundColor: '#5865f2',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: '14px',
                                            fontWeight: '600'
                                        }}>
                                            {getOtherParticipantName(dm).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{
                                                color: '#dcddde',
                                                fontSize: '14px',
                                                fontWeight: '500'
                                            }}>
                                                {getOtherParticipantName(dm)}
                                            </div>
                                            <div style={{
                                                color: '#b9bbbe',
                                                fontSize: '12px'
                                            }}>
                                                ダイレクトメッセージ
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {dmChannels.length === 0 && (
                                <div style={{
                                    padding: '40px 20px',
                                    textAlign: 'center',
                                    color: '#72767d',
                                    fontSize: '14px'
                                }}>
                                    DMがありません<br />
                                    フレンドとメッセージを始めてみましょう
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* フレンド追加タブ */}
                {activeTab === "add" && (
                    <div style={{
                        padding: '20px',
                        height: '100%',
                        overflowY: 'auto'
                    }}>
                        <div style={{
                            marginBottom: '16px'
                        }}>
                            <label style={{
                                display: 'block',
                                color: '#b9bbbe',
                                fontSize: '12px',
                                fontWeight: '600',
                                marginBottom: '8px'
                            }}>
                                メールアドレスで検索
                            </label>
                            <div style={{
                                display: 'flex',
                                gap: '8px'
                            }}>
                                <input
                                    type="email"
                                    value={searchEmail}
                                    onChange={(e) => setSearchEmail(e.target.value)}
                                    placeholder="example@email.com"
                                    style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        backgroundColor: '#40444b',
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: '#dcddde',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={handleSendFriendRequest}
                                    disabled={!searchEmail.trim() || searchEmail === user.email}
                                    style={{
                                        backgroundColor: (searchEmail.trim() && searchEmail !== user.email) ? '#5865f2' : '#4f545c',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '8px 16px',
                                        cursor: (searchEmail.trim() && searchEmail !== user.email) ? 'pointer' : 'not-allowed',
                                        fontSize: '12px',
                                        fontWeight: '500'
                                    }}
                                >
                                    送信
                                </button>
                            </div>
                        </div>
                        <div style={{
                            backgroundColor: '#40444b',
                            borderRadius: '4px',
                            padding: '16px',
                            fontSize: '12px',
                            color: '#b9bbbe',
                            lineHeight: '1.5'
                        }}>
                            <strong>フレンドの追加方法：</strong><br />
                            相手のメールアドレスを入力してフレンドリクエストを送信してください。
                            相手が承認すると、フレンドリストに表示され、ダイレクトメッセージができるようになります。
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}