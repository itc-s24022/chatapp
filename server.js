// server.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createWorker as createMediasoupWorker } from 'mediasoup';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// mediasoupワーカーを作成
let worker;
let router;
let producerTransport;
let consumerTransport;
let producers = [];
let consumers = [];

// server.js
const setupMediasoupWorker = async () => {
  worker = await createMediasoupWorker({
    logLevel: 'debug',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp'
    ],
    rtcMinPort: 10000,
    rtcMaxPort: 10100
  });

  worker.on('died', () => {
    console.error('mediasoup worker died, exiting in 2 seconds...');
    setTimeout(() => process.exit(1), 2000);
  });

  // ルーターを作成
  router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000
        }
      }
    ],
    // STUN/TURNサーバーの設定
    rtcOptions: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  });

  console.log('mediasoup worker created');
};

setupMediasoupWorker();

// ボイスチャンネルごとの参加者を管理
const voiceChannels = new Map();

io.on('connection', (socket) => {
  console.log('ユーザーが接続しました:', socket.id);

  // RTP capabilitiesを取得
  socket.on('getRouterRtpCapabilities', (callback) => {
    callback({ rtpCapabilities: router.rtpCapabilities });
  });

  // プロデューサートランスポートを作成
  socket.on('createProducerTransport', async (callback) => {
    try {
      const transport = await router.createWebRtcTransport({
        listenIps: [
          {
            ip: '127.0.0.1',
            announcedIp: '127.0.0.1'
          }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
      });

      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
          console.log('Transport closed');
        }
      });

      transport.on('close', () => {
        console.log('Transport closed');
      });

      producerTransport = transport;

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        dtlsParameters: transport.dtlsParameters,
        iceCandidates: transport.iceCandidates
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  // プロデューサートランスポートに接続
  socket.on('connectProducerTransport', async (data, callback) => {
    try {
      await producerTransport.connect({ dtlsParameters: data.dtlsParameters });
      callback();
    } catch (error) {
      callback({ error: error.message });
    }
  });

  // プロデューサーを作成
  socket.on('produce', async (data, callback) => {
    try {
      const { kind, rtpParameters, channelId } = data;

      console.log('プロデューサーを作成します:', { kind, channelId, socketId: socket.id });

      const producer = await producerTransport.produce({
        kind,
        rtpParameters
      });

      producers.push({
        socketId: socket.id,
        producerId: producer.id,
        kind,
        channelId
      });

      console.log('プロデューサーを作成しました:', producer.id);

      // 他の参加者に新しいプロデューサーを通知
      const channel = voiceChannels.get(channelId);
      if (channel) {
        for (const [userId, participant] of channel.participants) {
          if (participant.socketId !== socket.id) {
            console.log('新しいプロデューサーを通知:', {
              producerId: producer.id,
              userId: socket.id,
              kind,
              targetUserId: userId
            });

            io.to(participant.socketId).emit('newProducer', {
              producerId: producer.id,
              userId: socket.id,
              kind
            });
          }
        }
      }

      callback({ producerId: producer.id });
    } catch (error) {
      console.error('プロデューサー作成エラー:', error);
      callback({ error: error.message });
    }
  });

  // コンシューマートランスポートを作成
  socket.on('createConsumerTransport', async (callback) => {
    try {
      const transport = await router.createWebRtcTransport({
        listenIps: [
          {
            ip: '127.0.0.1',
            announcedIp: '127.0.0.1'
          }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
      });

      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
          console.log('Transport closed');
        }
      });

      transport.on('close', () => {
        console.log('Transport closed');
      });

      consumerTransport = transport;

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        dtlsParameters: transport.dtlsParameters,
        iceCandidates: transport.iceCandidates
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  // コンシューマートランスポートに接続
  socket.on('connectConsumerTransport', async (data, callback) => {
    try {
      await consumerTransport.connect({ dtlsParameters: data.dtlsParameters });
      callback();
    } catch (error) {
      callback({ error: error.message });
    }
  });

  // コンシューマーを作成
  socket.on('consume', async (data, callback) => {
    try {
      const { producerId, rtpCapabilities, transportId } = data;

      const producer = producers.find(p => p.producerId === producerId);
      if (!producer) {
        return callback({ error: 'Producer not found' });
      }

      const consumer = await consumerTransport.consume({
        producerId,
        rtpCapabilities,
        paused: true
      });

      consumers.push({
        socketId: socket.id,
        consumerId: consumer.id,
        producerId,
        kind: consumer.kind
      });

      // コンシューマーを再開
      await consumer.resume();

      callback({
        consumer: {
          id: consumer.id,
          producerId: consumer.producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters
        }
      });
    } catch (error) {
      callback({ error: error.message });
    }
  });

  // ボイスチャンネルに参加
  socket.on('join-voice-channel', (data) => {
    console.log('ユーザーがボイスチャンネルに参加:', data);
    const { channelId, userId, userName } = data;

    // チャンネルが存在しない場合は作成
    if (!voiceChannels.has(channelId)) {
      voiceChannels.set(channelId, {
        participants: new Map(),
        screenSharingUsers: new Set()
      });
    }

    const channel = voiceChannels.get(channelId);

    // 参加者情報を保存
    channel.participants.set(userId, {
      socketId: socket.id,
      userName,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      isScreenSharing: false
    });

    // チャンネルに参加
    socket.join(channelId);

    // 他の参加者に通知
    socket.to(channelId).emit('user-joined-voice', {
      userId,
      userName
    });

    // 現在の参加者リストを送信
    const participants = Array.from(channel.participants.entries()).map(([id, info]) => ({
      userId: id,
      userName: info.userName
    }));

    socket.emit('voice-participants', participants);
    socket.to(channelId).emit('voice-participants', participants);

    // 既存のプロデューサーを新しい参加者に通知
    producers.forEach(producer => {
      if (producer.channelId === channelId && producer.socketId !== socket.id) {
        socket.emit('newProducer', {
          producerId: producer.producerId,
          userId: producer.socketId,
          kind: producer.kind
        });
      }
    });
  });

  // ボイスチャンネルから退出
  socket.on('leave-voice-channel', (data) => {
    console.log('ユーザーがボイスチャンネルから退出:', data);
    const { channelId, userId } = data;
    const channel = voiceChannels.get(channelId);

    if (channel) {
      // 参加者を削除
      channel.participants.delete(userId);
      channel.screenSharingUsers.delete(userId);

      // チャンネルから退出
      socket.leave(channelId);

      // 他の参加者に通知
      socket.to(channelId).emit('user-left-voice', {
        userId
      });

      // プロデューサーを閉じる
      producers = producers.filter(p => {
        if (p.socketId === socket.id) {
          // 他の参加者にプロデューサーが閉じられたことを通知
          socket.to(channelId).emit('producerClosed', {
            producerId: p.producerId,
            userId: socket.id
          });
          return false;
        }
        return true;
      });

      // コンシューマーを閉じる
      consumers = consumers.filter(c => {
        if (c.socketId === socket.id) {
          return false;
        }
        return true;
      });

      // 参加者がいなくなったらチャンネルを削除
      if (channel.participants.size === 0) {
        voiceChannels.delete(channelId);
      }
    }
  });

  // 切断処理
  socket.on('disconnect', () => {
    console.log('ユーザーが切断しました:', socket.id);

    // 全てのチャンネルからユーザーを探して削除
    for (const [channelId, channel] of voiceChannels.entries()) {
      for (const [userId, participant] of channel.participants.entries()) {
        if (participant.socketId === socket.id) {
          channel.participants.delete(userId);
          channel.screenSharingUsers.delete(userId);

          // 他の参加者に通知
          socket.to(channelId).emit('user-left-voice', {
            userId
          });

          // プロデューサーを閉じる
          producers = producers.filter(p => {
            if (p.socketId === socket.id) {
              // 他の参加者にプロデューサーが閉じられたことを通知
              socket.to(channelId).emit('producerClosed', {
                producerId: p.producerId,
                userId: socket.id
              });
              return false;
            }
            return true;
          });

          // コンシューマーを閉じる
          consumers = consumers.filter(c => {
            if (c.socketId === socket.id) {
              return false;
            }
            return true;
          });

          // 参加者がいなくなったらチャンネルを削除
          if (channel.participants.size === 0) {
            voiceChannels.delete(channelId);
          }

          break;
        }
      }
    }
  });

  // ミュート状態変更
  socket.on('mute-state-changed', (data) => {
    console.log('ミュート状態変更:', data);
    const { channelId, userId, isMuted } = data;
    const channel = voiceChannels.get(channelId);

    if (channel && channel.participants.has(userId)) {
      channel.participants.get(userId).isMuted = isMuted;

      // 他の参加者に通知
      socket.to(channelId).emit('mute-state-changed', {
        userId,
        isMuted
      });
    }
  });

  // 聴覚不能状態変更
  socket.on('deafen-state-changed', (data) => {
    console.log('聴覚不能状態変更:', data);
    const { channelId, userId, isDeafened } = data;
    const channel = voiceChannels.get(channelId);

    if (channel && channel.participants.has(userId)) {
      channel.participants.get(userId).isDeafened = isDeafened;

      // 他の参加者に通知
      socket.to(channelId).emit('deafen-state-changed', {
        userId,
        isDeafened
      });
    }
  });

  // 喋っている状態更新
  socket.on('user-speaking', (data) => {
    console.log('ユーザー喋り状態更新:', data);
    const { channelId, userId, isSpeaking } = data;
    const channel = voiceChannels.get(channelId);

    if (channel && channel.participants.has(userId)) {
      channel.participants.get(userId).isSpeaking = isSpeaking;

      // 他の参加者に通知
      socket.to(channelId).emit('user-speaking-update', {
        userId,
        isSpeaking
      });
    }
  });

  // ビデオ有効化
  socket.on('video-enabled', (data) => {
    console.log('ビデオ有効化:', data);
    const { channelId, userId } = data;

    // 他の参加者に通知
    socket.to(channelId).emit('video-enabled', {
      userId
    });
  });

  // ビデオ無効化
  socket.on('video-disabled', (data) => {
    console.log('ビデオ無効化:', data);
    const { channelId, userId } = data;

    // 他の参加者に通知
    socket.to(channelId).emit('video-disabled', {
      userId
    });
  });

  // 画面共有開始
  socket.on('screen-share-started', (data) => {
    console.log('画面共有開始:', data);
    const { channelId, userId } = data;
    const channel = voiceChannels.get(channelId);

    if (channel) {
      channel.screenSharingUsers.add(userId);

      // 他の参加者に通知
      socket.to(channelId).emit('screen-share-update', {
        userId,
        isScreenSharing: true
      });
    }
  });

  // 画面共有停止
  socket.on('screen-share-stopped', (data) => {
    console.log('画面共有停止:', data);
    const { channelId, userId } = data;
    const channel = voiceChannels.get(channelId);

    if (channel) {
      channel.screenSharingUsers.delete(userId);

      // 他の参加者に通知
      socket.to(channelId).emit('screen-share-update', {
        userId,
        isScreenSharing: false
      });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`サーバーがポート ${PORT} で起動しました`);
});