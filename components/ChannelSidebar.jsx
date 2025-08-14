// components/ChannelSidebar.jsx
import { useState } from 'react';
export default function ChannelSidebar({
                                           server,
                                           channels,
                                           currentChannel,
                                           onChannelSelect,
                                           onCreateChannel,
                                           user,
                                           voiceParticipants = [],
                                           speakingUsers = new Set(),
                                           isMuted = false
                                       }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [channelName, setChannelName] = useState('');
    const [channelType, setChannelType] = useState('text');

    const handleCreateChannel = () => {
        // 安全に文字列を取得
        const name = channelName ? channelName.trim() : '';
        if (!name) {
            alert('チャンネル名を入力してください');
            return;
        }

        onCreateChannel({
            name: name,
            type: channelType,
            serverId: server.id
        });
        setChannelName('');
        setShowCreateModal(false);
    };

    const textChannels = channels.filter(ch => ch.type === 'text' || !ch.type);
    const voiceChannels = channels.filter(ch => ch.type === 'voice');

    if (server?.id === 'dm') {
        return (
            <div style={{
                width: '240px',
                backgroundColor: '#2f3136',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #202225',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '16px'
                }}>
                    ダイレクトメッセージ
                </div>

                <div style={{ padding: '16px', flex: 1 }}>
                    <p style={{ color: '#b9bbbe', fontSize: '14px' }}>
                        フレンド機能は開発中です...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            width: '240px',
            backgroundColor: '#2f3136',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>

            {/* サーバー名ヘッダー */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #202225',
                color: 'white',
                fontWeight: '600',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
            }}>
                {server?.name || 'サーバー'}
                <span style={{ fontSize: '18px' }}>⌄</span>
            </div>

            {/* チャンネルリスト */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* テキストチャンネルセクション */}
                <div style={{ margin: '16px 0 8px 0' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 8px 0 16px',
                        color: '#8e9297',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        cursor: 'pointer'
                    }}>
                        <span>テキストチャンネル</span>
                        <button
                            onClick={() => {
                                setChannelType('text');
                                setShowCreateModal(true);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#8e9297',
                                cursor: 'pointer',
                                fontSize: '18px',
                                padding: '4px',
                                borderRadius: '4px'
                            }}
                            onMouseOver={(e) => e.target.style.color = '#dcddde'}
                            onMouseOut={(e) => e.target.style.color = '#8e9297'}
                        >
                            +
                        </button>
                    </div>

                    {textChannels.map(channel => (
                        <div
                            key={channel.id}
                            onClick={() => onChannelSelect(channel.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 8px 6px 16px',
                                margin: '1px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: currentChannel === channel.id ? '#5865f2' : 'transparent',
                                color: currentChannel === channel.id ? '#ffffff' : '#8e9297',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => {
                                if (currentChannel !== channel.id) {
                                    e.target.style.backgroundColor = '#40444b';
                                    e.target.style.color = '#dcddde';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (currentChannel !== channel.id) {
                                    e.target.style.backgroundColor = 'transparent';
                                    e.target.style.color = '#8e9297';
                                }
                            }}
                        >
                            <span style={{ fontSize: '20px' }}>#</span>
                            <span style={{ fontSize: '16px' }}>{channel.name}</span>
                        </div>
                    ))}
                </div>

                {/* ボイスチャンネルセクション */}
                <div style={{ margin: '24px 0 8px 0' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 8px 0 16px',
                        color: '#8e9297',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        cursor: 'pointer'
                    }}>
                        <span>ボイスチャンネル</span>
                        <button
                            onClick={() => {
                                setChannelType('voice');
                                setShowCreateModal(true);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#8e9297',
                                cursor: 'pointer',
                                fontSize: '18px',
                                padding: '4px',
                                borderRadius: '4px'
                            }}
                            onMouseOver={(e) => e.target.style.color = '#dcddde'}
                            onMouseOut={(e) => e.target.style.color = '#8e9297'}
                        >
                            +
                        </button>
                    </div>

                    {voiceChannels.map(channel => {
                        const channelParticipants = voiceParticipants.filter(p => p.channelId === channel.id);
                        const isActiveChannel = currentChannel === channel.id;

                        return (
                            <div key={channel.id}>
                                <div
                                    onClick={() => onChannelSelect(channel.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '6px 8px 6px 16px',
                                        margin: '1px 8px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        backgroundColor: isActiveChannel ? '#5865f2' : 'transparent',
                                        color: isActiveChannel ? '#ffffff' : '#8e9297',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseOver={(e) => {
                                        if (!isActiveChannel) {
                                            e.target.style.backgroundColor = '#40444b';
                                            e.target.style.color = '#dcddde';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!isActiveChannel) {
                                            e.target.style.backgroundColor = 'transparent';
                                            e.target.style.color = '#8e9297';
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '20px' }}>🔊</span>
                                        <span style={{ fontSize: '16px' }}>{channel.name}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '14px', cursor: 'pointer' }}>💬</span>
                                        <span style={{ fontSize: '14px', cursor: 'pointer' }}>👥</span>
                                        <span style={{ fontSize: '14px', cursor: 'pointer' }}>⚙️</span>
                                    </div>
                                </div>

                                {/* 参加者リスト */}
                                {channelParticipants.length > 0 && (
                                    <div style={{
                                        padding: '0 16px 8px 32px'
                                    }}>
                                        {channelParticipants.map(participant => {
                                            // 安全に名前を取得
                                            const name = participant.userName || '匿名';
                                            const initial = name && typeof name === 'string' ? name.charAt(0).toUpperCase() : '?';

                                            return (
                                                <div
                                                    key={participant.userId}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.15s ease'
                                                    }}
                                                    onMouseOver={(e) => e.target.style.backgroundColor = '#40444b'}
                                                    onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                                                    title={name}
                                                >
                                                    <div style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        backgroundColor: participant.userId === user?.uid ? '#5865f2' : '#43b581',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontSize: '10px',
                                                        fontWeight: '600'
                                                    }}>
                                                        {initial}
                                                    </div>
                                                    <span style={{
                                                        color: '#8e9297',
                                                        fontSize: '14px',
                                                        flex: 1
                                                    }}>
                                                        {name}
                                                    </span>
                                                    <span style={{
                                                        color: '#8e9297',
                                                        fontSize: '12px'
                                                    }}>
                                                        {participant.userId === user?.uid ? (isMuted ? '🔇' : '🎤') : '🔇'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

            </div>

            {/* ユーザー情報エリア */}
            {user && (
                <div style={{
                    backgroundColor: '#232428',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#5865f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}>
                        {(user.displayName || "匿").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {user.displayName || "匿名"}
                        </div>
                        <div style={{
                            color: '#b9bbbe',
                            fontSize: '12px'
                        }}>
                            オンライン
                        </div>
                    </div>
                </div>
            )}

            {/* チャンネル作成モーダル */}
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
                            margin: '0 0 20px 0'
                        }}>
                            チャンネルを作成
                        </h2>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                color: '#b9bbbe',
                                fontSize: '12px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                display: 'block',
                                marginBottom: '8px'
                            }}>
                                チャンネルタイプ
                            </label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: '#dcddde',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="radio"
                                        value="text"
                                        checked={channelType === 'text'}
                                        onChange={(e) => setChannelType(e.target.value)}
                                    />
                                    # テキスト
                                </label>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: '#dcddde',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="radio"
                                        value="voice"
                                        checked={channelType === 'voice'}
                                        onChange={(e) => setChannelType(e.target.value)}
                                    />
                                    🔊 ボイス
                                </label>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                color: '#b9bbbe',
                                fontSize: '12px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                display: 'block',
                                marginBottom: '8px'
                            }}>
                                チャンネル名
                            </label>
                            <input
                                type="text"
                                value={channelName}
                                onChange={(e) => setChannelName(e.target)}
                                placeholder="新しいチャンネル"
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    backgroundColor: '#202225',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: '#dcddde',
                                    fontSize: '16px',
                                    outline: 'none'
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCreateChannel();
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
                                    setChannelName('');
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
                                onClick={handleCreateChannel}
                                disabled={!channelName.trim()}
                                style={{
                                    backgroundColor: channelName.trim() ? '#5865f2' : '#4f545c',
                                    border: 'none',
                                    color: 'white',
                                    padding: '12px 16px',
                                    borderRadius: '4px',
                                    cursor: channelName.trim() ? 'pointer' : 'not-allowed',
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