
// components/MemberList.jsx
import { useState, useEffect } from 'react';
import { getServerMembers, updateMemberRoles, removeMemberFromServer, getServerRoles } from '../lib/firestore';
import UserProfile from './UserProfile';

export default function MemberList({ server, currentUser, onClose }) {
    const [members, setMembers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const isOwner = server?.ownerId === currentUser?.uid;

    useEffect(() => {
        if (!server?.id) return;

        // メンバー一覧を取得
        const unsubscribeMembers = getServerMembers(server.id, (snapshot) => {
            const memberList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMembers(memberList);
            setLoading(false);
        });

        // ロール一覧を取得
        const unsubscribeRoles = getServerRoles(server.id, (snapshot) => {
            const roleList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRoles(roleList);
        });

        return () => {
            unsubscribeMembers();
            unsubscribeRoles();
        };
    }, [server?.id]);

    const getMemberRoles = (member) => {
        if (!member.roles || !Array.isArray(member.roles)) return [];
        return member.roles.map(roleId => {
            const role = roles.find(r => r.id === roleId);
            return role ? { ...role, id: roleId } : null;
        }).filter(Boolean);
    };

    const handleRoleChange = async (memberId, roleId, addRole) => {
        try {
            const member = members.find(m => m.id === memberId);
            if (!member) return;

            let newRoles = [...(member.roles || [])];

            if (addRole) {
                // ロールを追加
                if (!newRoles.includes(roleId)) {
                    newRoles.push(roleId);
                }
            } else {
                // ロールを削除
                newRoles = newRoles.filter(id => id !== roleId);

                // @everyoneロールがなければ追加
                const everyoneRole = roles.find(r => r.isDefault);
                if (everyoneRole && !newRoles.includes(everyoneRole.id)) {
                    newRoles.push(everyoneRole.id);
                }
            }

            await updateMemberRoles(server.id, member.uid, newRoles);
        } catch (error) {
            console.error('メンバーロール変更エラー:', error);
            alert('メンバーロールの変更に失敗しました: ' + error.message);
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (confirm('このメンバーをサーバーから削除しますか？')) {
            try {
                await removeMemberFromServer(server.id, memberId);
            } catch (error) {
                console.error('メンバー削除エラー:', error);
                alert('メンバーの削除に失敗しました: ' + error.message);
            }
        }
    };

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
                                            {member.uid === currentUser.uid ? 'あなた' : 'メンバー'}
                                        </div>
                                    </div>
                                </div>

                                {/* ロール管理 */}
                                {isOwner && member.uid !== currentUser.uid && (
                                    <div style={{ minWidth: '200px' }}>
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '4px',
                                            marginBottom: '8px'
                                        }}>
                                            {getMemberRoles(member).map(role => (
                                                <div key={role.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    backgroundColor: '#40444b',
                                                    padding: '2px 6px',
                                                    borderRadius: '12px'
                                                }}>
                                                    <div style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        backgroundColor: role.color
                                                    }} />
                                                    <span style={{
                                                        color: '#dcddde',
                                                        fontSize: '12px'
                                                    }}>
                                                        {role.name}
                                                    </span>
                                                    {!role.isDefault && (
                                                        <button
                                                            onClick={() => handleRoleChange(member.id, role.id, false)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#ed4245',
                                                                cursor: 'pointer',
                                                                fontSize: '10px',
                                                                padding: '0',
                                                                marginLeft: '2px'
                                                            }}
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* ロール追加ドロップダウン */}
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleRoleChange(member.id, e.target.value, true);
                                                    e.target.value = '';
                                                }
                                            }}
                                            style={{
                                                backgroundColor: '#40444b',
                                                color: '#dcddde',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                                fontSize: '12px',
                                                width: '100%'
                                            }}
                                            value=""
                                        >
                                            <option value="">ロールを追加...</option>
                                            {roles
                                                .filter(role => !role.isDefault && !getMemberRoles(member).some(r => r.id === role.id))
                                                .map(role => (
                                                    <option key={role.id} value={role.id}>
                                                        {role.name}
                                                    </option>
                                                ))}
                                        </select>

                                        {/* 削除ボタン */}
                                        <button
                                            onClick={() => handleRemoveMember(member.uid)}
                                            style={{
                                                backgroundColor: '#ed4245',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '4px 8px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                marginTop: '8px',
                                                width: '100%'
                                            }}
                                        >
                                            サーバーから削除
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
