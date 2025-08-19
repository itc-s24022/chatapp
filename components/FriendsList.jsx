import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
    sendFriendRequest,
    getFriendRequests,
    acceptFriendRequest,
    declineFriendRequest,
    getUserFriends,
    searchUserByEmail,
    createDMChannel
} from '../lib/firestore';

export default function FriendsList({ user }) {
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('friends');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) return;
        const unsubscribeFriends = getUserFriends(user.uid, (snapshot) => {
            const friendList = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    friendId: data.user1 === user.uid ? data.user2 : data.user1
                };
            });
            setFriends(friendList);
        });
        const unsubscribeRequests = getFriendRequests(user.uid, (snapshot) => {
            const requestList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setFriendRequests(requestList);
        });
        return () => {
            unsubscribeFriends();
            unsubscribeRequests();
        };
    }, [user]);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        try {
            const results = await searchUserByEmail(searchQuery.trim());
            setSearchResults(results.filter(result => result.uid !== user.uid));
        } catch (error) {
            console.error('検索エラー:', error);
            alert('ユーザー検索に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    const handleSendFriendRequest = async (targetUser) => {
        try {
            await sendFriendRequest(
                user.uid,
                user.displayName || '匿名',
                targetUser.uid || targetUser.id,
                targetUser.displayName || '匿名'
            );
            alert('フレンド申請を送信しました');
            setSearchResults([]);
            setSearchQuery('');
        } catch (error) {
            console.error('フレンド申請エラー:', error);
            alert('フレンド申請に失敗しました');
        }
    };

    const handleAcceptRequest = async (requestId, fromUserId, fromUserName) => {
        try {
            await acceptFriendRequest(
                requestId,
                user.uid,
                user.displayName || '匿名',
                fromUserId,
                fromUserName || '匿名'
            );
        } catch (error) {
            console.error('フレンド申請受諾エラー:', error);
            alert('フレンド申請の受諾に失敗しました');
        }
    };

    const handleDeclineRequest = async (requestId) => {
        try {
            await declineFriendRequest(requestId);
        } catch (error) {
            console.error('フレンド申請拒否エラー:', error);
            alert('フレンド申請の拒否に失敗しました');
        }
    };

    const handleStartDM = async (friendId) => {
        try {
            // Fetch friend's display name
            const friendRef = doc(db, 'users', friendId);
            const friendDoc = await getDoc(friendRef);
            const friendName = friendDoc.exists() ? (friendDoc.data().displayName || '匿名') : '匿名';

            await createDMChannel(
                user.uid,
                friendId,
                user.displayName || '匿名',
                friendName
            );
            alert('DMチャンネルを作成しました');
        } catch (error) {
            console.error('DM作成エラー:', error);
            alert('DM作成に失敗しました');
        }
    };

    return (
        <div style={{
            width: '240px',
            backgroundColor: '#2f3136',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh'
        }}>
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #202225'
            }}>
                <h2 style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: '0 0 16px 0'
                }}>
                    フレンド
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button
                        onClick={() => setActiveTab('friends')}
                        style={{
                            backgroundColor: activeTab === 'friends' ? '#5865f2' : 'transparent',
                            color: activeTab === 'friends' ? '#ffffff' : '#b9bbbe',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '14px'
                        }}
                    >
                        すべて ({friends.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        style={{
                            backgroundColor: activeTab === 'requests' ? '#5865f2' : 'transparent',
                            color: activeTab === 'requests' ? '#ffffff' : '#b9bbbe',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '14px',
                            position: 'relative'
                        }}
                    >
                        申請中
                        {friendRequests.length > 0 && (
                            <span style={{
                                backgroundColor: '#ed4245',
                                color: 'white',
                                borderRadius: '10px',
                                padding: '2px 6px',
                                fontSize: '12px',
                                marginLeft: '8px'
                            }}>
                                {friendRequests.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>
            <div style={{ padding: '0 16px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                        type="text"
                        placeholder="メールアドレスで検索"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            backgroundColor: '#202225',
                            color: '#b9bbbe',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '8px 12px',
                            fontSize: '14px',
                            flex: 1
                        }}
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        style={{
                            backgroundColor: '#5865f2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {loading ? '検索中...' : '検索'}
                    </button>
                </div>
                {searchResults.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                        {searchResults.map(result => (
                            <div key={result.uid} style={{
                                backgroundColor: '#40444b',
                                borderRadius: '4px',
                                padding: '12px',
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div>
                                    <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                                        {result.displayName || "匿名"}
                                    </div>
                                    <div style={{ color: '#b9bbbe', fontSize: '12px' }}>
                                        {result.email}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSendFriendRequest(result)}
                                    style={{
                                        backgroundColor: '#3ba55c',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '6px 12px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    フレンド申請
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {activeTab === 'friends' ? (
                    <div>
                        {friends.length === 0 ? (
                            <p style={{ color: '#b9bbbe', fontSize: '14px', textAlign: 'center' }}>
                                フレンドがいません
                            </p>
                        ) : (
                            friends.map(friend => (
                                <div key={friend.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    marginBottom: '4px',
                                    justifyContent: 'space-between'
                                }}
                                     onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#40444b'}
                                     onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            backgroundColor: '#5865f2',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: 'white'
                                        }}>
                                            {(friend.displayName || "匿").charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{
                                                color: '#ffffff',
                                                fontSize: '14px',
                                                fontWeight: '500'
                                            }}>
                                                {friend.displayName || "匿名"}
                                            </div>
                                            <div style={{
                                                color: '#43b581',
                                                fontSize: '12px'
                                            }}>
                                                オンライン
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleStartDM(friend.friendId)}
                                        style={{
                                            backgroundColor: '#5865f2',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '6px 12px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        DM
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div>
                        {friendRequests.length === 0 ? (
                            <p style={{ color: '#b9bbbe', fontSize: '14px', textAlign: 'center' }}>
                                申請はありません
                            </p>
                        ) : (
                            friendRequests.map(request => (
                                <div key={request.id} style={{
                                    backgroundColor: '#40444b',
                                    borderRadius: '4px',
                                    padding: '12px',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            backgroundColor: '#5865f2',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: 'white'
                                        }}>
                                            {(request.fromUserName || "匿").charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{
                                                color: '#ffffff',
                                                fontSize: '14px',
                                                fontWeight: '500'
                                            }}>
                                                {request.fromUserName || "匿名"}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        gap: '8px'
                                    }}>
                                        <button
                                            onClick={() => handleAcceptRequest(request.id, request.fromUserId, request.fromUserName)}
                                            style={{
                                                backgroundColor: '#3ba55c',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '6px 12px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                flex: 1
                                            }}
                                        >
                                            承認
                                        </button>
                                        <button
                                            onClick={() => handleDeclineRequest(request.id)}
                                            style={{
                                                backgroundColor: '#ed4245',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '6px 12px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                flex: 1
                                            }}
                                        >
                                            拒否
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}