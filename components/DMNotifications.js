// components/DMNotifications.js - フレンドリクエスト通知コンポーネント
import { useEffect, useState } from 'react';
import { getUserFriends } from '../lib/firestore';

export default function DMNotifications({ user }) {
    const [friendRequests, setFriendRequests] = useState([]);
    const [showNotification, setShowNotification] = useState(true);

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
                
                // 5秒後に自動で非表示
                setTimeout(() => {
                    setShowNotification(false);
                }, 5000);
            }
        });

        return () => unsubscribe();
    }, [user]);

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
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '300px',
            animation: 'slideIn 0.3s ease-out'
        }}>
            <div style={{
                fontSize: '20px'
            }}>
                🔔
            </div>
            <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                    新しいフレンドリクエスト
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    {friendRequests.length}件のリクエストがあります
                </div>
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
                    borderRadius: '4px',
                    marginLeft: 'auto'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
                ✕
            </button>

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