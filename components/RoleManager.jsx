// components/RoleManager.jsx
import { useState, useEffect } from 'react';
import {
    getServerRoles,
    createServerRole,
    updateServerRole,
    deleteServerRole,
    DEFAULT_PERMISSIONS,
    getServerMembers,
    updateMemberRoles
} from '../lib/firestore';

export default function RoleManager({ server, currentUser, onClose }) {
    const [roles, setRoles] = useState([]);
    const [members, setMembers] = useState([]);
    const [showCreateRole, setShowCreateRole] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
    const [newRole, setNewRole] = useState({
        name: '',
        color: '#99aab5',
        permissions: [],
        position: 1
    });

    const permissionCategories = {
        '一般管理': [
            { key: DEFAULT_PERMISSIONS.ADMINISTRATOR, label: '管理者', description: '全権限を付与' },
            { key: DEFAULT_PERMISSIONS.MANAGE_SERVER, label: 'サーバー管理', description: 'サーバー設定の変更' },
            { key: DEFAULT_PERMISSIONS.MANAGE_ROLES, label: 'ロール管理', description: 'ロールの編集・削除' },
            { key: DEFAULT_PERMISSIONS.MANAGE_CHANNELS, label: 'チャンネル管理', description: 'チャンネルの作成・削除' },
        ],
        'メッセージ・チャット操作': [
            { key: DEFAULT_PERMISSIONS.SEND_MESSAGES, label: 'メッセージ送信', description: 'チャンネルへのメッセージ投稿' },
            { key: DEFAULT_PERMISSIONS.EDIT_DELETE_MESSAGES, label: 'メッセージ編集・削除', description: '自分または他人のメッセージの編集・削除' },
            { key: DEFAULT_PERMISSIONS.PIN_MESSAGES, label: 'メッセージピン留め', description: 'メッセージをピン留め可能' },
            { key: DEFAULT_PERMISSIONS.EMBED_LINKS, label: '埋め込みリンク送信', description: 'リンクカード表示許可' },
            { key: DEFAULT_PERMISSIONS.ATTACH_FILES, label: 'ファイル添付', description: '画像・ファイルの添付' },
            { key: DEFAULT_PERMISSIONS.MENTION_EVERYONE, label: '@everyone使用', description: '全体メンションの使用' },
            { key: DEFAULT_PERMISSIONS.USE_EXTERNAL_EMOJIS, label: '外部絵文字使用', description: '他サーバーの絵文字を使用' },
        ],
        'メンバー管理': [
            { key: DEFAULT_PERMISSIONS.VIEW_MEMBERS, label: 'メンバー表示', description: 'メンバー一覧の表示' },
            { key: DEFAULT_PERMISSIONS.ADD_FRIENDS, label: 'フレンド追加', description: 'フレンド機能の使用' },
            { key: DEFAULT_PERMISSIONS.MANAGE_MEMBERS, label: 'メンバー管理', description: 'キック・バンなどの管理' },
            { key: DEFAULT_PERMISSIONS.ASSIGN_ROLES, label: 'ロール付与', description: '他人にロールを割り当て' },
        ]
    };

    useEffect(() => {
        if (!server) return;

        // ロール一覧を取得
        const unsubscribeRoles = getServerRoles(server.id, (snapshot) => {
            const roleList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRoles(roleList.sort((a, b) => b.position - a.position));
        });

        // メンバー一覧を取得
        const unsubscribeMembers = getServerMembers(server.id, (snapshot) => {
            const memberList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMembers(memberList);
        });

        return () => {
            unsubscribeRoles();
            unsubscribeMembers();
        };
    }, [server]);

    const handleCreateRole = async () => {
        if (!newRole.name.trim()) return;
        try {
            // 新しいロールの位置を計算（最下位に配置）
            const lowestPosition = Math.min(...roles.map(r => r.position), 0) - 1;

            await createServerRole(server.id, {
                ...newRole,
                position: lowestPosition,
                canBeDeleted: true,
                isDefault: false
            });
            setShowCreateRole(false);
            setNewRole({
                name: '',
                color: '#99aab5',
                permissions: [],
                position: 1
            });
        } catch (error) {
            console.error('ロール作成エラー:', error);
            alert('ロール作成に失敗しました: ' + error.message);
        }
    };

    const handleUpdateRole = async (roleId, updatedData) => {
        try {
            await updateServerRole(roleId, updatedData);
            setEditingRole(null);
        } catch (error) {
            console.error('ロール更新エラー:', error);
            alert('ロール更新に失敗しました: ' + error.message);
        }
    };

    const handleDeleteRole = async (roleId, canBeDeleted) => {
        if (!canBeDeleted) {
            alert('このロールは削除できません');
            return;
        }
        if (confirm('このロールを削除しますか？このロールを持つメンバーは@everyoneロールに戻ります。')) {
            try {
                // ロールを削除する前に、このロールを持つメンバーを@everyoneロールに戻す
                const everyoneRole = roles.find(r => r.isDefault);
                if (everyoneRole) {
                    const membersWithRole = members.filter(member =>
                        member.roles && member.roles.includes(roleId)
                    );

                    for (const member of membersWithRole) {
                        const newRoles = member.roles.filter(id => id !== roleId);
                        if (!newRoles.includes(everyoneRole.id)) {
                            newRoles.push(everyoneRole.id);
                        }
                        await updateMemberRoles(server.id, member.uid, newRoles);
                    }
                }

                await deleteServerRole(roleId);
            } catch (error) {
                console.error('ロール削除エラー:', error);
                alert('ロール削除に失敗しました: ' + error.message);
            }
        }
    };

    const togglePermission = (permission, isEditing = false) => {
        if (isEditing && editingRole) {
            const updatedPermissions = editingRole.permissions.includes(permission)
                ? editingRole.permissions.filter(p => p !== permission)
                : [...editingRole.permissions, permission];
            setEditingRole({
                ...editingRole,
                permissions: updatedPermissions
            });
        } else {
            const updatedPermissions = newRole.permissions.includes(permission)
                ? newRole.permissions.filter(p => p !== permission)
                : [...newRole.permissions, permission];
            setNewRole({
                ...newRole,
                permissions: updatedPermissions
            });
        }
    };

    const getPermissionLabel = (permission) => {
        const labels = {
            [DEFAULT_PERMISSIONS.ADMINISTRATOR]: '管理者',
            [DEFAULT_PERMISSIONS.MANAGE_SERVER]: 'サーバー管理',
            [DEFAULT_PERMISSIONS.MANAGE_ROLES]: 'ロール管理',
            [DEFAULT_PERMISSIONS.MANAGE_CHANNELS]: 'チャンネル管理',
            [DEFAULT_PERMISSIONS.SEND_MESSAGES]: 'メッセージ送信',
            [DEFAULT_PERMISSIONS.EDIT_DELETE_MESSAGES]: 'メッセージ編集・削除',
            [DEFAULT_PERMISSIONS.PIN_MESSAGES]: 'メッセージのピン留め',
            [DEFAULT_PERMISSIONS.EMBED_LINKS]: '埋め込みリンクの送信',
            [DEFAULT_PERMISSIONS.ATTACH_FILES]: 'ファイル添付',
            [DEFAULT_PERMISSIONS.MENTION_EVERYONE]: 'メンション許可',
            [DEFAULT_PERMISSIONS.USE_EXTERNAL_EMOJIS]: '外部絵文字使用',
            [DEFAULT_PERMISSIONS.VIEW_MEMBERS]: 'メンバーの表示・検索',
            [DEFAULT_PERMISSIONS.ADD_FRIENDS]: 'フレンド追加',
            [DEFAULT_PERMISSIONS.MANAGE_MEMBERS]: 'メンバーのミュート/キック/バン',
            [DEFAULT_PERMISSIONS.ASSIGN_ROLES]: 'ロール付与・削除'
        };
        return labels[permission] || permission;
    };

    const handleRolePositionChange = async (roleId, direction) => {
        try {
            const currentRole = roles.find(r => r.id === roleId);
            if (!currentRole) return;

            // 位置を変更する対象のロールを見つける
            const targetIndex = direction === 'up'
                ? roles.findIndex(r => r.position > currentRole.position)
                : roles.findIndex(r => r.position < currentRole.position);

            if (targetIndex === -1) return;

            const targetRole = roles[targetIndex];

            // 位置を交換
            await updateServerRole(roleId, { ...currentRole, position: targetRole.position });
            await updateServerRole(targetRole.id, { ...targetRole, position: currentRole.position });
        } catch (error) {
            console.error('ロール位置変更エラー:', error);
            alert('ロールの位置変更に失敗しました: ' + error.message);
        }
    };

    const getMemberRoles = (member) => {
        if (!member.roles || !Array.isArray(member.roles)) return [];
        return member.roles.map(roleId => {
            const role = roles.find(r => r.id === roleId);
            return role ? { ...role, id: roleId } : null;
        }).filter(Boolean);
    };

    const handleMemberRoleChange = async (memberId, roleId, addRole) => {
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
                width: '900px',
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
                        ロール管理 - {server?.name}
                    </h2>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => setShowCreateRole(true)}
                            style={{
                                backgroundColor: '#5865f2',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            新しいロール
                        </button>
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
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* ロール一覧 */}
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '16px' }}>
                        <h3 style={{ color: '#ffffff', marginBottom: '12px' }}>ロール一覧</h3>
                        {roles.map(role => (
                            <div key={role.id} style={{
                                backgroundColor: '#2f3136',
                                borderRadius: '4px',
                                padding: '16px',
                                marginBottom: '12px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            backgroundColor: role.color,
                                            borderRadius: '50%'
                                        }} />
                                        <span style={{
                                            color: '#ffffff',
                                            fontSize: '16px',
                                            fontWeight: '600'
                                        }}>
                                            {role.name}
                                            {role.isDefault && (
                                                <span style={{
                                                    color: '#b9bbbe',
                                                    fontSize: '12px',
                                                    marginLeft: '8px'
                                                }}>
                                                    (デフォルト)
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleRolePositionChange(role.id, 'up')}
                                            disabled={role.position >= Math.max(...roles.map(r => r.position))}
                                            style={{
                                                backgroundColor: '#40444b',
                                                color: '#dcddde',
                                                border: 'none',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                opacity: role.position >= Math.max(...roles.map(r => r.position)) ? 0.5 : 1
                                            }}
                                        >
                                            ▲
                                        </button>
                                        <button
                                            onClick={() => handleRolePositionChange(role.id, 'down')}
                                            disabled={role.position <= Math.min(...roles.map(r => r.position))}
                                            style={{
                                                backgroundColor: '#40444b',
                                                color: '#dcddde',
                                                border: 'none',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                opacity: role.position <= Math.min(...roles.map(r => r.position)) ? 0.5 : 1
                                            }}
                                        >
                                            ▼
                                        </button>
                                        {role.canBeDeleted && (
                                            <>
                                                <button
                                                    onClick={() => setEditingRole(role)}
                                                    style={{
                                                        backgroundColor: '#40444b',
                                                        color: '#dcddde',
                                                        border: 'none',
                                                        padding: '6px 12px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    編集
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRole(role.id, role.canBeDeleted)}
                                                    style={{
                                                        backgroundColor: '#ed4245',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '6px 12px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    削除
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '6px'
                                }}>
                                    {role.permissions?.map(permission => (
                                        <span
                                            key={permission}
                                            style={{
                                                backgroundColor: '#5865f2',
                                                color: 'white',
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '12px'
                                            }}
                                        >
                                            {getPermissionLabel(permission)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* メンバー一覧 */}
                    <div style={{ flex: 1, overflowY: 'auto', paddingLeft: '16px', borderLeft: '1px solid #40444b' }}>
                        <h3 style={{ color: '#ffffff', marginBottom: '12px' }}>メンバー</h3>
                        {members.map(member => (
                            <div key={member.id} style={{
                                backgroundColor: '#2f3136',
                                borderRadius: '4px',
                                padding: '12px',
                                marginBottom: '8px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '8px'
                                }}>
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
                                            {(member.displayName || "匿").charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{
                                                color: '#ffffff',
                                                fontSize: '14px',
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
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div style={{
                                        color: '#b9bbbe',
                                        fontSize: '12px',
                                        marginBottom: '4px'
                                    }}>
                                        ロール:
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '4px'
                                    }}>
                                        {getMemberRoles(member).map(role => (
                                            <div key={role.id} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                <div style={{
                                                    width: '12px',
                                                    height: '12px',
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
                                                        onClick={() => handleMemberRoleChange(member.id, role.id, false)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#ed4245',
                                                            cursor: 'pointer',
                                                            fontSize: '10px',
                                                            padding: '0'
                                                        }}
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* ロール追加ドロップダウン */}
                                    <div style={{ marginTop: '8px' }}>
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleMemberRoleChange(member.id, e.target.value, true);
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
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 新規ロール作成モーダル */}
                {showCreateRole && (
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
                        zIndex: 1100
                    }}>
                        <div style={{
                            backgroundColor: '#36393f',
                            borderRadius: '8px',
                            padding: '24px',
                            width: '600px',
                            maxWidth: '90vw',
                            maxHeight: '80vh',
                            overflow: 'auto'
                        }}>
                            <h3 style={{ color: '#ffffff', marginBottom: '16px' }}>新しいロール</h3>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ color: '#b9bbbe', fontSize: '14px', marginBottom: '4px', display: 'block' }}>
                                    ロール名
                                </label>
                                <input
                                    type="text"
                                    value={newRole.name}
                                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: '#40444b',
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: '#dcddde',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ color: '#b9bbbe', fontSize: '14px', marginBottom: '4px', display: 'block' }}>
                                    色
                                </label>
                                <input
                                    type="color"
                                    value={newRole.color}
                                    onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                                    style={{
                                        width: '50px',
                                        height: '30px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ color: '#b9bbbe', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                                    権限
                                </label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                    gap: '8px'
                                }}>
                                    {Object.entries(permissionCategories).map(([category, permissions]) => (
                                        <div key={category}>
                                            <div style={{
                                                color: '#ffffff',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                marginBottom: '8px',
                                                marginTop: '12px'
                                            }}>
                                                {category}
                                            </div>
                                            {permissions.map(permission => (
                                                <label
                                                    key={permission.key}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        color: '#dcddde',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        marginBottom: '4px'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={newRole.permissions.includes(permission.key)}
                                                        onChange={() => togglePermission(permission.key)}
                                                    />
                                                    <div>
                                                        <div>{permission.label}</div>
                                                        <div style={{ fontSize: '10px', color: '#b9bbbe' }}>
                                                            {permission.description}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px'
                            }}>
                                <button
                                    onClick={() => setShowCreateRole(false)}
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
                                    onClick={handleCreateRole}
                                    style={{
                                        backgroundColor: '#5865f2',
                                        border: 'none',
                                        color: 'white',
                                        padding: '10px 16px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    作成
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ロール編集モーダル */}
                {editingRole && (
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
                        zIndex: 1100
                    }}>
                        <div style={{
                            backgroundColor: '#36393f',
                            borderRadius: '8px',
                            padding: '24px',
                            width: '600px',
                            maxWidth: '90vw',
                            maxHeight: '80vh',
                            overflow: 'auto'
                        }}>
                            <h3 style={{ color: '#ffffff', marginBottom: '16px' }}>ロール編集</h3>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ color: '#b9bbbe', fontSize: '14px', marginBottom: '4px', display: 'block' }}>
                                    ロール名
                                </label>
                                <input
                                    type="text"
                                    value={editingRole.name}
                                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: '#40444b',
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: '#dcddde',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ color: '#b9bbbe', fontSize: '14px', marginBottom: '4px', display: 'block' }}>
                                    色
                                </label>
                                <input
                                    type="color"
                                    value={editingRole.color}
                                    onChange={(e) => setEditingRole({ ...editingRole, color: e.target.value })}
                                    style={{
                                        width: '50px',
                                        height: '30px',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ color: '#b9bbbe', fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                                    権限
                                </label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                    gap: '8px'
                                }}>
                                    {Object.entries(permissionCategories).map(([category, permissions]) => (
                                        <div key={category}>
                                            <div style={{
                                                color: '#ffffff',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                marginBottom: '8px',
                                                marginTop: '12px'
                                            }}>
                                                {category}
                                            </div>
                                            {permissions.map(permission => (
                                                <label
                                                    key={permission.key}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        color: '#dcddde',
                                                        fontSize: '12px',
                                                        cursor: 'pointer',
                                                        marginBottom: '4px'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={editingRole.permissions?.includes(permission.key) || false}
                                                        onChange={() => togglePermission(permission.key, true)}
                                                    />
                                                    <div>
                                                        <div>{permission.label}</div>
                                                        <div style={{ fontSize: '10px', color: '#b9bbbe' }}>
                                                            {permission.description}
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px'
                            }}>
                                <button
                                    onClick={() => setEditingRole(null)}
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
                                    onClick={() => handleUpdateRole(editingRole.id, editingRole)}
                                    style={{
                                        backgroundColor: '#5865f2',
                                        border: 'none',
                                        color: 'white',
                                        padding: '10px 16px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    保存
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}