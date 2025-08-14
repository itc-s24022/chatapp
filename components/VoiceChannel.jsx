// components/VoiceChannel.jsx
import { useState, useEffect, useRef } from 'react';
import { Device } from 'mediasoup-client';
import io from 'socket.io-client';

// メディアストリーム管理クラス
class MediaStreamManager {
    constructor() {
        this.localStream = null;
        this.screenStream = null;
        this.audioContext = null;
        this.analyser = null;
    }

    async getLocalStream(options = { audio: true, video: false }) {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        this.localStream = await navigator.mediaDevices.getUserMedia(options);
        return this.localStream;
    }

    async getScreenStream(options = { video: true, audio: false }) {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
        }
        this.screenStream = await navigator.mediaDevices.getDisplayMedia(options);
        return this.screenStream;
    }

    setupAudioLevelDetection(stream) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        const source = this.audioContext.createMediaStreamSource(stream);
        source.connect(this.analyser);
        return this.analyser;
    }

    cleanup() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// 動的なビデオグリッドレイアウトコンポーネント
const VideoGrid = ({ participants }) => {
    const videoContainerRef = useRef(null);

    useEffect(() => {
        const updateLayout = () => {
            if (!videoContainerRef.current) return;
            const container = videoContainerRef.current;
            const participantCount = participants.length;
            let columns, rows;

            if (participantCount <= 1) {
                columns = 1;
                rows = 1;
            } else if (participantCount <= 4) {
                columns = 2;
                rows = 2;
            } else if (participantCount <= 9) {
                columns = 3;
                rows = 3;
            } else {
                columns = 4;
                rows = Math.ceil(participantCount / columns);
            }

            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const aspectRatio = 16 / 9;
            let videoWidth, videoHeight;

            if (containerWidth / containerHeight > columns / rows * aspectRatio) {
                videoHeight = containerHeight / rows;
                videoWidth = videoHeight * aspectRatio;
            } else {
                videoWidth = containerWidth / columns;
                videoHeight = videoWidth / aspectRatio;
            }

            const videoElements = container.querySelectorAll('.video-participant');
            videoElements.forEach((element, index) => {
                element.style.width = `${videoWidth}px`;
                element.style.height = `${videoHeight}px`;
                element.style.position = 'absolute';
                element.style.left = `${(index % columns) * videoWidth}px`;
                element.style.top = `${Math.floor(index / columns) * videoHeight}px`;
            });
        };

        updateLayout();
        window.addEventListener('resize', updateLayout);
        return () => {
            window.removeEventListener('resize', updateLayout);
        };
    }, [participants]);

    return (
        <div
            ref={videoContainerRef}
            className="video-grid"
            style={{ position: 'relative', width: '100%', height: '100%' }}
        >
            {participants.map(participant => {
                const name = participant.name || '匿名';
                return (
                    <div key={participant.id} className="video-participant" style={{
                        position: 'absolute',
                        backgroundColor: '#2f3136',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: participant.isScreenSharing ? '2px solid #5865f2' : 'none'
                    }}>
                        {participant.stream ? (
                            <video
                                ref={participant.videoRef}
                                autoPlay
                                playsInline
                                muted={participant.isLocal}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#202225',
                                color: '#b9bbbe'
                            }}>
                                <div style={{
                                    width: '80px',
                                    height: '80px',
                                    borderRadius: '50%',
                                    backgroundColor: '#40444b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '32px',
                                    color: '#b9bbbe'
                                }}>
                                    {name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        )}
                        <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            left: '8px',
                            right: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <span>{name}</span>
                                {participant.isSpeaking && (
                                    <span style={{
                                        color: '#43b581',
                                        animation: 'pulse 1.5s infinite'
                                    }}>●</span>
                                )}
                                {participant.isMuted && (
                                    <span style={{ color: '#ed4245' }}>🔇</span>
                                )}
                                {participant.isScreenSharing && (
                                    <span style={{ color: '#5865f2' }}>🖥️</span>
                                )}
                            </div>
                        </div>
                        {participant.isScreenSharing && (
                            <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: '#5865f2',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                🖥️ 画面共有中
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default function VoiceChannel({
                                         channel,
                                         currentUser,
                                         isActive,
                                         onParticipantsUpdate,
                                         onSpeakingUsersUpdate,
                                         onMuteStateUpdate
                                     }) {
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [isConnecting, setIsConnecting] = useState(false);
    const [speakingUsers, setSpeakingUsers] = useState(new Set());
    const [audioLevel, setAudioLevel] = useState(0);
    const [screenShareType, setScreenShareType] = useState('tab');
    const [remoteStreams, setRemoteStreams] = useState({});
    const [screenSharingUsers, setScreenSharingUsers] = useState(new Set());

    const socketRef = useRef(null);
    const deviceRef = useRef(null);
    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const producerRef = useRef(null);
    const videoProducerRef = useRef(null);
    const screenProducerRef = useRef(null);
    const consumersRef = useRef({});
    const dataProducerRef = useRef(null);
    const localAudioRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);

    const [mediaStreamManager] = useState(() => new MediaStreamManager());

    useEffect(() => {
        console.log('VoiceChannel useEffect:', { isActive, channelId: channel?.id, channelType: channel?.type });
        if (!isActive || !channel || channel.type !== 'voice') {
            if (isConnected || isConnecting) {
                console.log('チャンネル非アクティブ - クリーンアップ実行');
                cleanupVoiceChannel();
            }
            return;
        }
        console.log('ボイスチャンネル初期化開始');
        initializeVoiceChannel();
        return () => {
            console.log('VoiceChannel useEffect cleanup');
            cleanupVoiceChannel();
        };
    }, [isActive, channel?.id, channel?.type]);

    // リモートオーディオ要素の監視
    useEffect(() => {
        if (remoteAudioRef.current) {
            const audioElement = remoteAudioRef.current;

            const handlePlay = () => {
                console.log(`▶️ オーディオ要素が再生を開始しました`);
            };

            const handlePause = () => {
                console.log(`⏸️ オーディオ要素が一時停止しました`);
            };

            const handleEnded = () => {
                console.log(`⏹️ オーディオ要素の再生が終了しました`);
            };

            const handleError = (e) => {
                console.error(`❌ オーディオ要素エラー: ${e.message}`, e);
            };

            audioElement.addEventListener('play', handlePlay);
            audioElement.addEventListener('pause', handlePause);
            audioElement.addEventListener('ended', handleEnded);
            audioElement.addEventListener('error', handleError);

            return () => {
                audioElement.removeEventListener('play', handlePlay);
                audioElement.removeEventListener('pause', handlePause);
                audioElement.removeEventListener('ended', handleEnded);
                audioElement.removeEventListener('error', handleError);
            };
        }
    }, []);

    // リモートストリームの監視
    useEffect(() => {
        console.log(`📊 リモートストリームの状態:`, Object.keys(remoteStreams));

        Object.entries(remoteStreams).forEach(([userId, stream]) => {
            console.log(`  - ユーザー ${userId}: ${stream.id}, トラック数: ${stream.getTracks().length}`);
            stream.getTracks().forEach(track => {
                console.log(`    - ${track.kind}: ${track.id}, 状態: ${track.readyState}, 有効: ${track.enabled}`);
            });
        });
    }, [remoteStreams]);

    // すべてのリモートストリームのオーディオトラックを監視
    useEffect(() => {
        const interval = setInterval(() => {
            Object.entries(remoteStreams).forEach(([userId, stream]) => {
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    audioTracks.forEach(track => {
                        console.log(`🎵 オーディオトラック状態: ${userId}, ${track.id}, 準備状態: ${track.readyState}, 有効: ${track.enabled}, ミュート: ${track.muted}`);
                    });
                }
            });
        }, 3000); // 3秒ごとに監視

        return () => clearInterval(interval);
    }, [remoteStreams]);

    const initializeVoiceChannel = async () => {
        try {
            setIsConnecting(true);

            // Socket.IO接続
            socketRef.current = io('http://localhost:3001', {
                transports: ['websocket'],
                upgrade: false,
                rememberUpgrade: false
            });

            // 接続が確立されたことを確認
            socketRef.current.on('connect', async () => {
                console.log('Socket.IO接続確立');

                try {
                    // mediasoupデバイスを作成
                    deviceRef.current = new Device();

                    // RTP capabilitiesを取得
                    const routerRtpCapabilities = await new Promise((resolve, reject) => {
                        socketRef.current.emit('getRouterRtpCapabilities', (data) => {
                            if (data.error) reject(new Error(data.error));
                            else resolve(data.rtpCapabilities);
                        });
                    });

                    // デバイスをロード
                    await deviceRef.current.load({ routerRtpCapabilities });

                    // MediaStreamManagerを使用してストリームを取得
                    const stream = await mediaStreamManager.getLocalStream({
                        audio: true,
                        video: false
                    });
                    localStreamRef.current = stream;

                    // ローカルオーディオ要素にストリームを設定
                    if (localAudioRef.current) {
                        localAudioRef.current.srcObject = stream;
                    }

                    // MediaStreamManagerを使用して音声レベル検出を初期化
                    const analyser = mediaStreamManager.setupAudioLevelDetection(stream);
                    analyserRef.current = analyser;

                    // 音声レベル検出を開始
                    startAudioLevelMonitoring();

                    // チャンネルに参加
                    socketRef.current.emit('join-voice-channel', {
                        channelId: channel.id,
                        userId: currentUser.uid,
                        userName: currentUser.displayName || '匿名'
                    });

                    // Socket.IOイベントリスナー設定
                    setupSocketListeners();

                    setIsConnected(true);
                    setIsConnecting(false);
                } catch (error) {
                    console.error('mediasoup初期化エラー:', error);
                    setIsConnecting(false);
                    alert('メディアデバイスの初期化に失敗しました。');
                }
            });

            socketRef.current.on('connect_error', (error) => {
                console.error('Socket.IO接続エラー:', error);
                setIsConnecting(false);
                alert('サーバーへの接続に失敗しました。後でもう一度お試しください。');
            });

        } catch (error) {
            console.error('ボイスチャンネル初期化エラー:', error);
            setIsConnecting(false);
            alert('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。');
        }
    };

    const setupSocketListeners = () => {
        const socket = socketRef.current;

        if (!socket) {
            console.error('Socket connection not established');
            return;
        }

        // 新しいユーザーが参加
        socket.on('user-joined-voice', (data) => {
            console.log('新しいユーザーが参加:', data);
            if (!data || typeof data !== 'object') {
                console.error('無効な参加者データ:', data);
                return;
            }
            const normalizedData = {
                userId: data.userId || 'unknown',
                userName: data.userName || '匿名'
            };
            setParticipants(prev => [...prev, normalizedData]);
        });

        // ユーザーが退出
        socket.on('user-left-voice', (data) => {
            console.log('ユーザーが退出:', data);
            setParticipants(prev => prev.filter(p => p.userId !== data.userId));

            // 画面共有リストから削除
            setScreenSharingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.userId);
                return newSet;
            });

            // コンシューマーをクリーンアップ
            if (consumersRef.current[data.userId]) {
                consumersRef.current[data.userId].forEach(consumer => {
                    consumer.close();
                });
                delete consumersRef.current[data.userId];
            }

            // リモートストリームを削除
            setRemoteStreams(prev => {
                const newStreams = { ...prev };
                delete newStreams[data.userId];
                return newStreams;
            });
        });

        // 現在の参加者リスト
        socket.on('voice-participants', (participantsList) => {
            console.log('参加者リスト:', participantsList);
            const normalizedParticipants = participantsList.map(p => {
                if (!p || typeof p !== 'object') {
                    return {
                        userId: 'unknown',
                        userName: '匿名'
                    };
                }
                return {
                    userId: p.userId || 'unknown',
                    userName: p.userName || '匿名'
                };
            });
            const filteredParticipants = normalizedParticipants.filter(p => p.userId !== currentUser.uid);
            setParticipants(filteredParticipants);

            // 親コンポーネントに参加者情報を送信
            if (onParticipantsUpdate) {
                const allParticipants = [
                    { userId: currentUser.uid, userName: currentUser.displayName || '匿名' },
                    ...filteredParticipants
                ];
                onParticipantsUpdate(allParticipants);
            }
        });

        // 新しいプロデューサーが作成された
        socket.on('newProducer', async (data) => {
            const { producerId, userId, kind } = data;
            console.log(`🔔 新しいプロデューサー検出: ${userId}, kind: ${kind}, producerId: ${producerId}`);

            if (userId === currentUser.uid) {
                console.log(`⚠️ 自分自身のプロデューサーは無視します: ${userId}`);
                return;
            }

            try {
                console.log(`🔄 コンシューマー作成を開始します: ${userId}, kind: ${kind}`);
                await consume(producerId, userId, kind);
                console.log(`✅ コンシューマー作成完了: ${userId}, kind: ${kind}`);
            } catch (error) {
                console.error(`❌ コンシューマー作成失敗: ${error.message}`, error);
            }
        });

        // プロデューサーが閉じられた
        socket.on('producerClosed', (data) => {
            const { producerId, userId } = data;
            console.log('プロデューサーが閉じられました:', { producerId, userId });

            if (consumersRef.current[userId]) {
                const consumerIndex = consumersRef.current[userId].findIndex(
                    c => c.producerId === producerId
                );

                if (consumerIndex !== -1) {
                    const consumer = consumersRef.current[userId][consumerIndex];
                    consumer.close();
                    consumersRef.current[userId].splice(consumerIndex, 1);

                    // リモートストリームを更新
                    updateRemoteStreams(userId);
                }
            }
        });

        // 他のユーザーの喋っている状態
        socket.on('user-speaking-update', (data) => {
            console.log('ユーザー喋り状態更新:', data);
            if (data.isSpeaking) {
                setSpeakingUsers(prev => {
                    const newSet = new Set([...prev, data.userId]);
                    if (onSpeakingUsersUpdate) {
                        onSpeakingUsersUpdate(newSet);
                    }
                    return newSet;
                });
            } else {
                setSpeakingUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(data.userId);
                    if (onSpeakingUsersUpdate) {
                        onSpeakingUsersUpdate(newSet);
                    }
                    return newSet;
                });
            }
        });

        // ミュート状態変更の受信
        socket.on('mute-state-changed', (data) => {
            console.log('ミュート状態変更を受信:', data);
            const { userId, isMuted } = data;
            if (userId !== currentUser.uid) {
                setParticipants(prev => prev.map(p =>
                    p.userId === userId ? { ...p, isMuted } : p
                ));
            }
        });

        // 聴覚不能状態変更の受信
        socket.on('deafen-state-changed', (data) => {
            console.log('聴覚不能状態変更を受信:', data);
            const { userId, isDeafened } = data;
            if (userId !== currentUser.uid) {
                setParticipants(prev => prev.map(p =>
                    p.userId === userId ? { ...p, isDeafened } : p
                ));
            }
        });

        // 画面共有状態更新の受信
        socket.on('screen-share-update', (data) => {
            console.log('画面共有状態更新を受信:', data);
            const { userId, isScreenSharing } = data;
            if (isScreenSharing) {
                setScreenSharingUsers(prev => new Set([...prev, userId]));
            } else {
                setScreenSharingUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(userId);
                    return newSet;
                });
            }
        });

        // 再接続
        socket.on('reconnect', () => {
            console.log('Socket.IO再接続');
            // チャンネルに再参加
            socket.emit('join-voice-channel', {
                channelId: channel.id,
                userId: currentUser.uid,
                userName: currentUser.displayName || '匿名'
            });
        });
    };

    const consume = async (producerId, userId, kind) => {
        try {
            console.log(`🔊 コンシューマー作成開始: ${userId}, kind: ${kind}`);

            const consumerTransport = await createConsumerTransport();

            const { consumer, params } = await new Promise((resolve, reject) => {
                socketRef.current.emit('consume', {
                    producerId,
                    rtpCapabilities: deviceRef.current.rtpCapabilities,
                    transportId: consumerTransport.id
                }, (data) => {
                    if (data.error) reject(new Error(data.error));
                    else resolve(data);
                });
            });

            await consumerTransport.consume({
                id: consumer.id,
                producerId,
                kind,
                rtpParameters: consumer.rtpParameters
            });

            console.log(`✅ コンシューマー作成成功: ${consumer.id}, kind: ${kind}`);

            // コンシューマーを保存
            if (!consumersRef.current[userId]) {
                consumersRef.current[userId] = [];
            }
            consumersRef.current[userId].push({
                consumer,
                producerId,
                kind,
                transport: consumerTransport
            });

            // リモートストリームを更新
            updateRemoteStreams(userId);

            // コンシューマーが閉じられたときのイベント
            consumer.on('transportclose', () => {
                console.log(`❌ コンシューマートランスポートが閉じられました: ${consumer.id}`);
                removeConsumer(userId, consumer.id);
            });

            consumer.on('trackended', () => {
                console.log(`❌ コンシューマートラックが終了しました: ${consumer.id}`);
                removeConsumer(userId, consumer.id);
            });

            // コンシューマーを再開
            await consumer.resume();
            console.log(`▶️ コンシューマーを再開: ${consumer.id}`);

            return consumer;
        } catch (error) {
            console.error(`❌ コンシューマー作成エラー: ${error.message}`, error);
            throw error;
        }
    };

    const createConsumerTransport = async () => {
        try {
            const transportInfo = await new Promise((resolve, reject) => {
                socketRef.current.emit('createConsumerTransport', (data) => {
                    if (data.error) reject(new Error(data.error));
                    else resolve(data);
                });
            });

            const transport = deviceRef.current.createRecvTransport(transportInfo);

            transport.on('connect', ({ dtlsParameters }, callback, errback) => {
                socketRef.current.emit('connectConsumerTransport', {
                    transportId: transport.id,
                    dtlsParameters
                }, (data) => {
                    if (data.error) errback(new Error(data.error));
                    else callback();
                });
            });

            return transport;
        } catch (error) {
            console.error('コンシューマートランスポート作成エラー:', error);
            throw error;
        }
    };

    const removeConsumer = (userId, consumerId) => {
        if (consumersRef.current[userId]) {
            const index = consumersRef.current[userId].findIndex(c => c.consumer.id === consumerId);
            if (index !== -1) {
                const consumerData = consumersRef.current[userId][index];
                consumerData.consumer.close();
                consumerData.transport.close();
                consumersRef.current[userId].splice(index, 1);

                if (consumersRef.current[userId].length === 0) {
                    delete consumersRef.current[userId];
                }

                updateRemoteStreams(userId);
            }
        }
    };

    const updateRemoteStreams = (userId) => {
        console.log(`🔄 リモートストリーム更新開始: ${userId}`);

        if (!consumersRef.current[userId] || consumersRef.current[userId].length === 0) {
            console.log(`⚠️ ユーザー ${userId} のコンシューマーがありません`);
            setRemoteStreams(prev => {
                const newStreams = { ...prev };
                delete newStreams[userId];
                return newStreams;
            });
            return;
        }

        const audioTracks = [];
        const videoTracks = [];

        consumersRef.current[userId].forEach(consumerData => {
            if (consumerData.kind === 'audio') {
                audioTracks.push(consumerData.consumer.track);
                console.log(`🎵 オーディオトラック検出: ${consumerData.consumer.track.id}, 状態: ${consumerData.consumer.track.readyState}`);
            } else if (consumerData.kind === 'video') {
                videoTracks.push(consumerData.consumer.track);
            }
        });

        if (audioTracks.length === 0) {
            console.log(`⚠️ ユーザー ${userId} のオーディオトラックがありません`);
        } else {
            console.log(`✅ ユーザー ${userId} のオーディオトラック数: ${audioTracks.length}`);
        }

        const stream = new MediaStream([...audioTracks, ...videoTracks]);
        console.log(`📺 リモートストリーム作成: ${userId}, トラック数: ${stream.getTracks().length}`);

        // ストリームの詳細をログ
        stream.getTracks().forEach(track => {
            console.log(`  - トラック: ${track.kind}, ID: ${track.id}, 状態: ${track.readyState}, 有効: ${track.enabled}`);
        });

        setRemoteStreams(prev => ({
            ...prev,
            [userId]: stream
        }));

        // リモートオーディオ要素にストリームを設定
        if (remoteAudioRef.current && audioTracks.length > 0) {
            remoteAudioRef.current.srcObject = stream;
            console.log(`🔊 リモートオーディオ要素にストリームを設定: ${stream.id}`);

            // オーディオを再生
            remoteAudioRef.current.play().then(() => {
                console.log(`▶️ オーディオ再生成功: ${userId}`);
            }).catch(e => {
                console.error(`❌ オーディオ再生エラー: ${e.message}`, e);
            });
        } else {
            console.log(`⚠️ リモートオーディオ要素が見つからないか、オーディオトラックがありません`);
        }
    };

    const createProducerTransport = async () => {
        try {
            const transportInfo = await new Promise((resolve, reject) => {
                socketRef.current.emit('createProducerTransport', (data) => {
                    if (data.error) reject(new Error(data.error));
                    else resolve(data);
                });
            });

            const transport = deviceRef.current.createSendTransport(transportInfo);

            transport.on('connect', ({ dtlsParameters }, callback, errback) => {
                socketRef.current.emit('connectProducerTransport', {
                    transportId: transport.id,
                    dtlsParameters
                }, (data) => {
                    if (data.error) errback(new Error(data.error));
                    else callback();
                });
            });

            transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
                try {
                    const { producerId } = await new Promise((resolve, reject) => {
                        socketRef.current.emit('produce', {
                            transportId: transport.id,
                            kind,
                            rtpParameters,
                            channelId: channel.id
                        }, (data) => {
                            if (data.error) reject(new Error(data.error));
                            else resolve(data);
                        });
                    });
                    callback({ id: producerId });
                } catch (error) {
                    errback(error);
                }
            });

            return transport;
        } catch (error) {
            console.error('プロデューサートランスポート作成エラー:', error);
            throw error;
        }
    };

    const toggleAudio = async () => {
        try {
            if (producerRef.current) {
                // 音声を無効化
                producerRef.current.close();
                producerRef.current = null;
                setIsMuted(true);

                if (onMuteStateUpdate) {
                    onMuteStateUpdate(true);
                }

                // ミュート状態を通知
                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('mute-state-changed', {
                        channelId: channel.id,
                        userId: currentUser.uid,
                        isMuted: true
                    });
                }
            } else {
                // 音声を有効化
                if (!localStreamRef.current) {
                    localStreamRef.current = await mediaStreamManager.getLocalStream({
                        audio: true,
                        video: false
                    });
                }

                const transport = await createProducerTransport();
                const track = localStreamRef.current.getAudioTracks()[0];

                // トラックが存在するか確認
                if (!track) {
                    throw new Error('オーディオトラックが見つかりません');
                }

                console.log('オーディオトラックをプロデュースします:', track);

                producerRef.current = await transport.produce({
                    track,
                    codecOptions: {
                        opusStereo: true,
                        opusDtx: true,
                        opusFec: true,
                        opusPtime: 20,
                        opusMaxPlaybackRate: 48000
                    }
                });

                console.log('オーディオプロデューサーを作成しました:', producerRef.current.id);

                setIsMuted(false);

                if (onMuteStateUpdate) {
                    onMuteStateUpdate(false);
                }

                // ミュート状態を通知
                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('mute-state-changed', {
                        channelId: channel.id,
                        userId: currentUser.uid,
                        isMuted: false
                    });
                }
            }
        } catch (error) {
            console.error('音声切り替えエラー:', error);
            alert('音声の切り替えに失敗しました: ' + error.message);
        }
    };

    const toggleVideo = async () => {
        try {
            if (videoProducerRef.current) {
                // ビデオを無効化
                videoProducerRef.current.close();
                videoProducerRef.current = null;
                setIsVideoEnabled(false);

                // ビデオ無効化を通知
                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('video-disabled', {
                        channelId: channel.id,
                        userId: currentUser.uid
                    });
                }
            } else {
                // ビデオを有効化
                if (!localStreamRef.current || !localStreamRef.current.getVideoTracks().length) {
                    const videoStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false
                    });

                    if (localStreamRef.current) {
                        // ビデオトラックを追加
                        const videoTrack = videoStream.getVideoTracks()[0];
                        localStreamRef.current.addTrack(videoTrack);
                    } else {
                        localStreamRef.current = videoStream;
                    }
                }

                const transport = await createProducerTransport();
                const track = localStreamRef.current.getVideoTracks()[0];

                videoProducerRef.current = await transport.produce({
                    track
                });

                setIsVideoEnabled(true);

                // ビデオ有効化を通知
                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('video-enabled', {
                        channelId: channel.id,
                        userId: currentUser.uid
                    });
                }
            }
        } catch (error) {
            console.error('ビデオ切り替えエラー:', error);
            alert('カメラへのアクセスが拒否されました。');
        }
    };

    const toggleScreenShare = async () => {
        try {
            if (screenProducerRef.current) {
                // 画面共有を停止
                screenProducerRef.current.close();
                screenProducerRef.current = null;

                if (screenStreamRef.current) {
                    screenStreamRef.current.getTracks().forEach(track => track.stop());
                    screenStreamRef.current = null;
                }

                setIsScreenSharing(false);

                // 画面共有停止を通知
                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('screen-share-stopped', {
                        channelId: channel.id,
                        userId: currentUser.uid
                    });
                }
            } else {
                // 画面共有を開始
                let displayMediaOptions = {
                    video: {
                        cursor: "always"
                    },
                    audio: false
                };

                if (screenShareType === 'tab') {
                    displayMediaOptions = {
                        video: {
                            cursor: "never"
                        },
                        audio: false,
                        selfBrowserSurface: "exclude",
                        surfaceSwitching: "include"
                    };
                }

                screenStreamRef.current = await mediaStreamManager.getScreenStream(displayMediaOptions);
                const transport = await createProducerTransport();
                const track = screenStreamRef.current.getVideoTracks()[0];

                screenProducerRef.current = await transport.produce({
                    track
                });

                track.onended = () => {
                    // 画面共有が終了したら自動的に停止
                    if (screenProducerRef.current) {
                        screenProducerRef.current.close();
                        screenProducerRef.current = null;
                    }

                    if (screenStreamRef.current) {
                        screenStreamRef.current.getTracks().forEach(t => t.stop());
                        screenStreamRef.current = null;
                    }

                    setIsScreenSharing(false);

                    // 画面共有停止を通知
                    if (socketRef.current && socketRef.current.connected) {
                        socketRef.current.emit('screen-share-stopped', {
                            channelId: channel.id,
                            userId: currentUser.uid
                        });
                    }
                };

                setIsScreenSharing(true);

                // 画面共有開始を通知
                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('screen-share-started', {
                        channelId: channel.id,
                        userId: currentUser.uid
                    });
                }
            }
        } catch (error) {
            console.error('画面共有切り替えエラー:', error);
            alert('画面共有の開始に失敗しました: ' + error.message);
        }
    };

    const toggleMute = () => {
        toggleAudio();
    };

    const toggleDeafen = () => {
        const newDeafenedState = !isDeafened;
        setIsDeafened(newDeafenedState);

        if (remoteAudioRef.current) {
            remoteAudioRef.current.muted = newDeafenedState;
        }

        // 聴覚不能状態を通知
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('deafen-state-changed', {
                channelId: channel.id,
                userId: currentUser.uid,
                isDeafened: newDeafenedState
            });
        }
    };

    const startAudioLevelMonitoring = () => {
        const analyser = analyserRef.current;
        if (!analyser) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let lastUpdateTime = 0;
        const updateInterval = 100;

        const updateAudioLevel = (timestamp) => {
            if (timestamp - lastUpdateTime < updateInterval) {
                animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
                return;
            }

            lastUpdateTime = timestamp;
            analyser.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }

            const average = sum / dataArray.length;
            const normalizedLevel = average / 255;
            setAudioLevel(normalizedLevel);

            const isSpeaking = normalizedLevel > 0.1;
            const wasSpeaking = speakingUsers.has(currentUser.uid);

            if (isSpeaking && !wasSpeaking) {
                setSpeakingUsers(prev => new Set([...prev, currentUser.uid]));

                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('user-speaking', {
                        channelId: channel.id,
                        userId: currentUser.uid,
                        isSpeaking: true
                    });
                }
            } else if (!isSpeaking && wasSpeaking) {
                setSpeakingUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(currentUser.uid);
                    return newSet;
                });

                if (socketRef.current && socketRef.current.connected) {
                    socketRef.current.emit('user-speaking', {
                        channelId: channel.id,
                        userId: currentUser.uid,
                        isSpeaking: false
                    });
                }
            }

            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        };

        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    };

    const stopAudioLevelMonitoring = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    };

    const toggleScreenShareType = () => {
        setScreenShareType(screenShareType === 'tab' ? 'full' : 'tab');
    };

    const focusOnScreenShare = (userId) => {
        const participant = participants.find(p => p.userId === userId);
        if (participant) {
            console.log(`画面共有にフォーカス: ${participant.userName}`);
        }
    };

    const cleanupVoiceChannel = () => {
        console.log('ボイスチャンネルクリーンアップ開始');

        // 音声レベル検出を停止
        stopAudioLevelMonitoring();

        // MediaStreamManagerを使用してクリーンアップ
        mediaStreamManager.cleanup();

        // プロデューサーを閉じる
        if (producerRef.current) {
            producerRef.current.close();
            producerRef.current = null;
        }

        if (videoProducerRef.current) {
            videoProducerRef.current.close();
            videoProducerRef.current = null;
        }

        if (screenProducerRef.current) {
            screenProducerRef.current.close();
            screenProducerRef.current = null;
        }

        // コンシューマーを閉じる
        Object.values(consumersRef.current).forEach(userConsumers => {
            userConsumers.forEach(consumerData => {
                consumerData.consumer.close();
                consumerData.transport.close();
            });
        });
        consumersRef.current = {};

        // ストリームをクリーンアップ
        localStreamRef.current = null;
        screenStreamRef.current = null;

        // デバイスをクリーンアップ
        if (deviceRef.current) {
            deviceRef.current = null;
        }

        // Socket.IO接続を閉じる
        if (socketRef.current) {
            console.log('Socket.IO接続を閉じる');
            socketRef.current.emit('leave-voice-channel', {
                channelId: channel?.id,
                userId: currentUser.uid
            });
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        setIsConnected(false);
        setIsConnecting(false);
        setParticipants([]);
        setSpeakingUsers(new Set());
        setAudioLevel(0);
        setIsVideoEnabled(false);
        setIsScreenSharing(false);
        setRemoteStreams({});
        setScreenSharingUsers(new Set());

        // 親コンポーネントに参加者情報をクリア
        if (onParticipantsUpdate) {
            onParticipantsUpdate([]);
        }

        if (onSpeakingUsersUpdate) {
            onSpeakingUsersUpdate(new Set());
        }

        console.log('ボイスチャンネルクリーンアップ完了');
    };

    if (!isActive || channel?.type !== 'voice') {
        return null;
    }

    // 参加者情報をビデオグリッド用に変換
    const videoParticipants = [
        // ローカル参加者（ビデオが有効な場合）
        ...(isVideoEnabled ? [{
            id: currentUser.uid,
            name: currentUser.displayName || '匿名',
            stream: localStreamRef.current,
            isLocal: true,
            isSpeaking: speakingUsers.has(currentUser.uid),
            isMuted: isMuted,
            isScreenSharing: isScreenSharing
        }] : []),
        // リモート参加者
        ...participants.map(p => ({
            id: p.userId,
            name: p.userName,
            stream: remoteStreams[p.userId],
            isLocal: false,
            isSpeaking: speakingUsers.has(p.userId),
            isMuted: false,
            isScreenSharing: screenSharingUsers.has(p.userId)
        }))
    ];

    // デバッグ情報の表示（開発時のみ）
    const debugInfo = process.env.NODE_ENV === 'development' ? (
        <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 1001,
            maxWidth: '300px',
            maxHeight: '200px',
            overflow: 'auto'
        }}>
            <h4>デバッグ情報</h4>
            <p>接続状態: {isConnected ? '✅' : '❌'}</p>
            <p>オーディオ有効: {!isMuted ? '✅' : '❌'}</p>
            <p>参加者数: {participants.length}</p>
            <p>リモートストリーム: {Object.keys(remoteStreams).length}</p>
            <div>
                <strong>コンシューマー:</strong>
                {Object.entries(consumersRef.current).map(([userId, consumers]) => (
                    <div key={userId}>
                        {userId}: {consumers.length}個
                        {consumers.map(c => (
                            <div key={c.consumer.id} style={{ marginLeft: '10px' }}>
                                {c.kind}: {c.consumer.id}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    ) : null;

    return (
        <div>
            {debugInfo}
            {/* ボイスチャンネルコントロールパネル */}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                left: '280px',
                backgroundColor: '#2f3136',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                zIndex: 1000,
                minWidth: '280px',
                maxWidth: '320px'
            }}>
                <style>{`
                    @keyframes pulse {
                        0% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.5; transform: scale(1.2); }
                        100% { opacity: 1; transform: scale(1); }
                    }
                `}</style>

                {/* 通話ステータスバー */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                    padding: '8px 12px',
                    backgroundColor: '#40444b',
                    borderRadius: '6px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#43b581', fontSize: '14px' }}>●</span>
                        <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
                            通話中
                        </span>
                        <span style={{ color: '#b9bbbe', fontSize: '12px' }}>
                            {channel.name}
                        </span>
                    </div>
                </div>

                {/* メインコントロール */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={toggleMute}
                            style={{
                                backgroundColor: isMuted ? '#f04747' : 'transparent',
                                border: 'none',
                                color: isMuted ? 'white' : '#b9bbbe',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '8px',
                                borderRadius: '4px',
                                transition: 'background-color 0.2s ease'
                            }}
                            title={isMuted ? 'ミュート解除' : 'ミュート'}
                        >
                            {isMuted ? '🔇' : '🎤'}
                        </button>
                        <button
                            onClick={toggleDeafen}
                            style={{
                                backgroundColor: isDeafened ? '#f04747' : 'transparent',
                                border: 'none',
                                color: isDeafened ? 'white' : '#b9bbbe',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '8px',
                                borderRadius: '4px',
                                transition: 'background-color 0.2s ease'
                            }}
                            title={isDeafened ? 'スピーカー有効' : 'スピーカーミュート'}
                        >
                            {isDeafened ? '🔇' : '🔊'}
                        </button>
                        <button
                            onClick={toggleVideo}
                            style={{
                                backgroundColor: isVideoEnabled ? '#5865f2' : 'transparent',
                                border: 'none',
                                color: isVideoEnabled ? 'white' : '#b9bbbe',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '8px',
                                borderRadius: '4px',
                                transition: 'background-color 0.2s ease'
                            }}
                            title={isVideoEnabled ? 'ビデオを無効化' : 'ビデオを有効化'}
                        >
                            📹
                        </button>
                        <button
                            onClick={toggleScreenShare}
                            style={{
                                backgroundColor: isScreenSharing ? '#5865f2' : 'transparent',
                                border: 'none',
                                color: isScreenSharing ? 'white' : '#b9bbbe',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '8px',
                                borderRadius: '4px',
                                transition: 'background-color 0.2s ease',
                                position: 'relative'
                            }}
                            title={isScreenSharing ? '画面共有を停止' : '画面共有を開始'}
                        >
                            🖥️
                            {isScreenSharing && (
                                <span style={{
                                    position: 'absolute',
                                    top: '2px',
                                    right: '2px',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#43b581'
                                }} />
                            )}
                        </button>
                        {isScreenSharing && (
                            <button
                                onClick={toggleScreenShareType}
                                style={{
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#b9bbbe',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    marginLeft: '-4px'
                                }}
                                title={screenShareType === 'tab' ? 'タブのみ共有' : '画面全体共有'}
                            >
                                {screenShareType === 'tab' ? 'タブ' : '全体'}
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* 音声レベルインジケーター */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'end',
                            gap: '2px',
                            height: '20px'
                        }}>
                            <div style={{
                                width: '3px',
                                height: '8px',
                                backgroundColor: audioLevel > 0.1 ? '#43b581' : '#b9bbbe',
                                borderRadius: '1px'
                            }} />
                            <div style={{
                                width: '3px',
                                height: '12px',
                                backgroundColor: audioLevel > 0.2 ? '#43b581' : '#b9bbbe',
                                borderRadius: '1px'
                            }} />
                            <div style={{
                                width: '3px',
                                height: '16px',
                                backgroundColor: audioLevel > 0.3 ? '#43b581' : '#b9bbbe',
                                borderRadius: '1px'
                            }} />
                        </div>
                        <button
                            onClick={cleanupVoiceChannel}
                            style={{
                                backgroundColor: '#f04747',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '8px',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="退出"
                        >
                            📞
                        </button>
                    </div>
                </div>

                {/* 画面共有中のユーザー表示 */}
                {screenSharingUsers.size > 0 && (
                    <div style={{
                        backgroundColor: '#40444b',
                        borderRadius: '6px',
                        padding: '8px',
                        marginBottom: '12px'
                    }}>
                        <div style={{
                            color: '#5865f2',
                            fontSize: '12px',
                            fontWeight: '600',
                            marginBottom: '4px'
                        }}>
                            画面共有中
                        </div>
                        {Array.from(screenSharingUsers).map(userId => {
                            const participant = participants.find(p => p.userId === userId) ||
                                (userId === currentUser.uid ? { userName: currentUser.displayName || '匿名' } : null);
                            if (!participant) return null;
                            const name = participant.userName || '匿名';
                            return (
                                <div key={userId} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '4px 0'
                                }}>
                                    <span style={{ color: '#dcddde', fontSize: '12px' }}>
                                        {name}
                                    </span>
                                    <button
                                        onClick={() => focusOnScreenShare(userId)}
                                        style={{
                                            backgroundColor: '#5865f2',
                                            border: 'none',
                                            color: 'white',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        フォーカス
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* アクティブスピーカー */}
                {speakingUsers.size > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#40444b',
                        borderRadius: '6px'
                    }}>
                        {Array.from(speakingUsers).slice(0, 1).map(userId => {
                            const participant = participants.find(p => p.userId === userId) ||
                                (userId === currentUser.uid ? { userName: currentUser.displayName || '匿名' } : null);
                            if (!participant) return null;
                            const name = participant.userName || '匿名';
                            const initial = name && typeof name === 'string' ? name.charAt(0).toUpperCase() : '?';
                            return (
                                <div key={userId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: userId === currentUser.uid ? '#5865f2' : '#43b581',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        position: 'relative'
                                    }}>
                                        {initial}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-2px',
                                            right: '-2px',
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: '#43b581',
                                            border: '1px solid #40444b',
                                            animation: 'pulse 1.5s infinite'
                                        }} />
                                    </div>
                                    <span style={{ color: 'white', fontSize: '12px' }}>
                                        {name}
                                    </span>
                                    <span style={{ color: '#43b581', fontSize: '10px' }}>
                                        会話中
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 隠しオーディオ要素 */}
                <audio ref={localAudioRef} autoPlay muted />
                <audio ref={remoteAudioRef} autoPlay muted={isDeafened} />
            </div>

            {/* ビデオコンテナ */}
            {(isVideoEnabled || isScreenSharing || Object.keys(remoteStreams).length > 0) && (
                <div style={{
                    position: 'fixed',
                    bottom: '140px',
                    left: '280px',
                    width: '400px',
                    backgroundColor: '#2f3136',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    zIndex: 999
                }}>
                    <h3 style={{
                        color: '#ffffff',
                        fontSize: '16px',
                        fontWeight: '600',
                        margin: '0 0 12px 0'
                    }}>
                        {isScreenSharing ? '画面共有' : 'ビデオチャット'}
                    </h3>

                    {/* ローカルビデオ */}
                    {isVideoEnabled && (
                        <div style={{
                            width: '100%',
                            aspectRatio: '16/9',
                            backgroundColor: '#202225',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            marginBottom: '12px'
                        }}>
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    transform: 'scaleX(-1)'
                                }}
                            />
                        </div>
                    )}

                    {/* リモートビデオ - VideoGridコンポーネントを使用 */}
                    <div style={{
                        width: '100%',
                        height: '300px',
                        backgroundColor: '#202225',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <VideoGrid participants={videoParticipants} />
                    </div>
                </div>
            )}
        </div>
    );
}