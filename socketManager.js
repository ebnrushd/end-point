// socketManager.js
const { Server } = require("socket.io");
const jwt = require('jsonwebtoken');
const User = require('./models/User');

let io; // Make io instance accessible within this module

// Function to broadcast an event to a specific room
function broadcastToRoom(roomName, eventName, data) {
  if (io) {
    io.to(roomName).emit(eventName, data);
    console.log(`Broadcasted event '${eventName}' to room '${roomName}' with data:`, data);
  } else {
    console.error('Socket.IO not initialized. Cannot broadcast.');
  }
}

// Function to broadcast an event to all connected clients
function broadcastToAll(eventName, data) {
  if (io) {
    io.emit(eventName, data); // Emits to all connected clients
    console.log(`Broadcasted event '${eventName}' to all clients with data:`, data);
  } else {
    console.error('Socket.IO not initialized. Cannot broadcast.');
  }
}


function initializeSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    }
  }); // Assign to the module-scoped io

  // Authentication Middleware (io.use(...))
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      console.log(`Socket ${socket.id}: Auth error - No token.`);
      return next(new Error('Authentication error: No token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        console.log(`Socket ${socket.id}: Auth error - User not found.`);
        return next(new Error('Authentication error: User not found'));
      }
      socket.user = user;
      // console.log(`Socket ${socket.id}: Authenticated as ${user.email}`); // Keep console less verbose for this step
      next();
    } catch (error) {
      // console.log(`Socket ${socket.id}: Auth error - Invalid token. ${error.message}`); // Keep console less verbose
      if (error.name === 'TokenExpiredError') return next(new Error('Authentication error: Token expired'));
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected and authenticated: ${socket.id}, User: ${socket.user.email}`);
    socket.emit('serverMessage', { text: `Welcome ${socket.user.email}! You are connected.` });

    socket.on('joinRoom', (roomName, callback) => {
      if (typeof roomName !== 'string' || roomName.trim() === '') {
        if (typeof callback === 'function') callback({ success: false, message: 'Invalid room name.' });
        return;
      }
      const cleanRoomName = roomName.trim();
      socket.join(cleanRoomName);
      console.log(`User ${socket.user.email} (${socket.id}) joined room: ${cleanRoomName}`);
      socket.emit('serverMessage', { text: `You have joined room: ${cleanRoomName}` });
      if (typeof callback === 'function') callback({ success: true, message: `Successfully joined room: ${cleanRoomName}` });
    });

    socket.on('leaveRoom', (roomName, callback) => {
      if (typeof roomName !== 'string' || roomName.trim() === '') {
        if (typeof callback === 'function') callback({ success: false, message: 'Invalid room name.' });
        return;
      }
      const cleanRoomName = roomName.trim();
      socket.leave(cleanRoomName);
      console.log(`User ${socket.user.email} (${socket.id}) left room: ${cleanRoomName}`);
      socket.emit('serverMessage', { text: `You have left room: ${cleanRoomName}` });
       if (typeof callback === 'function') callback({ success: true, message: `Successfully left room: ${cleanRoomName}` });
    });

    socket.on('clientMessage', (data) => {
      const targetRoom = data.room;
      if (targetRoom && typeof targetRoom === 'string' && targetRoom.trim() !== '') {
        const cleanTargetRoom = targetRoom.trim();
        if (socket.rooms.has(cleanTargetRoom)) {
            // console.log(`Message from ${socket.user.email} to room ${cleanTargetRoom}:`, data.text); // Keep console less verbose
            socket.to(cleanTargetRoom).emit('roomMessage', { user: socket.user.email, room: cleanTargetRoom, text: data.text });
        } else {
            socket.emit('serverError', {message: `You are not in room '${cleanTargetRoom}' or it's invalid.`});
        }
      } else {
        // console.log(`Direct message from ${socket.user.email} (${socket.id}):`, data.text); // Keep console less verbose
        socket.emit('serverMessage', { text: `Server received your direct message: "${data.text}"` });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, User: ${socket.user?.email}. Reason: ${reason}`);
    });

    socket.on('error', (error) => {
        console.error(`Socket error for client ${socket.id}, User: ${socket.user?.email}:`, error);
    });
  });

  io.engine.on("connection_error", (err) => {
      // console.error("Socket.IO connection_error:", `Code: ${err.code}, Message: ${err.message}, SID: ${err.req?.sid}, Context: ${err.context?.message || 'N/A'}`); // Keep console less verbose
  });
  return io; // Return io instance for potential direct use in index.js if needed
}

module.exports = {
  initializeSocketIO,
  broadcastToRoom,
  broadcastToAll,
  // getIO: () => io // Another option to get the io instance directly
};
