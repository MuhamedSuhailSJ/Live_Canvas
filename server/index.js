const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Your React Client URL
    methods: ["GET", "POST"],
  },
});

// --- STATE MANAGEMENT ---
let drawHistory = []; // Stores every stroke: { start, end, color, size }
let connectedUsers = {}; // Stores { socketId: { color, x, y } }

// Helper: Generate random color for new users
const getRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // 1. Assign User & Send Initial State
  const userColor = getRandomColor();
  connectedUsers[socket.id] = { color: userColor, x: 0, y: 0 };

  // Send existing history to the new user so they see the full picture
  socket.emit("initial-history", drawHistory);

  // Broadcast updated user list
  io.emit("users-update", connectedUsers);

  // 2. Handle Drawing
  socket.on("draw-line", (data) => {
    // data = { start, end, color, size }
    drawHistory.push(data);
    // Broadcast to others immediately (real-time)
    socket.broadcast.emit("draw-line", data);
  });

  // 3. Handle Global Undo
  socket.on("undo", () => {
    if (drawHistory.length > 0) {
      drawHistory.pop(); // Remove last action
      // Tell EVERYONE to clear and redraw
      io.emit("canvas-clear");
      io.emit("initial-history", drawHistory);
    }
  });

  // 4. Handle Clear Board
  socket.on("clear", () => {
    drawHistory = [];
    io.emit("canvas-clear");
  });

  // 5. Handle Cursor Movement
  socket.on("cursor-move", (pos) => {
    if (connectedUsers[socket.id]) {
      connectedUsers[socket.id].x = pos.x;
      connectedUsers[socket.id].y = pos.y;
      // Broadcast specific user's movement to avoid sending full list every pixel
      socket.broadcast.emit("cursor-update", {
        id: socket.id,
        pos: pos,
        color: connectedUsers[socket.id].color,
      });
    }
  });

  // 6. Disconnect
  socket.on("disconnect", () => {
    delete connectedUsers[socket.id];
    io.emit("users-update", connectedUsers);
  });
});

server.listen(5000, () => {
  console.log("SERVER RUNNING ON PORT 5000");
});
