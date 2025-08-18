// server.js
const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = 3000;

// ボイスチャンネルごとの参加者を管理
const voiceChannels = {};

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('ユーザーが接続しました:', socket.id);

    // ボイスチャンネルに参加
    socket.on('join-voice-channel', (data) => {
      const { channelId, userId, userName } = data;

      // チャンネルが存在しない場合は作成
      if (!voiceChannels[channelId]) {
        voiceChannels[channelId] = {
          participants: {}
        };
      }

      // 参加者を追加
      voiceChannels[channelId].participants[userId] = {
        socketId: socket.id,
        userName,
        isMuted: false,
        isDeafened: false,
        isVideoEnabled: false,
        isScreenSharing: false
      };

      // チャンネルに参加
      socket.join(channelId);

      // 参加者リストを全員に送信
      io.to(channelId).emit('voice-participants',
          Object.values(voiceChannels[channelId].participants)
              .map(p => ({ userId: p.socketId, userName: p.userName }))
      );

      // 他の参加者に新しい参加者を通知
      socket.to(channelId).emit('user-joined-voice', {
        userId,
        userName
      });

      console.log(`ユーザー ${userName} がチャンネル ${channelId} に参加しました`);
    });

    // WebRTCオファー処理
    socket.on('offer', async (data) => {
      const { offer, to, from } = data;

      // 特定のユーザーにオファーを転送
      io.to(to).emit('offer', {
        offer,
        from
      });
    });

    // WebRTCアンサー処理
    socket.on('answer', async (data) => {
      const { answer, to, from } = data;

      // 特定のユーザーにアンサーを転送
      io.to(to).emit('answer', {
        answer,
        from
      });
    });

    // ICE候補処理
    socket.on('ice-candidate', async (data) => {
      const { candidate, to, from } = data;

      // 特定のユーザーにICE候補を転送
      io.to(to).emit('ice-candidate', {
        candidate,
        from
      });
    });

    // ユーザーの喋っている状態更新
    socket.on('user-speaking', (data) => {
      const { channelId, userId, isSpeaking } = data;

      // 全員に喋っている状態を通知
      io.to(channelId).emit('user-speaking-update', {
        userId,
        isSpeaking
      });
    });

    // ミュート状態変更
    socket.on('mute-state-changed', (data) => {
      const { channelId, userId, isMuted } = data;

      if (voiceChannels[channelId] && voiceChannels[channelId].participants[userId]) {
        voiceChannels[channelId].participants[userId].isMuted = isMuted;
      }
    });

    // 聴覚不能状態変更
    socket.on('deafen-state-changed', (data) => {
      const { channelId, userId, isDeafened } = data;

      if (voiceChannels[channelId] && voiceChannels[channelId].participants[userId]) {
        voiceChannels[channelId].participants[userId].isDeafened = isDeafened;
      }
    });

    // ビデオ有効化
    socket.on('video-enabled', (data) => {
      const { channelId, userId } = data;

      if (voiceChannels[channelId] && voiceChannels[channelId].participants[userId]) {
        voiceChannels[channelId].participants[userId].isVideoEnabled = true;
      }
    });

    // ビデオ無効化
    socket.on('video-disabled', (data) => {
      const { channelId, userId } = data;

      if (voiceChannels[channelId] && voiceChannels[channelId].participants[userId]) {
        voiceChannels[channelId].participants[userId].isVideoEnabled = false;
      }
    });

    // 画面共有開始
    socket.on('screen-share-started', (data) => {
      const { channelId, userId } = data;

      if (voiceChannels[channelId] && voiceChannels[channelId].participants[userId]) {
        voiceChannels[channelId].participants[userId].isScreenSharing = true;
      }
    });

    // 画面共有停止
    socket.on('screen-share-stopped', (data) => {
      const { channelId, userId } = data;

      if (voiceChannels[channelId] && voiceChannels[channelId].participants[userId]) {
        voiceChannels[channelId].participants[userId].isScreenSharing = false;
      }
    });

    // ボイスチャンネルから退出
    socket.on('leave-voice-channel', (data) => {
      const { channelId, userId } = data;

      if (voiceChannels[channelId] && voiceChannels[channelId].participants[userId]) {
        // 参加者を削除
        delete voiceChannels[channelId].participants[userId];

        // チャンネルから退出
        socket.leave(channelId);

        // 参加者リストを全員に送信
        io.to(channelId).emit('voice-participants',
            Object.values(voiceChannels[channelId].participants)
                .map(p => ({ userId: p.socketId, userName: p.userName }))
        );

        // 他の参加者に退出を通知
        socket.to(channelId).emit('user-left-voice', {
          userId
        });

        console.log(`ユーザー ${userId} がチャンネル ${channelId} から退出しました`);
      }
    });

    // 切断時の処理
    socket.on('disconnect', () => {
      console.log('ユーザーが切断しました:', socket.id);

      // 全てのチャンネルからユーザーを探して削除
      Object.keys(voiceChannels).forEach(channelId => {
        Object.keys(voiceChannels[channelId].participants).forEach(userId => {
          if (voiceChannels[channelId].participants[userId].socketId === socket.id) {
            delete voiceChannels[channelId].participants[userId];

            // 参加者リストを全員に送信
            io.to(channelId).emit('voice-participants',
                Object.values(voiceChannels[channelId].participants)
                    .map(p => ({ userId: p.socketId, userName: p.userName }))
            );

            // 他の参加者に退出を通知
            socket.to(channelId).emit('user-left-voice', {
              userId
            });
          }
        });
      });
    });

    // 既存のチャットメッセージ機能（もしあれば）
    socket.on('chat message', (msg) => {
      io.emit('chat message', msg);
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
