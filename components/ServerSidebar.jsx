
import { useState } from 'react';

export default function ServerSidebar({ servers, currentServer, onServerSelect, onCreateServer }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [serverName, setServerName] = useState('');

    const handleCreateServer = () => {
        if (!serverName.trim()) return;
        onCreateServer(serverName.trim());
        setServerName('');
        setShowCreateModal(false);
    };

    return (
        <div style={{
            width: '72px',
            backgroundColor: '#202225',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 0',
            gap: '8px'
        }}>
            {/* ダイレクトメッセージ */}
            <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: currentServer === 'dm' ? '#5865f2' : '#36393f',
                borderRadius: currentServer === 'dm' ? '16px' : '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                color: 'white',
                fontSize: '20px'
            }}
            onClick={() => onServerSelect('dm')}
            onMouseOver={(e) => {
                if (currentServer !== 'dm') {
                    e.target.style.borderRadius = '16px';
                    e.target.style.backgroundColor = '#5865f2';
                }
            }}
            onMouseOut={(e) => {
                if (currentServer !== 'dm') {
                    e.target.style.borderRadius = '24px';
                    e.target.style.backgroundColor = '#36393f';
                }
            }}>
                📱
            </div>

            {/* 区切り線 */}
            <div style={{
                width: '32px',
                height: '2px',
                backgroundColor: '#36393f',
                borderRadius: '1px',
                margin: '4px 0'
            }} />

            {/* サーバーリスト */}
            {servers.map(server => (
                <div key={server.id} style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: currentServer === server.id ? '#5865f2' : '#36393f',
                    borderRadius: currentServer === server.id ? '16px' : '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600'
                }}
                onClick={() => onServerSelect(server.id)}
                onMouseOver={(e) => {
                    if (currentServer !== server.id) {
                        e.target.style.borderRadius = '16px';
                        e.target.style.backgroundColor = '#5865f2';
                    }
                }}
                onMouseOut={(e) => {
                    if (currentServer !== server.id) {
                        e.target.style.borderRadius = '24px';
                        e.target.style.backgroundColor = '#36393f';
                    }
                }}>
                    {server.name.charAt(0).toUpperCase()}
                </div>
            ))}

            {/* サーバー追加ボタン */}
            <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#36393f',
                borderRadius: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                color: '#3ba55c',
                fontSize: '24px'
            }}
            onClick={() => setShowCreateModal(true)}
            onMouseOver={(e) => {
                e.target.style.borderRadius = '16px';
                e.target.style.backgroundColor = '#3ba55c';
                e.target.style.color = 'white';
            }}
            onMouseOut={(e) => {
                e.target.style.borderRadius = '24px';
                e.target.style.backgroundColor = '#36393f';
                e.target.style.color = '#3ba55c';
            }}>
                +
            </div>

            {/* サーバー作成モーダル */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#36393f',
                        padding: '32px',
                        borderRadius: '8px',
                        width: '440px',
                        maxWidth: '90vw'
                    }}>
                        <h2 style={{
                            color: 'white',
                            fontSize: '24px',
                            fontWeight: '600',
                            margin: '0 0 8px 0',
                            textAlign: 'center'
                        }}>
                            サーバーを作成
                        </h2>
                        <p style={{
                            color: '#b9bbbe',
                            fontSize: '16px',
                            textAlign: 'center',
                            margin: '0 0 24px 0'
                        }}>
                            あなたのサーバーは、あなたとお友達がたむろする場所です。作って、話し始めましょう。
                        </p>

                        <label style={{
                            display: 'block',
                            color: '#b9bbbe',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            marginBottom: '8px',
                            letterSpacing: '0.02em'
                        }}>
                            サーバー名
                        </label>
                        <input
                            type="text"
                            value={serverName}
                            onChange={(e) => setServerName(e.target.value)}
                            placeholder="サーバー名を入力"
                            style={{
                                width: '100%',
                                backgroundColor: '#202225',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '12px',
                                color: '#dcddde',
                                fontSize: '16px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                marginBottom: '24px'
                            }}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') handleCreateServer();
                            }}
                        />

                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{
                                    padding: '12px 16px',
                                    backgroundColor: 'transparent',
                                    color: '#b9bbbe',
                                    border: 'none',
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
                                    padding: '12px 16px',
                                    backgroundColor: serverName.trim() ? '#5865f2' : '#4f545c',
                                    color: 'white',
                                    border: 'none',
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
        </div>
    );
}
