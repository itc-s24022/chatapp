import { useState } from 'react';
import ImageUploader from './ImageUploader';
import { leaveServer, deleteServer } from '../lib/firestore';

export default function ServerSidebar({
                                          servers,
                                          currentServer,
                                          onServerSelect,
                                          onCreateServer,
                                          onDeleteServer,
                                          onUpdateServerIcon,
                                          currentUser
                                      }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [serverName, setServerName] = useState('');
    const [showServerMenu, setShowServerMenu] = useState(null);
    const [showImageUploader, setShowImageUploader] = useState(null);


    const handleCreateServer = async () => {
        if (!serverName.trim()) return;
      
        await onCreateServer(serverName.trim());
        setServerName('');
        setShowCreateModal(false);
    };

    return (
        <div style={{
            width: '72px',
            backgroundColor: '#202225',
            padding: '12px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRight: '1px solid #36393f',
            position: 'relative'
        }}>
            {/* DM (ホーム) ボタン */}
            <div
                onClick={() => onServerSelect('dm')}
                style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: currentServer === 'dm' ? '#5865f2' : '#36393f',
                    borderRadius: currentServer === 'dm' ? '16px' : '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: 'white',
                    fontSize: '24px',
                    border: currentServer === 'dm' ? '2px solid #ffffff' : 'none',
                    position: 'relative'
                }}
                onMouseOver={(e) => {
                    if (currentServer !== 'dm') {
                        e.target.style.backgroundColor = '#5865f2';
                        e.target.style.borderRadius = '16px';
                    }
                }}
                onMouseOut={(e) => {
                    if (currentServer !== 'dm') {
                        e.target.style.backgroundColor = '#36393f';
                        e.target.style.borderRadius = '24px';
                    }
                }}
                title="ダイレクトメッセージ"
            >
                💬
            </div>

            {/* 区切り線 */}
            <div style={{
                width: '32px',
                height: '2px',
                backgroundColor: '#36393f',
                marginBottom: '8px',
                borderRadius: '1px'
            }} />

            {/* サーバー一覧 */}
            {servers.map((server) => (
                <div key={server.id} style={{ position: 'relative', marginBottom: '8px' }}>
                    <div
                        onClick={() => onServerSelect(server.id)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setShowServerMenu(showServerMenu === server.id ? null : server.id);
                        }}
                        style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: currentServer === server.id ? '#5865f2' : '#36393f',
                            borderRadius: currentServer === server.id ? '16px' : '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            color: 'white',
                            fontSize: '16px',
                            fontWeight: '600',
                            border: currentServer === server.id ? '2px solid #ffffff' : 'none',
                            overflow: 'hidden',
                            position: 'relative',
                            backgroundImage: (server.icon || server.iconUrl) ? `url(${server.icon || server.iconUrl})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                        onMouseOver={(e) => {
                            if (currentServer !== server.id) {
                                e.target.style.backgroundColor = '#5865f2';
                                e.target.style.borderRadius = '16px';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (currentServer !== server.id) {
                                e.target.style.backgroundColor = '#36393f';
                                e.target.style.borderRadius = '24px';
                            }
                        }}
                        title={server.name}
                    >
                        {/* サーバー名の最初の文字を表示（アイコンがない場合） */}
                        {!(server.icon || server.iconUrl) && server.name.charAt(0).toUpperCase()}

                        {/* アクティブインジケーター */}
                        {currentServer === server.id && (
                            <div style={{
                                position: 'absolute',
                                left: '-8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '4px',
                                height: '40px',
                                backgroundColor: '#ffffff',
                                borderRadius: '0 2px 2px 0'
                            }} />
                        )}
                    </div>

                    {/* サーバーメニュー */}
                    {showServerMenu === server.id && (
                        <div style={{
                            position: 'absolute',
                            left: '60px',
                            top: '0px',
                            backgroundColor: '#18191c',
                            borderRadius: '4px',
                            padding: '8px 0',
                            minWidth: '150px',
                            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.24)',
                            zIndex: 1000,
                            border: '1px solid #40444b'
                        }}>
                            <button
                                onClick={() => {
                                    setShowImageUploader(server.id);
                                    setShowServerMenu(null);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#dcddde',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#40444b'}
                                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                アイコン変更
                            </button>

                            {/* サーバー削除（オーナーのみ） */}
                            {server.ownerId === currentUser?.uid && onDeleteServer && (
                                <button
                                    onClick={() => {
                                        if (window.confirm(`サーバー "${server.name}" を削除しますか？この操作は取り消せません。`)) {
                                            onDeleteServer(server.id);
                                        }

                                        setShowServerMenu(null);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#dcddde',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                    onMouseOver={(e) => e.target.style.backgroundColor = '#40444b'}
                                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                    アイコン変更
                                </button>
                                {/* サーバー削除（オーナーのみ） */}
                                {server.ownerId === currentUser?.uid && onDeleteServer && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`サーバー "${server.name}" を削除しますか？この操作は取り消せません。`)) {
                                                onDeleteServer(server.id);
                                            }
                                            setShowServerMenu(null);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: '#ed4245',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                        onMouseOver={(e) => e.target.style.backgroundColor = '#40444b'}
                                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                        サーバー削除
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))
            )}

            {/* サーバー追加ボタン */}
            <div
                onClick={() => setShowCreateModal(true)}
                style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#36393f',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    color: '#3ba55c',
                    fontSize: '24px',
                    border: '2px dashed #3ba55c'
                }}
                onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#3ba55c';
                    e.target.style.color = '#ffffff';
                    e.target.style.borderRadius = '16px';
                    e.target.style.border = '2px solid #3ba55c';
                }}
                onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#36393f';
                    e.target.style.color = '#3ba55c';
                    e.target.style.borderRadius = '24px';
                    e.target.style.border = '2px dashed #3ba55c';
                }}
                title="サーバーを追加"
            >
                ➕
            </div>

            {/* サーバー作成モーダル */}
            {showCreateModal && (
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
                        width: '440px',
                        maxWidth: '90vw'
                    }}>
                        <h2 style={{
                            color: '#ffffff',
                            fontSize: '24px',
                            fontWeight: '600',
                            margin: '0 0 8px 0'
                        }}>
                            サーバーを作成
                        </h2>
                        <p style={{
                            color: '#b9bbbe',
                            fontSize: '16px',
                            margin: '0 0 20px 0'
                        }}>
                            サーバーとは、友達と集まるスペースです。自分のサーバーを作って、話し始めましょう。
                        </p>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                color: '#b9bbbe',
                                fontSize: '12px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                display: 'block',
                                marginBottom: '8px'
                            }}>
                                サーバー名
                            </label>
                            <input
                                type="text"
                                value={serverName}
                                onChange={(e) => setServerName(e.target.value)}
                                placeholder="サーバー名を入力"
                                maxLength={50}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: '#202225',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: '#dcddde',
                                    fontSize: '16px',
                                    marginBottom: '16px',
                                    boxSizing: 'border-box',
                                    outline: 'none'
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCreateServer();
                                    }
                                }}
                                autoFocus
                            />
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '12px'
                        }}>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setServerName('');
                                }}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#ffffff',
                                    padding: '12px 16px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleCreateServer}
                                disabled={!serverName.trim()}
                                style={{
                                    backgroundColor: serverName.trim() ? '#5865f2' : '#4f545c',
                                    border: 'none',
                                    color: 'white',
                                    padding: '12px 16px',
                                    borderRadius: '4px',
                                    cursor: serverName.trim() ? 'pointer' : 'not-allowed',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                作成
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* アイコンアップローダー */}
            {showImageUploader && onUpdateServerIcon && (
                <ImageUploader
                    onUpload={(uploadedImage) => {
                        onUpdateServerIcon(showImageUploader, uploadedImage.id);
                        setShowImageUploader(null);
                    }}
                    onClose={() => setShowImageUploader(null)}
                />
            )}

            {/* メニュー外クリックで閉じる */}
            {showServerMenu && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999
                    }}
                    onClick={() => setShowServerMenu(null)}
                />
            )}
        </div>
    );
}