import { useState, useEffect } from 'react';
import { 
    getServerRoles, 
    createServerRole, 
    updateServerRole, 
    deleteServerRole, 
    DEFAULT_PERMISSIONS 
} from '../lib/firestore';

export default function RoleManager({ server, currentUser, onClose }) {
    const [roles, setRoles] = useState([]);
    const [showCreateRole, setShowCreateRole] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
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

        const unsubscribe = getServerRoles(server.id, (snapshot) => {
            const roleList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRoles(roleList.sort((a, b) => b.position - a.position));
        });

        return () => unsubscribe();
    }, [server]);

    const handleCreateRole = async () => {
        if (!newRole.name.trim()) return;

        try {
            await createServerRole(server.id, {
                ...newRole,
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
            alert('ロール作成に失敗しました');
        }
    };

    const handleUpdateRole = async (roleId, updatedData) => {
        try {
            await updateServerRole(roleId, updatedData);
            setEditingRole(null);
        } catch (error) {
            console.error('ロール更新エラー:', error);
            alert('ロール更新に失敗しました');
        }
    };

    const handleDeleteRole = async (roleId, canBeDeleted) => {
        if (!canBeDeleted) {
            alert('このロールは削除できません');
            return;
        }

        if (confirm('このロールを削除しますか？')) {
            try {
                await deleteServerRole(roleId);
            } catch (error) {
                console.error('ロール削除エラー:', error);
                alert('ロール削除に失敗しました');
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
                width: '800px',
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

                <div style={{ flex: 1, overflowY: 'auto' }}>
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
                                    </span>
                                </div>

                                {role.canBeDeleted && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
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
                                    </div>
                                )}
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
                                    {Object.values(DEFAULT_PERMISSIONS).map(permission => (
                                        <label
                                            key={permission}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                color: '#dcddde',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={newRole.permissions.includes(permission)}
                                                onChange={() => togglePermission(permission)}
                                            />
                                            {getPermissionLabel(permission)}
                                        </label>
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
                                    {Object.values(DEFAULT_PERMISSIONS).map(permission => (
                                        <label
                                            key={permission}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                color: '#dcddde',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={editingRole.permissions?.includes(permission) || false}
                                                onChange={() => togglePermission(permission, true)}
                                            />
                                            {getPermissionLabel(permission)}
                                        </label>
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