//components/MemberList.jsx
import { useState, useEffect } from 'react';
import { getServerMembers, updateMemberRoles, removeMemberFromServer } from '../lib/firestore';
import UserProfile from './UserProfile';

export default function MemberList({ server, currentUser, onClose }) {
    const [members, setMembers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!server?.id) return;

        const unsubscribe = getServerMembers(server.id, (snapshot) => {
            const memberList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMembers(memberList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [server?.id]);

    const handleRoleChange = async (memberId, newRole) => {
        await updateMemberRoles(server.id, memberId, [newRole]);
    };

    const handleRemoveMember = async (memberId) => {
        if (confirm('このメンバーをサーバーから削除しますか？')) {
            await removeMemberFromServer(server.id, memberId);
        }
    };

    const isOwner = server?.ownerId === currentUser?.uid;

    return (
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
                width: '600px',
                maxWidth: '90vw',
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                }}>
                    <h2 style={{
                        color: '#ffffff',
                        fontSize: '20px',
                        fontWeight: '600',
                        margin: 0
                    }}>
                        メンバー一覧 - {server?.name}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#b9bbbe',
                            cursor: 'pointer',
                            fontSize: '18px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {loading ? (
                    <div style={{ color: '#b9bbbe', textAlign: 'center', padding: '20px' }}>
                        読み込み中...
                    </div>
                ) : (
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {members.map(member => (
                            <div key={member.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px',
                                backgroundColor: '#2f3136',
                                borderRadius: '4px',
                                marginBottom: '8px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setSelectedUser(member)}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: '#5865f2',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: 'white'
                                    }}>
                                        {(member.displayName || "匿").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{
                                            color: '#ffffff',
                                            fontSize: '16px',
                                            fontWeight: '500'
                                        }}>
                                            {member.displayName || "匿名"}
                                            {member.uid === server.ownerId && (
                                                <span style={{
                                                    color: '#faa61a',
                                                    fontSize: '12px',
                                                    marginLeft: '8px'
                                                }}>
                                                    👑 オーナー
                                                </span>
                                            )}
                                        </div>
                                        <div style={{
                                            color: '#b9bbbe',
                                            fontSize: '14px'
                                        }}>
                                            {member.role || 'メンバー'}
                                        </div>
                                    </div>
                                </div>

                                {isOwner && member.uid !== currentUser.uid && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <select
                                            value={member.role || 'member'}
                                            onChange={(e) => handleRoleChange(member.uid, e.target.value)}
                                            style={{
                                                backgroundColor: '#40444b',
                                                color: '#dcddde',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                                fontSize: '12px'
                                            }}
                                        >
                                            <option value="member">メンバー</option>
                                            <option value="moderator">モデレーター</option>
                                            <option value="admin">管理者</option>
                                        </select>
                                        <button
                                            onClick={() => handleRemoveMember(member.uid)}
                                            style={{
                                                backgroundColor: '#ed4245',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                                cursor: 'pointer',
                                                fontSize: '12px'
                                            }}
                                        >
                                            削除
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {selectedUser && (
                    <UserProfile
                        user={selectedUser}
                        onClose={() => setSelectedUser(null)}
                        onSendFriendRequest={() => {}}
                        onCreateDM={() => {}}
                        isFriend={false}
                    />
                )}
            </div>
        </div>
    );
}
