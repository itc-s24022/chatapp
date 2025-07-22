const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
    socket.on('message', ({ username, content }) => {
        db.run("INSERT INTO messages (username, content) VALUES (?, ?)", [username, content]);
        io.emit('message', { username, content, timestamp: new Date().toISOString() });
    });
});

server.listen(3001, () => console.log('Socket.IO server running on port 3001'));
