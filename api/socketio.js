// api/socketio.js - Socket.IO specific API route for Vercel
const { Server } = require('socket.io');
const { setupSocketHandlers } = require('../socket-handlers');

// Track if Socket.IO server is initialized
let io;

module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Connection, Upgrade, Sec-WebSocket-Extensions, Sec-WebSocket-Key, Sec-WebSocket-Version');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (!io) {
    console.log('Initializing Socket.IO server in socketio.js');
    
    // Initialize Socket.IO
    io = new Server({
      cors: { 
        origin: '*', 
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
      },
      path: '/api/socketio',
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 30000,
      allowUpgrades: true,
      perMessageDeflate: true,
      httpCompression: true,
      connectTimeout: 45000
    });
    
    // Set up socket handlers
    setupSocketHandlers(io);
    
    // Attach Socket.IO to the current request
    io.attach(res.socket.server);
    
    console.log('Socket.IO server initialized in socketio.js');
  } else {
    console.log('Socket.IO server already running in socketio.js');
  }

  res.status(200).json({ status: 'Socket.IO server is running' });
}