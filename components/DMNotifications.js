// components/DMNotifications.js - フレンドリクエスト通知コンポーネント
import { useEffect, useState } from 'react';
import { getUserFriends, respondToFriendRequest } from '../lib/firestore';

export default function DMNotifications({ user }) {
    const [friendRequests, setFriendRequests] = useState([]);
    const [showNotification, setShowNotification] = useState(true);
    const [processing, setProcessing] = useState({});

    useEffect(() => {
        if (!user) return;

        const unsubscribe = getUserFriends(user.uid, (snapshot) => {
            const pendingRequests = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(req => req.status === 'pending' && req.receiverId === user.uid);

            setFriendRequests(pendingRequests);

            // 新しいリクエストがあった場合は通知を表示
            if (pendingRequests.length > 0) {
                setShowNotification(true);
            }
        });

        return () => unsubscribe();
    }, [user]);

    const handleResponse = async (requestId, accept) => {
        if (processing[requestId]) return;

        setProcessing(prev => ({ ...prev, [requestId]: true }));

        try {
            await respondToFriendRequest(requestId, accept);

            // リクエストをリストから削除
            setFriendRequests(prev => prev.filter(req => req.id !== requestId));

            // リクエストがなくなったら通知を非表示
            if (friendRequests.length <= 1) {
                setShowNotification(false);
            }
        } catch (error) {
            console.error('フレンドリクエストの応答エラー:', error);
            alert('処理に失敗しました');
        } finally {
            setProcessing(prev => ({ ...prev, [requestId]: false }));
        }
    };

    if (friendRequests.length === 0 || !showNotification) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#5865f2',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1001,
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '320px',
            animation: 'slideIn 0.3s ease-out'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '20px' }}>🔔</div>
                    <div style={{ fontWeight: '600' }}>新しいフレンドリクエスト</div>
                </div>
                <button
                    onClick={() => setShowNotification(false)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '4px',
                        borderRadius: '4px'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                    ✕
                </button>
            </div>

            {friendRequests.map(request => (
                <div key={request.id} style={{
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '8px'
                }}>
                    <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontWeight: '500' }}>{request.senderName || 'ユーザー'}</div>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>
                            フレンドリクエストが届いています
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => handleResponse(request.id, true)}
                            disabled={processing[request.id]}
                            style={{
                                backgroundColor: '#3ba55c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                cursor: processing[request.id] ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                flex: 1
                            }}
                        >
                            {processing[request.id] ? '処理中...' : '承認'}
                        </button>
                        <button
                            onClick={() => handleResponse(request.id, false)}
                            disabled={processing[request.id]}
                            style={{
                                backgroundColor: '#ed4245',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                cursor: processing[request.id] ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                flex: 1
                            }}
                        >
                            {processing[request.id] ? '処理中...' : '拒否'}
                        </button>
                    </div>
                </div>
            ))}

            <style jsx>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}