// components/VoiceChannel.jsx
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import adapter from 'webrtc-adapter';

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
    const [screenShareType, setScreenShareType] = useState('tab'); // 'tab' or 'full'

    const socketRef = useRef(null);
    const localStreamRef = useRef(null);
    const localVideoRef = useRef(null);
    const peerConnectionsRef = useRef({});
    const localAudioRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const remoteVideoRef = useRef({});
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const microphoneRef = useRef(null);
    const animationFrameRef = useRef(null);
    const screenShareStreamRef = useRef(null);

    useEffect(() => {
        console.log('VoiceChannel useEffect:', { isActive, channelId: channel?.id, channelType: channel?.type });

        if (!isActive || !channel || channel.type !== 'voice') {
            // アクティブでない場合はクリーンアップ
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

    const initializeVoiceChannel = async () => {
        try {
            setIsConnecting(true);

            // Socket.IO接続
            socketRef.current = io('http://localhost:3001');

            // ユーザーストリーム取得（音声のみ）
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            localStreamRef.current = stream;

            // ローカルオーディオ要素にストリームを設定
            if (localAudioRef.current) {
                localAudioRef.current.srcObject = stream;
            }

            // 音声レベル検出の初期化
            initializeAudioLevelDetection(stream);

            // Socket.IOイベントリスナー設定
            setupSocketListeners();

            // ボイスチャンネルに参加
            socketRef.current.emit('join-voice-channel', {
                channelId: channel.id,
                userId: currentUser.uid,
                userName: currentUser.displayName || '匿名'
            });

            setIsConnected(true);
            setIsConnecting(false);

        } catch (error) {
            console.error('ボイスチャンネル初期化エラー:', error);
            setIsConnecting(false);
            alert('マイクへのアクセスが拒否されました。ブラウザの設定を確認してください。');
        }
    };

    const setupSocketListeners = () => {
        const socket = socketRef.current;

        // 新しいユーザーが参加
        socket.on('user-joined-voice', async (data) => {
            console.log('新しいユーザーが参加:', data);
            setParticipants(prev => [...prev, data]);

            // 新しいピア接続を作成
            await createPeerConnection(data.userId, data.userName);
        });

        // ユーザーが退出
        socket.on('user-left-voice', (data) => {
            console.log('ユーザーが退出:', data);
            setParticipants(prev => prev.filter(p => p.userId !== data.userId));

            // ピア接続を閉じる
            if (peerConnectionsRef.current[data.userId]) {
                peerConnectionsRef.current[data.userId].close();
                delete peerConnectionsRef.current[data.userId];
            }

            // リモートビデオ要素を削除
            if (remoteVideoRef.current[data.userId]) {
                remoteVideoRef.current[data.userId].srcObject = null;
                delete remoteVideoRef.current[data.userId];
            }
        });

        // 現在の参加者リスト
        socket.on('voice-participants', (participantsList) => {
            console.log('参加者リスト:', participantsList);
            const filteredParticipants = participantsList.filter(p => p.userId !== currentUser.uid);
            setParticipants(filteredParticipants);

            // 親コンポーネントに参加者情報を送信
            if (onParticipantsUpdate) {
                const allParticipants = [
                    { userId: currentUser.uid, userName: currentUser.displayName || '匿名', channelId: channel.id },
                    ...filteredParticipants.map(p => ({ ...p, channelId: channel.id }))
                ];
                onParticipantsUpdate(allParticipants);
            }
        });

        // WebRTCシグナリング
        socket.on('offer', async (data) => {
            console.log('オファー受信:', data);
            await handleOffer(data);
        });

        socket.on('answer', async (data) => {
            console.log('アンサー受信:', data);
            await handleAnswer(data);
        });

        socket.on('ice-candidate', async (data) => {
            console.log('ICE候補受信:', data);
            await handleIceCandidate(data);
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
    };

    const createPeerConnection = async (peerUserId, peerUserName) => {
        try {
            const peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            // ローカルストリームを追加
            localStreamRef.current.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStreamRef.current);
            });

            // ICE候補イベント
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socketRef.current.emit('ice-candidate', {
                        candidate: event.candidate,
                        to: peerUserId,
                        from: currentUser.uid
                    });
                }
            };

            // リモートストリーム受信
            peerConnection.ontrack = (event) => {
                console.log('リモートストリーム受信:', peerUserName);

                // 音声トラック
                if (event.streams[0].getAudioTracks().length > 0) {
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                    }
                }

                // ビデオトラック
                if (event.streams[0].getVideoTracks().length > 0) {
                    if (!remoteVideoRef.current[peerUserId]) {
                        // リモートビデオ要素を作成
                        const videoElement = document.createElement('video');
                        videoElement.autoplay = true;
                        videoElement.playsInline = true;
                        videoElement.style.width = '100%';
                        videoElement.style.height = '100%';
                        videoElement.style.objectFit = 'cover';
                        videoElement.style.borderRadius = '8px';
                        videoElement.style.backgroundColor = '#2f3136';

                        // リモートビデオコンテナに追加
                        const remoteVideoContainer = document.getElementById(`remote-video-container-${peerUserId}`);
                        if (remoteVideoContainer) {
                            remoteVideoContainer.innerHTML = '';
                            remoteVideoContainer.appendChild(videoElement);
                        }

                        remoteVideoRef.current[peerUserId] = videoElement;
                    }

                    remoteVideoRef.current[peerUserId].srcObject = event.streams[0];
                }
            };

            peerConnectionsRef.current[peerUserId] = peerConnection;

            // オファーを作成して送信
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            socketRef.current.emit('offer', {
                offer: offer,
                to: peerUserId,
                from: currentUser.uid
            });

        } catch (error) {
            console.error('ピア接続作成エラー:', error);
        }
    };

    const handleOffer = async (data) => {
        try {
            const peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });

            // ローカルストリームを追加
            localStreamRef.current.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStreamRef.current);
            });

            // ICE候補イベント
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socketRef.current.emit('ice-candidate', {
                        candidate: event.candidate,
                        to: data.from,
                        from: currentUser.uid
                    });
                }
            };

            // リモートストリーム受信
            peerConnection.ontrack = (event) => {
                console.log('リモートストリーム受信');

                // 音声トラック
                if (event.streams[0].getAudioTracks().length > 0) {
                    if (remoteAudioRef.current) {
                        remoteAudioRef.current.srcObject = event.streams[0];
                    }
                }

                // ビデオトラック
                if (event.streams[0].getVideoTracks().length > 0) {
                    if (!remoteVideoRef.current[data.from]) {
                        // リモートビデオ要素を作成
                        const videoElement = document.createElement('video');
                        videoElement.autoplay = true;
                        videoElement.playsInline = true;
                        videoElement.style.width = '100%';
                        videoElement.style.height = '100%';
                        videoElement.style.objectFit = 'cover';
                        videoElement.style.borderRadius = '8px';
                        videoElement.style.backgroundColor = '#2f3136';

                        // リモートビデオコンテナに追加
                        const remoteVideoContainer = document.getElementById(`remote-video-container-${data.from}`);
                        if (remoteVideoContainer) {
                            remoteVideoContainer.innerHTML = '';
                            remoteVideoContainer.appendChild(videoElement);
                        }

                        remoteVideoRef.current[data.from] = videoElement;
                    }

                    remoteVideoRef.current[data.from].srcObject = event.streams[0];
                }
            };

            peerConnectionsRef.current[data.from] = peerConnection;

            // オファーを設定
            await peerConnection.setRemoteDescription(data.offer);

            // アンサーを作成して送信
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socketRef.current.emit('answer', {
                answer: answer,
                to: data.from,
                from: currentUser.uid
            });

        } catch (error) {
            console.error('オファー処理エラー:', error);
        }
    };

    const handleAnswer = async (data) => {
        try {
            const peerConnection = peerConnectionsRef.current[data.from];
            if (peerConnection) {
                await peerConnection.setRemoteDescription(data.answer);
            }
        } catch (error) {
            console.error('アンサー処理エラー:', error);
        }
    };

    const handleIceCandidate = async (data) => {
        try {
            const peerConnection = peerConnectionsRef.current[data.from];
            if (peerConnection) {
                await peerConnection.addIceCandidate(data.candidate);
            }
        } catch (error) {
            console.error('ICE候補処理エラー:', error);
        }
    };

    const toggleVideo = async () => {
        try {
            if (isVideoEnabled) {
                // ビデオを無効化
                if (localStreamRef.current) {
                    const videoTrack = localStreamRef.current.getVideoTracks()[0];
                    if (videoTrack) {
                        videoTrack.stop();
                        localStreamRef.current.removeTrack(videoTrack);
                    }
                }
                setIsVideoEnabled(false);

                // ピア接続からビデオトラックを削除
                Object.values(peerConnectionsRef.current).forEach(peerConnection => {
                    const sender = peerConnection.getSenders().find(s =>
                        s.track && s.track.kind === 'video'
                    );
                    if (sender) {
                        peerConnection.removeTrack(sender);
                    }
                });

                // ビデオ無効化を通知
                socketRef.current.emit('video-disabled', {
                    channelId: channel.id,
                    userId: currentUser.uid
                });
            } else {
                // ビデオを有効化
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });

                if (localStreamRef.current) {
                    // ビデオトラックを追加
                    const videoTrack = videoStream.getVideoTracks()[0];
                    localStreamRef.current.addTrack(videoTrack);

                    // ローカルビデオ要素に設定
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = localStreamRef.current;
                    }

                    // ピア接続にビデオトラックを追加
                    Object.values(peerConnectionsRef.current).forEach(peerConnection => {
                        peerConnection.addTrack(videoTrack, localStreamRef.current);
                    });
                }

                setIsVideoEnabled(true);

                // ビデオ有効化を通知
                socketRef.current.emit('video-enabled', {
                    channelId: channel.id,
                    userId: currentUser.uid
                });
            }
        } catch (error) {
            console.error('ビデオ切り替えエラー:', error);
            alert('カメラへのアクセスが拒否されました。');
        }
    };

    const toggleScreenShare = async () => {
        try {
            if (isScreenSharing) {
                // 画面共有を停止
                if (screenShareStreamRef.current) {
                    screenShareStreamRef.current.getTracks().forEach(track => track.stop());
                    screenShareStreamRef.current = null;
                }
                setIsScreenSharing(false);

                // ピア接続から画面共有トラックを削除
                Object.values(peerConnectionsRef.current).forEach(peerConnection => {
                    const sender = peerConnection.getSenders().find(s =>
                        s.track && s.track.kind === 'video' && s.track.label.includes('screen')
                    );
                    if (sender) {
                        peerConnection.removeTrack(sender);
                    }
                });

                // 画面共有停止を通知
                socketRef.current.emit('screen-share-stopped', {
                    channelId: channel.id,
                    userId: currentUser.uid
                });
            } else {
                // 画面共有を開始
                let displayMediaOptions = {
                    video: true,
                    audio: false
                };

                // 画面共有タイプに応じてオプションを設定
                if (screenShareType === 'tab') {
                    // タブのみを共有
                    if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
                        displayMediaOptions = {
                            video: {
                                cursor: "never"
                            },
                            audio: false,
                            selfBrowserSurface: "exclude"
                        };
                    }
                }

                const screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
                screenShareStreamRef.current = screenStream;

                // ピア接続に画面共有トラックを追加
                const screenTrack = screenStream.getVideoTracks()[0];
                screenTrack.onended = () => {
                    // 画面共有が終了したら自動的に停止
                    setIsScreenSharing(false);
                    screenShareStreamRef.current = null;

                    // 画面共有停止を通知
                    socketRef.current.emit('screen-share-stopped', {
                        channelId: channel.id,
                        userId: currentUser.uid
                    });
                };

                Object.values(peerConnectionsRef.current).forEach(peerConnection => {
                    peerConnection.addTrack(screenTrack, screenStream);
                });

                setIsScreenSharing(true);

                // 画面共有開始を通知
                socketRef.current.emit('screen-share-started', {
                    channelId: channel.id,
                    userId: currentUser.uid
                });
            }
        } catch (error) {
            console.error('画面共有切り替えエラー:', error);
            alert('画面共有の開始に失敗しました。');
        }
    };

    const cleanupVoiceChannel = () => {
        console.log('ボイスチャンネルクリーンアップ開始');

        // 音声レベル検出を停止
        stopAudioLevelMonitoring();

        // ローカルストリームを停止
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log('オーディオトラック停止:', track.id);
            });
            localStreamRef.current = null;
        }

        // 画面共有ストリームを停止
        if (screenShareStreamRef.current) {
            screenShareStreamRef.current.getTracks().forEach(track => {
                track.stop();
                console.log('画面共有トラック停止:', track.id);
            });
            screenShareStreamRef.current = null;
        }

        // ピア接続を閉じる
        Object.entries(peerConnectionsRef.current).forEach(([userId, connection]) => {
            console.log('ピア接続を閉じる:', userId);
            connection.close();
        });
        peerConnectionsRef.current = {};

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

        // 親コンポーネントに参加者情報をクリア
        if (onParticipantsUpdate) {
            onParticipantsUpdate([]);
        }
        if (onSpeakingUsersUpdate) {
            onSpeakingUsersUpdate(new Set());
        }

        console.log('ボイスチャンネルクリーンアップ完了');
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const newMuteState = !audioTrack.enabled;
                setIsMuted(newMuteState);
                if (onMuteStateUpdate) {
                    onMuteStateUpdate(newMuteState);
                }

                // ミュート状態を通知
                socketRef.current.emit('mute-state-changed', {
                    channelId: channel.id,
                    userId: currentUser.uid,
                    isMuted: newMuteState
                });
            }
        }
    };

    const toggleDeafen = () => {
        const newDeafenedState = !isDeafened;
        setIsDeafened(newDeafened);
        if (remoteAudioRef.current) {
            remoteAudioRef.current.muted = newDeafenedState;
        }

        // 聴覚不能状態を通知
        socketRef.current.emit('deafen-state-changed', {
            channelId: channel.id,
            userId: currentUser.uid,
            isDeafened: newDeafenedState
        });
    };

    const initializeAudioLevelDetection = (stream) => {
        try {
            // AudioContextとAnalyserNodeを作成
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            analyserRef.current.smoothingTimeConstant = 0.8;

            // マイクストリームをAudioContextに接続
            microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
            microphoneRef.current.connect(analyserRef.current);

            // 音声レベル監視を開始
            startAudioLevelMonitoring();

        } catch (error) {
            console.error('音声レベル検出初期化エラー:', error);
        }
    };

    const startAudioLevelMonitoring = () => {
        const analyser = analyserRef.current;
        if (!analyser) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateAudioLevel = () => {
            analyser.getByteFrequencyData(dataArray);

            // 音声レベルを計算（平均値）
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const normalizedLevel = average / 255; // 0-1の範囲に正規化

            setAudioLevel(normalizedLevel);

            // 喋っているかどうかを判定（閾値: 0.1）
            const isSpeaking = normalizedLevel > 0.1;

            if (isSpeaking && !speakingUsers.has(currentUser.uid)) {
                // 喋り始めた
                setSpeakingUsers(prev => new Set([...prev, currentUser.uid]));
                socketRef.current?.emit('user-speaking', {
                    channelId: channel.id,
                    userId: currentUser.uid,
                    isSpeaking: true
                });
            } else if (!isSpeaking && speakingUsers.has(currentUser.uid)) {
                // 喋り終わった
                setSpeakingUsers(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(currentUser.uid);
                    return newSet;
                });
                socketRef.current?.emit('user-speaking', {
                    channelId: channel.id,
                    userId: currentUser.uid,
                    isSpeaking: false
                });
            }

            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        };

        updateAudioLevel();
    };

    const stopAudioLevelMonitoring = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (microphoneRef.current) {
            microphoneRef.current.disconnect();
            microphoneRef.current = null;
        }

        if (analyserRef.current) {
            analyserRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    const toggleScreenShareType = () => {
        setScreenShareType(screenShareType === 'tab' ? 'full' : 'tab');
    };

    if (!isActive || channel?.type !== 'voice') {
        return null;
    }

    return (
        <div>
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
                        <button
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#b9bbbe',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '8px',
                                borderRadius: '4px'
                            }}
                            title="アクティビティ"
                        >
                            🎮
                        </button>
                        <button
                            style={{
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#b9bbbe',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '8px',
                                borderRadius: '4px'
                            }}
                            title="アクティビティ"
                        >
                            💡
                        </button>
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
                                backgroundColor: '#43b581',
                                borderRadius: '1px'
                            }} />
                            <div style={{
                                width: '3px',
                                height: '12px',
                                backgroundColor: '#43b581',
                                borderRadius: '1px'
                            }} />
                            <div style={{
                                width: '3px',
                                height: '16px',
                                backgroundColor: '#43b581',
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
                                        {participant.userName.charAt(0).toUpperCase()}
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
                                        {participant.userName}
                                    </span>
                                    <span style={{ color: '#43b581', fontSize: '10px' }}>
                                        会話中
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                                        <button
                                            onClick={toggleMute}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: isMuted ? '#f04747' : '#43b581',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                padding: '2px'
                                            }}
                                            title={isMuted ? 'ミュート解除' : 'ミュート'}
                                        >
                                            {isMuted ? '🔇' : '🎤'}
                                        </button>
                                        <span style={{ color: '#b9bbbe', fontSize: '12px' }}>⚙️</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 隠しオーディオ要素 */}
                <audio ref={localAudioRef} autoPlay muted />
                <audio ref={remoteAudioRef} autoPlay muted={isDeafened} />
                <video ref={localVideoRef} autoPlay muted playsInline style={{ display: 'none' }} />
            </div>

            {/* ビデオコンテナ */}
            {(isVideoEnabled || isScreenSharing) && (
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

                    {/* リモートビデオ */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px'
                    }}>
                        {participants.map(participant => (
                            <div key={participant.userId} style={{
                                aspectRatio: '16/9',
                                backgroundColor: '#202225',
                                borderRadius: '8px',
                                overflow: 'hidden'
                            }}>
                                <div
                                    id={`remote-video-container-${participant.userId}`}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#b9bbbe'
                                    }}
                                >
                                    {participant.userName} のビデオ
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}