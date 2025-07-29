
import { useState } from 'react';

export default function ChannelSidebar({ 
    server, 
    channels, 
    currentChannel, 
    onChannelSelect, 
    onCreateChannel,
    user 
}) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [channelName, setChannelName] = useState('');
    const [channelType, setChannelType] = useState('text');

    const handleCreateChannel = () => {
        if (!channelName.trim()) return;
        onCreateChannel({
            name: channelName.trim(),
            type: channelType,
            serverId: server.id
        });
        setChannelName('');
        setShowCreateModal(false);
    };

    const textChannels = channels.filter(ch => ch.type === 'text');
    const voiceChannels = channels.filter(ch => ch.type === 'voice');

    return (
        <div style={{
            width: '240px',
            backgroundColor: '#2f3136',
            display: 'flex',
            flexDirection: 'column'
        }}>
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
                {server.name}
                <span style={{ fontSize: '18px' }}>⌄</span>
            </div>

            {/* チャンネルリスト */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 8px' }}>
                {/* テキストチャンネル */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 8px',
                        marginBottom: '8px'
                    }}>
                        <span style={{
                            color: '#8e9297',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em'
                        }}>
                            テキストチャンネル
                        </span>
                        <button
                            onClick={() => {
                                setChannelType('text');
                                setShowCreateModal(true);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#b9bbbe',
                                fontSize: '18px',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px'
                            }}
                        >
                            +
                        </button>
                    </div>
                    {textChannels.map(channel => (
                        <div
                            key={channel.id}
                            onClick={() => onChannelSelect(channel)}
                            style={{
                                padding: '6px 8px',
                                margin: '1px 0',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: currentChannel?.id === channel.id ? '#393c43' : 'transparent',
                                color: currentChannel?.id === channel.id ? '#dcddde' : '#8e9297'
                            }}
                            onMouseOver={(e) => {
                                if (currentChannel?.id !== channel.id) {
                                    e.target.style.backgroundColor = '#34373c';
                                    e.target.style.color = '#dcddde';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (currentChannel?.id !== channel.id) {
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

                {/* ボイスチャンネル */}
                <div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 8px',
                        marginBottom: '8px'
                    }}>
                        <span style={{
                            color: '#8e9297',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em'
                        }}>
                            ボイスチャンネル
                        </span>
                        <button
                            onClick={() => {
                                setChannelType('voice');
                                setShowCreateModal(true);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#b9bbbe',
                                fontSize: '18px',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px'
                            }}
                        >
                            +
                        </button>
                    </div>
                    {voiceChannels.map(channel => (
                        <div
                            key={channel.id}
                            onClick={() => onChannelSelect(channel)}
                            style={{
                                padding: '6px 8px',
                                margin: '1px 0',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: currentChannel?.id === channel.id ? '#393c43' : 'transparent',
                                color: currentChannel?.id === channel.id ? '#dcddde' : '#8e9297'
                            }}
                        >
                            <span style={{ fontSize: '16px' }}>🔊</span>
                            <span style={{ fontSize: '16px' }}>{channel.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ユーザー情報 */}
            <div style={{
                padding: '8px',
                backgroundColor: '#292b2f',
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
                    {user?.displayName?.charAt(0) || '?'}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{
                        color: '#dcddde',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}>
                        {user?.displayName || '匿名'}
                    </div>
                    <div style={{
                        color: '#b9bbbe',
                        fontSize: '12px'
                    }}>
                        オンライン
                    </div>
                </div>
            </div>

            {/* チャンネル作成モーダル */}
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
                            margin: '0 0 24px 0'
                        }}>
                            {channelType === 'text' ? 'テキスト' : 'ボイス'}チャンネルを作成
                        </h2>

                        <label style={{
                            display: 'block',
                            color: '#b9bbbe',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            marginBottom: '8px',
                            letterSpacing: '0.02em'
                        }}>
                            チャンネル名
                        </label>
                        <input
                            type="text"
                            value={channelName}
                            onChange={(e) => setChannelName(e.target.value)}
                            placeholder={`${channelType === 'text' ? '#' : '🔊'} チャンネル名`}
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
                                if (e.key === 'Enter') handleCreateChannel();
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
                                onClick={handleCreateChannel}
                                disabled={!channelName.trim()}
                                style={{
                                    padding: '12px 16px',
                                    backgroundColor: channelName.trim() ? '#5865f2' : '#4f545c',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: channelName.trim() ? 'pointer' : 'not-allowed',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                            >
                                チャンネルを作成
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
