// components/FriendsList.jsx
import { useState, useEffect } from 'react';
import {
    getUserFriends,
    sendFriendRequest,
    respondToFriendRequest,
    getUserDMs,
    createDMChannel,
    getFriendRequests
} from '../lib/firestore';

export default function FriendsList({ user, onDMChannelSelect, currentChannel }) {
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [dmChannels, setDmChannels] = useState([]);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [friendEmail, setFriendEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState({});
    const [refreshKey, setRefreshKey] = useState(0); // リフレッシュ用のキー

    useEffect(() => {
        if (!user) return;

        // フレンド取得
        const unsubscribeFriends = getUserFriends(user.uid, (snapshot) => {
            const friendsData = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(req => req.status === 'accepted');

            setFriends(friendsData);
        });

        // 保留中のリクエスト取得
        const unsubscribeRequests = getFriendRequests(user.uid, (snapshot) => {
            const requestsData = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(req => req.status === 'pending' && req.receiverId === user.uid);

            setPendingRequests(requestsData);
        });

        // DMチャンネル取得
        const unsubscribeDMs = getUserDMs(user.uid, (snapshot) => {
            const dmList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setDmChannels(dmList);
        });

        return () => {
            unsubscribeFriends();
            unsubscribeRequests();
            unsubscribeDMs();
        };
    }, [user, refreshKey]); // refreshKeyを依存配列に追加

    const handleSendFriendRequest = async () => {
        if (!friendEmail.trim() || loading) return;

        setLoading(true);
        try {
            await sendFriendRequest(user.uid, user.displayName || '匿名', friendEmail.trim());
            alert('フレンドリクエストを送信しました');
            setFriendEmail('');
            setShowAddFriend(false);
            setRefreshKey(prev => prev + 1); // リフレッシュキーを更新
        } catch (error) {
            console.error('フレンドリクエスト送信エラー:', error);
            alert('リクエストの送信に失敗しました: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStartDM = async (friendId, friendName) => {
        try {
            // 既存のDMチャンネルを検索
            const existingDM = dmChannels.find(dm =>
                dm.type === 'dm' &&
                dm.participants.includes(user.uid) &&
                dm.participants.includes(friendId)
            );

            if (existingDM) {
                // 既存のDMチャンネルを選択
                onDMChannelSelect(existingDM);
            } else {
                // 新しいDMチャンネルを作成
                const newDM = await createDMChannel(
                    user.uid,
                    friendId,
                    user.displayName || '匿名',
                    friendName || '匿名'
                );
                onDMChannelSelect(newDM);
            }
        } catch (error) {
            console.error('DM開始エラー:', error);
            alert('DMの開始に失敗しました: ' + error.message);
        }
    };

    const handleCancelRequest = async (requestId) => {
        if (processing[requestId]) return;

        setProcessing(prev => ({ ...prev, [requestId]: true }));

        try {
            await respondToFriendRequest(requestId, false);
            setPendingRequests(prev => prev.filter(req => req.id !== requestId));
            setRefreshKey(prev => prev + 1); // リフレッシュキーを更新
        } catch (error) {
            console.error('リクエストキャンセルエラー:', error);
            alert('キャンセルに失敗しました');
        } finally {
            setProcessing(prev => ({ ...prev, [requestId]: false }));
        }
    };

    const handleAcceptRequest = async (requestId) => {
        if (processing[requestId]) return;

        setProcessing(prev => ({ ...prev, [requestId]: true }));

        try {
            const request = pendingRequests.find(req => req.id === requestId);
            if (request) {
                await respondToFriendRequest(requestId, true);
                setPendingRequests(prev => prev.filter(req => req.id !== requestId));
                setRefreshKey(prev => prev + 1); // リフレッシュキーを更新
            }
        } catch (error) {
            console.error('リクエスト承認エラー:', error);
            alert('承認に失敗しました');
        } finally {
            setProcessing(prev => ({ ...prev, [requestId]: false }));
        }
    };

    return (
        <div style={{
            width: '240px',
            backgroundColor: '#2f3136',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
        }}>
            <div style={{
                padding: '16px',
                borderBottom: '1px solid #40444b'
            }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#ffffff'
                }}>
                    ダイレクトメッセージ
                </h2>
            </div>

            <div style={{
                padding: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h3 style={{
                    margin: 0,
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#8e9297',
                    textTransform: 'uppercase'
                }}>
                    フレンド
                </h3>
                <button
                    onClick={() => setShowAddFriend(!showAddFriend)}
                    style={{
                        backgroundColor: showAddFriend ? '#5865f2' : 'transparent',
                        color: showAddFriend ? 'white' : '#8e9297',
                        border: 'none',
                        borderRadius: '4px',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px'
                    }}
                >
                    {showAddFriend ? '✕' : '+'}
                </button>
            </div>

            {/* フレンド追加フォーム */}
            {showAddFriend && (
                <div style={{
                    padding: '0 8px 8px'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '4px'
                    }}>
                        <input
                            type="email"
                            value={friendEmail}
                            onChange={(e) => setFriendEmail(e.target.value)}
                            placeholder="メールアドレス"
                            style={{
                                flex: 1,
                                padding: '6px 8px',
                                backgroundColor: '#40444b',
                                border: 'none',
                                borderRadius: '4px',
                                color: '#dcddde',
                                fontSize: '12px'
                            }}
                        />
                        <button
                            onClick={handleSendFriendRequest}
                            disabled={!friendEmail.trim() || loading}
                            style={{
                                backgroundColor: friendEmail.trim() && !loading ? '#5865f2' : '#4f545c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                cursor: friendEmail.trim() && !loading ? 'pointer' : 'not-allowed',
                                fontSize: '12px'
                            }}
                        >
                            {loading ? '送信中...' : '追加'}
                        </button>
                    </div>
                </div>
            )}

            {/* フレンドリスト */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px'
            }}>
                {friends.length > 0 ? (
                    friends.map(friend => {
                        const otherUserId = friend.senderId === user.uid ? friend.receiverId : friend.senderId;
                        const otherUserName = friend.senderId === user.uid ? friend.receiverName : friend.senderName;

                        return (
                            <div
                                key={friend.id}
                                onClick={() => handleStartDM(otherUserId, otherUserName)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    marginBottom: '2px',
                                    backgroundColor: currentChannel?.participants?.includes(otherUserId) ? '#40444b' : 'transparent'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = currentChannel?.participants?.includes(otherUserId) ? '#40444b' : '#35373c'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = currentChannel?.participants?.includes(otherUserId) ? '#40444b' : 'transparent'}
                            >
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
                                    fontWeight: '600',
                                    marginRight: '8px'
                                }}>
                                    {(otherUserName || '匿').charAt(0).toUpperCase()}
                                </div>
                                <div style={{
                                    color: '#dcddde',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}>
                                    {otherUserName || '匿名'}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div style={{
                        padding: '8px',
                        color: '#8e9297',
                        fontSize: '12px',
                        textAlign: 'center'
                    }}>
                        フレンドがいません
                    </div>
                )}

                {/* 保留中のリクエスト */}
                {pendingRequests.length > 0 && (
                    <>
                        <h3 style={{
                            margin: '16px 0 8px 0',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#8e9297',
                            textTransform: 'uppercase'
                        }}>
                            保留中のリクエスト
                        </h3>
                        {pendingRequests.map(request => (
                            <div key={request.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '8px',
                                borderRadius: '4px',
                                marginBottom: '2px',
                                backgroundColor: '#40444b'
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
                                    fontWeight: '600',
                                    marginRight: '8px'
                                }}>
                                    {(request.senderName || '匿').charAt(0).toUpperCase()}
                                </div>
                                <div style={{
                                    flex: 1,
                                    color: '#dcddde',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}>
                                    {request.senderName || '匿名'}
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        onClick={() => handleAcceptRequest(request.id)}
                                        disabled={processing[request.id]}
                                        style={{
                                            backgroundColor: '#3ba55c',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: processing[request.id] ? 'not-allowed' : 'pointer',
                                            fontSize: '12px'
                                        }}
                                    >
                                        {processing[request.id] ? '処理中...' : '承認'}
                                    </button>
                                    <button
                                        onClick={() => handleCancelRequest(request.id)}
                                        disabled={processing[request.id]}
                                        style={{
                                            backgroundColor: '#ed4245',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: processing[request.id] ? 'not-allowed' : 'pointer',
                                            fontSize: '12px'
                                        }}
                                    >
                                        {processing[request.id] ? '処理中...' : '拒否'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}