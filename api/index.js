// api/index.js - Vercel serverless entry point
const { Server } = require('socket.io');
const cors = require('cors');
const { setupSocketHandlers } = require('../socket-handlers');

// Track if Socket.IO server is initialized
let io;

// This is important for Vercel serverless functions
module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (!io) {
    console.log('*First use, starting Socket.IO server');
    
    // Initialize Socket.IO
    io = new Server({
      cors: { 
        origin: '*', 
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/api/socketio',
      transports: ['websocket', 'polling']
    });
    
    // Set up socket handlers
    setupSocketHandlers(io);
    
    // Attach Socket.IO to the current request
    io.attach(res.socket.server);
    
    console.log('Socket.IO server initialized');
  } else {
    console.log('Socket.IO server already running');
  }

  res.status(200).json({ status: 'Socket.IO server is running' });
}