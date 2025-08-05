const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ボイスチャンネル管理
const voiceChannels = new Map(); // channelId -> Set of socketIds

io.on('connection', (socket) => {
    console.log('クライアント接続:', socket.id);
    
    // 既存のメッセージ機能
    socket.on('message', ({ username, content }) => {
        db.run("INSERT INTO messages (username, content) VALUES (?, ?)", [username, content]);
        io.emit('message', { username, content, timestamp: new Date().toISOString() });
    });
    
    // ボイスチャンネル参加
    socket.on('join-voice-channel', (data) => {
        const { channelId, userId, userName } = data;
        console.log('ボイスチャンネル参加:', channelId, userId, userName);
        
        // チャンネルに参加
        socket.join(channelId);
        socket.channelId = channelId;
        socket.userId = userId;
        socket.userName = userName;
        
        // チャンネルの参加者リストを管理
        if (!voiceChannels.has(channelId)) {
            voiceChannels.set(channelId, new Set());
        }
        voiceChannels.get(channelId).add(socket.id);
        
        // 現在の参加者リストを取得
        const participants = [];
        const channelSockets = io.sockets.adapter.rooms.get(channelId);
        if (channelSockets) {
            channelSockets.forEach(socketId => {
                const participantSocket = io.sockets.sockets.get(socketId);
                if (participantSocket && participantSocket.userId) {
                    participants.push({
                        userId: participantSocket.userId,
                        userName: participantSocket.userName
                    });
                }
            });
        }
        
        // 新しい参加者を他の参加者に通知
        socket.to(channelId).emit('user-joined-voice', {
            userId: userId,
            userName: userName
        });
        
        // 参加者リストを全員に送信
        io.to(channelId).emit('voice-participants', participants);
    });
    
    // ボイスチャンネル退出
    socket.on('leave-voice-channel', (data) => {
        const { channelId, userId } = data;
        console.log('ボイスチャンネル退出リクエスト:', channelId, userId, 'from socket:', socket.id);
        
        if (socket.channelId) {
            console.log('チャンネルから退出:', socket.channelId);
            socket.leave(socket.channelId);
            
            // チャンネルから参加者を削除
            if (voiceChannels.has(socket.channelId)) {
                voiceChannels.get(socket.channelId).delete(socket.id);
                console.log('参加者リストから削除:', socket.id);
                if (voiceChannels.get(socket.channelId).size === 0) {
                    voiceChannels.delete(socket.channelId);
                    console.log('チャンネル削除:', socket.channelId);
                }
            }
            
            // 他の参加者に退出を通知
            socket.to(socket.channelId).emit('user-left-voice', {
                userId: userId
            });
            console.log('退出通知を送信:', userId);
            
            // 参加者リストを更新
            const participants = [];
            const channelSockets = io.sockets.adapter.rooms.get(socket.channelId);
            if (channelSockets) {
                channelSockets.forEach(socketId => {
                    const participantSocket = io.sockets.sockets.get(socketId);
                    if (participantSocket && participantSocket.userId) {
                        participants.push({
                            userId: participantSocket.userId,
                            userName: participantSocket.userName
                        });
                    }
                });
            }
            
            console.log('更新された参加者リスト:', participants);
            io.to(socket.channelId).emit('voice-participants', participants);
            
            // ソケット情報をクリア
            socket.channelId = null;
            socket.userId = null;
            socket.userName = null;
            console.log('ソケット情報クリア完了');
        } else {
            console.log('ソケットがチャンネルに参加していません');
        }
    });
    
    // WebRTCシグナリング
    socket.on('offer', (data) => {
        console.log('オファー転送:', data.from, '->', data.to);
        socket.to(data.to).emit('offer', data);
    });
    
    socket.on('answer', (data) => {
        console.log('アンサー転送:', data.from, '->', data.to);
        socket.to(data.to).emit('answer', data);
    });
    
    socket.on('ice-candidate', (data) => {
        console.log('ICE候補転送:', data.from, '->', data.to);
        socket.to(data.to).emit('ice-candidate', data);
    });
    
    // ユーザーの喋っている状態
    socket.on('user-speaking', (data) => {
        console.log('ユーザー喋り状態:', data.userId, data.isSpeaking);
        socket.to(data.channelId).emit('user-speaking-update', {
            userId: data.userId,
            isSpeaking: data.isSpeaking
        });
    });
    
    // 切断処理
    socket.on('disconnect', () => {
        console.log('クライアント切断:', socket.id, 'userId:', socket.userId);
        
        // ボイスチャンネルから自動退出
        if (socket.channelId) {
            console.log('切断時のチャンネル退出処理:', socket.channelId);
            
            // 他の参加者に退出を通知
            socket.to(socket.channelId).emit('user-left-voice', {
                userId: socket.userId
            });
            
            // チャンネルから参加者を削除
            if (voiceChannels.has(socket.channelId)) {
                voiceChannels.get(socket.channelId).delete(socket.id);
                if (voiceChannels.get(socket.channelId).size === 0) {
                    voiceChannels.delete(socket.channelId);
                    console.log('チャンネル削除（切断時）:', socket.channelId);
                }
            }
            
            // 参加者リストを更新
            const participants = [];
            const channelSockets = io.sockets.adapter.rooms.get(socket.channelId);
            if (channelSockets) {
                channelSockets.forEach(socketId => {
                    const participantSocket = io.sockets.sockets.get(socketId);
                    if (participantSocket && participantSocket.userId) {
                        participants.push({
                            userId: participantSocket.userId,
                            userName: participantSocket.userName
                        });
                    }
                });
            }
            
            io.to(socket.channelId).emit('voice-participants', participants);
        }
    });
});

server.listen(3001, () => console.log('Socket.IO server running on port 3001'));
