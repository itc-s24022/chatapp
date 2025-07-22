import { Server } from 'socket.io';

export const config = {
  api: {
    bodyParser: false, // Socket.IO はbodyを処理しないため
  },
};

let io;

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('Socket.IO サーバー初期化');

    io = new Server(res.socket.server);

    io.on('connection', (socket) => {
      console.log('ユーザー接続:', socket.id);

      socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
      });

      socket.on('disconnect', () => {
        console.log('ユーザー切断:', socket.id);
      });
    });

    res.socket.server.io = io;
  }
  res.end();
}
