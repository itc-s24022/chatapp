
import { useState, useEffect } from 'react';
import { getUserFriends, getFriendRequests, acceptFriendRequest, declineFriendRequest } from '../lib/firestore';

export default function FriendsList({ user }) {
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('friends');

    useEffect(() => {
        if (!user) return;

        const unsubscribeFriends = getUserFriends(user.uid, (snapshot) => {
            const friendList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
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

    const handleAcceptRequest = async (requestId, fromUserId) => {
        await acceptFriendRequest(requestId, fromUserId, user.uid);
    };

    const handleDeclineRequest = async (requestId) => {
        await declineFriendRequest(requestId);
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
                                    marginBottom: '4px'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#40444b'}
                                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}>
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
                                            onClick={() => handleAcceptRequest(request.id, request.fromUserId)}
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
