
import { useState, useEffect } from 'react';
import { getServerInvites, acceptServerInvite, declineServerInvite } from '../lib/firestore';

export default function ServerInvites({ user }) {
    const [invites, setInvites] = useState([]);

    useEffect(() => {
        if (!user) return;

        const unsubscribe = getServerInvites(user.uid, (snapshot) => {
            const inviteList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setInvites(inviteList);
        });

        return () => unsubscribe();
    }, [user]);

    const handleAccept = async (invite) => {
        try {
            await acceptServerInvite(invite.id, invite.serverId, user.uid, user.displayName || '匿名');
        } catch (error) {
            console.error('招待受諾エラー:', error);
            alert('招待の受諾に失敗しました');
        }
    };

    const handleDecline = async (inviteId) => {
        try {
            await declineServerInvite(inviteId);
        } catch (error) {
            console.error('招待拒否エラー:', error);
            alert('招待の拒否に失敗しました');
        }
    };

    if (invites.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#36393f',
            border: '1px solid #40444b',
            borderRadius: '8px',
            padding: '16px',
            maxWidth: '300px',
            zIndex: 1000
        }}>
            <h3 style={{ 
                color: '#ffffff', 
                fontSize: '16px', 
                margin: '0 0 12px 0' 
            }}>
                サーバー招待 ({invites.length})
            </h3>
            
            {invites.map(invite => (
                <div key={invite.id} style={{
                    backgroundColor: '#2f3136',
                    borderRadius: '4px',
                    padding: '12px',
                    marginBottom: '8px'
                }}>
                    <div style={{ color: '#dcddde', fontSize: '14px', marginBottom: '8px' }}>
                        <strong>{invite.inviterName}</strong> があなたをサーバーに招待しました
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => handleAccept(invite)}
                            style={{
                                backgroundColor: '#5865f2',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            受諾
                        </button>
                        <button
                            onClick={() => handleDecline(invite.id)}
                            style={{
                                backgroundColor: '#ed4245',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            拒否
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
