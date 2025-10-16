// Server endpoints with debugging info
const express = require('express');
const router = express.Router();

router.get('/debug', (req, res) => {
  const debug = {
    headers: req.headers,
    secure: req.secure,
    hostname: req.hostname,
    protocol: req.protocol,
    path: req.path,
    socketInfo: {
      status: global.io ? 'Socket.IO server running' : 'Socket.IO server not initialized',
      connectedClients: global.io ? Object.keys(global.io.sockets.sockets).length : 0,
      transport: global.io && global.io.engine ? global.io.engine.transport.name : 'unknown'
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(debug);
});

// Basic health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;