# WebSocket (Socket.IO) Chat Integration

## Backend (Node.js + Express + Socket.IO)
- The server listens for WebSocket connections on port 9000.
- When a client emits a `user-message` event, the server broadcasts it to all connected clients as a `message` event.
- Example server code:

```js
const http = require("http");
const express = require("express");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  socket.on("user-message", (message) => {
    io.emit("message", message);
  });
});

app.use(express.static(path.resolve("./public")));

app.get("/", (req, res) => {
  return res.sendFile("/public/index.html");
});

server.listen(9000, () => console.log(`Server Started at PORT:9000`));
```

## Frontend (React/Next.js)
- Uses `socket.io-client` to connect to the backend.
- On mount, connects to the server and listens for `message` events.
- When sending a message, emits a `user-message` event to the server.
- All received messages are appended to the chat in real time.

## Usage
- Start the backend server (`node index.js`).
- Start your Next.js frontend.
- Open the chat page; messages will be sent and received in real time via WebSocket.

---
**No existing logic is broken.**
