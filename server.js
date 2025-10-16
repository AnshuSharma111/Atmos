/**
 * Atmos - Simple Signaling Server
 * Supports multiple broadcasters with multiple viewers
 */

const config = require('./config');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Track active broadcasters
const broadcasters = new Map(); // Map of broadcaster ID -> metadata

// Configure CORS
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// Basic server info endpoint
app.get('/api/server-info', (req, res) => {
  res.json({
    status: 'online',
    broadcasters: broadcasters.size,
    serverTime: new Date().toISOString()
  });
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  const activeBroadcasters = Array.from(broadcasters.entries()).map(([id, metadata]) => ({
    id,
    name: metadata.name,
    monitorNumber: metadata.monitorNumber,
    connected: metadata.connected
  }));

  res.json({
    status: 'online',
    server: 'Atmos WebRTC Signaling Server',
    broadcasters: {
      count: broadcasters.size,
      active: activeBroadcasters
    },
    serverTime: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Socket.io logic for WebRTC signaling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Log connection information
  const clientInfo = {
    id: socket.id,
    address: socket.handshake.address,
    time: new Date().toISOString(),
    userAgent: socket.handshake.headers['user-agent'] || 'Unknown'
  };
  console.log('Connection details:', JSON.stringify(clientInfo));
  
  // Function to get the next monitor number
  function getNextMonitorNumber() {
    const usedNumbers = Array.from(broadcasters.values())
      .map(b => b.monitorNumber || 0);
    
    let nextNumber = 1;
    while (usedNumbers.includes(nextNumber)) {
      nextNumber++;
    }
    
    return nextNumber;
  }
  
  // Handle broadcaster registration
  socket.on('register-broadcaster', (metadata = {}) => {
    // Use custom ID if provided, otherwise use socket ID
    const broadcasterId = metadata.id || socket.id;
    
    // Store broadcaster information
    broadcasters.set(broadcasterId, {
      id: broadcasterId,
      socketId: socket.id,
      name: metadata.name || `Stream ${getNextMonitorNumber()}`,
      monitorNumber: getNextMonitorNumber(),
      connected: true
    });
    
    console.log(`Broadcaster registered: ${broadcasterId} (${broadcasters.get(broadcasterId).name})`);
    
    // Notify viewers about new broadcaster
    socket.broadcast.emit('broadcaster-joined', {
      id: broadcasterId,
      name: broadcasters.get(broadcasterId).name,
      monitorNumber: broadcasters.get(broadcasterId).monitorNumber
    });
    
    // Notify the broadcaster of its monitor number
    socket.emit('monitor-number', {
      broadcasterId: broadcasterId,
      number: broadcasters.get(broadcasterId).monitorNumber
    });
  });
  
  // Handle broadcaster explicitly unregistering
  socket.on('unregister-broadcaster', (data) => {
    const broadcasterId = data.id;
    
    if (broadcasterId && broadcasters.has(broadcasterId)) {
      console.log(`Broadcaster explicitly unregistered: ${broadcasterId}`);
      
      // Remove from the broadcasters list
      broadcasters.delete(broadcasterId);
      
      // Notify all clients that this broadcaster has left
      socket.broadcast.emit('broadcaster-disconnected', broadcasterId);
    }
  });
  
  // Handle viewer's request for broadcaster list
  socket.on('list-broadcasters', () => {
    const activeBroadcasters = Array.from(broadcasters.entries())
      .filter(([_, metadata]) => metadata.connected)
      .map(([id, metadata]) => ({
        id,
        name: metadata.name,
        monitorNumber: metadata.monitorNumber
      }));
    
    socket.emit('broadcaster-list', activeBroadcasters);
  });
  
  // Handle viewer's request to connect to a specific broadcaster
  socket.on('connect-to-broadcaster', (broadcasterId) => {
    console.log(`Viewer ${socket.id} requesting connection to broadcaster ${broadcasterId}`);
    
    if (broadcasters.has(broadcasterId)) {
      const broadcaster = broadcasters.get(broadcasterId);
      
      // Notify the broadcaster that a viewer wants to connect
      io.to(broadcaster.socketId).emit('viewer-requested-connection', {
        viewerId: socket.id
      });
      
      console.log(`Notified broadcaster ${broadcasterId} that viewer ${socket.id} wants to connect`);
    } else {
      console.warn(`Viewer ${socket.id} tried to connect to non-existent broadcaster ${broadcasterId}`);
    }
  });
  
  // Handle WebRTC signaling: offer
  socket.on('offer', (data) => {
    try {
      console.log('[SERVER] Received offer, full data:', JSON.stringify(data, null, 2));
      console.log('[SERVER] Offer keys:', Object.keys(data));
      console.log('[SERVER] broadcasterId:', data.broadcasterId);
      console.log('[SERVER] targetViewerId:', data.targetViewerId);
      
      // Handle case where broadcasterId might be null
      let broadcasterId = data.broadcasterId;
      
      if (!broadcasterId) {
        console.error('Invalid offer: missing broadcasterId');
        
        // Check if this socket is already registered as a broadcaster
        let existingBroadcaster = null;
        for (const [id, metadata] of broadcasters.entries()) {
          if (metadata.socketId === socket.id) {
            existingBroadcaster = id;
            break;
          }
        }
        
        if (existingBroadcaster) {
          // Use the existing broadcaster ID
          broadcasterId = existingBroadcaster;
          console.log(`Using existing broadcaster ID ${broadcasterId} for socket ${socket.id}`);
        } else {
          // Try to recover by using socket ID as fallback
          broadcasterId = socket.id;
          console.log(`Using socket ID ${socket.id} as fallback broadcasterId`);
          
          // Register this socket as a broadcaster with its socket ID
          broadcasters.set(socket.id, {
            id: socket.id,
            socketId: socket.id,
            name: `Stream ${getNextMonitorNumber()}`,
            monitorNumber: getNextMonitorNumber(),
            connected: true,
            lastActivity: Date.now()
          });
        }
      }
      
      console.log(`Processing offer from broadcaster: ${broadcasterId}`);
      
      // Update broadcaster's last activity time
      if (broadcasters.has(broadcasterId)) {
        const broadcaster = broadcasters.get(broadcasterId);
        broadcaster.lastActivity = Date.now();
        broadcasters.set(broadcasterId, broadcaster);
      } else {
        console.warn(`Offer from unregistered broadcaster: ${broadcasterId}, registering now`);
        // Auto-register this broadcaster
        broadcasters.set(broadcasterId, {
          id: broadcasterId,
          socketId: socket.id,
          name: `Stream ${getNextMonitorNumber()}`,
          monitorNumber: getNextMonitorNumber(),
          connected: true,
          lastActivity: Date.now()
        });
      }
      
      // Validate SDP before broadcasting
      if (!data.sdp) {
        console.error('Invalid offer: missing or invalid SDP');
        return;
      }
      
      // Ensure we always have a valid SDP object with type to broadcast
      let sdpToSend = data.sdp;
      if (typeof sdpToSend === 'object' && !sdpToSend.type) {
        sdpToSend.type = 'offer';
      }
      
      // Check if this offer is targeted to a specific viewer
      if (data.targetViewerId) {
        // Send offer to specific viewer only
        console.log(`[SERVER] Sending offer from ${broadcasterId} to specific viewer ${data.targetViewerId}`);
        io.to(data.targetViewerId).emit('offer', {
          sdp: sdpToSend,
          broadcasterId: broadcasterId
        });
        
        console.log(`[SERVER] ✓ Sent targeted offer from: ${broadcasterId} to viewer: ${data.targetViewerId}`);
      } else {
        // No target viewer ID - this shouldn't happen with the new architecture
        console.error(`[SERVER] ❌ REJECTED: Offer from ${broadcasterId} has no targetViewerId!`);
        console.error(`[SERVER] This means the broadcaster app is running OLD CODE.`);
        console.error(`[SERVER] Please rebuild and reinstall the mobile app!`);
        console.error(`[SERVER] Expected offer format: {sdp, broadcasterId, targetViewerId}`);
        console.error(`[SERVER] Received keys:`, Object.keys(data));
      }
      
      socket.emit('offer-received', { broadcasterId: broadcasterId });
    } catch (error) {
      console.error('Error handling offer:', error);
      console.error('Error details:', error.stack);
    }
  });
  
  // Handle WebRTC signaling: answer
  socket.on('answer', (data) => {
    try {
      const targetBroadcasterId = data.targetBroadcasterId;
      
      if (!targetBroadcasterId) {
        console.error('Invalid answer: missing targetBroadcasterId', data);
        return;
      }
      
      if (!broadcasters.has(targetBroadcasterId)) {
        console.warn(`Answer for unknown broadcaster: ${targetBroadcasterId}`);
        return;
      }
      
      const broadcaster = broadcasters.get(targetBroadcasterId);
      
      console.log(`Sending answer from ${socket.id} to broadcaster ${targetBroadcasterId}`);
      
      io.to(broadcaster.socketId).emit('answer', {
        sdp: data.sdp,
        viewerId: socket.id
      });
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  });
  
  // Handle WebRTC signaling: ICE candidates
  socket.on('ice-candidate', (data) => {
    try {
      const targetBroadcasterId = data.targetBroadcasterId;
      const broadcasterId = data.broadcasterId;
      const targetViewerId = data.targetViewerId;
      
      if (targetViewerId) {
        // Broadcaster sending ICE candidate to a specific viewer
        console.log(`Forwarding ICE candidate from broadcaster ${broadcasterId || socket.id} to viewer ${targetViewerId}`);
        
        io.to(targetViewerId).emit('ice-candidate', {
          candidate: data.candidate,
          broadcasterId: broadcasterId || socket.id
        });
      } else if (targetBroadcasterId && broadcasters.has(targetBroadcasterId)) {
        // This is a viewer sending ICE candidate to a broadcaster
        const broadcaster = broadcasters.get(targetBroadcasterId);
        console.log(`Forwarding ICE candidate from viewer ${socket.id} to broadcaster ${targetBroadcasterId}`);
        
        io.to(broadcaster.socketId).emit('ice-candidate', {
          candidate: data.candidate,
          viewerId: socket.id
        });
      } else {
        // Legacy: From broadcaster to all viewers (shouldn't happen with new code)
        console.log(`Broadcasting ICE candidate from broadcaster ${broadcasterId || socket.id} to all viewers (legacy)`);
        
        socket.broadcast.emit('ice-candidate', {
          candidate: data.candidate,
          broadcasterId: data.broadcasterId || socket.id
        });
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  });
  
  // Handle camera switch request from viewer
  socket.on('switch-camera', (data) => {
    try {
      const { broadcasterId } = data;
      
      if (!broadcasterId) {
        console.error('[SERVER] Camera switch request missing broadcasterId');
        return;
      }
      
      if (!broadcasters.has(broadcasterId)) {
        console.warn(`[SERVER] Camera switch request for unknown broadcaster: ${broadcasterId}`);
        return;
      }
      
      const broadcaster = broadcasters.get(broadcasterId);
      console.log(`[SERVER] Forwarding camera switch request from viewer ${socket.id} to broadcaster ${broadcasterId}`);
      
      // Forward the request to the broadcaster
      io.to(broadcaster.socketId).emit('switch-camera-request', {
        viewerId: socket.id
      });
      
      console.log(`[SERVER] ✓ Camera switch request sent to broadcaster ${broadcasterId}`);
    } catch (error) {
      console.error('[SERVER] Error handling camera switch request:', error);
    }
  });
  
  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Track all broadcaster IDs that belong to this socket
    const disconnectedBroadcasters = [];
    
    // Check if this was a broadcaster - find ALL entries with this socket ID
    for (const [id, metadata] of broadcasters.entries()) {
      if (metadata.socketId === socket.id) {
        disconnectedBroadcasters.push({ id, name: metadata.name });
        // Remove the broadcaster
        broadcasters.delete(id);
      }
    }
    
    // Log and notify if any broadcasters were removed
    if (disconnectedBroadcasters.length > 0) {
      disconnectedBroadcasters.forEach(broadcaster => {
        console.log(`Broadcaster disconnected: ${broadcaster.id} (${broadcaster.name || 'unnamed'})`);
        // Notify all clients
        io.emit('broadcaster-disconnected', broadcaster.id);
      });
      
      // Log active broadcasters after removal
      console.log(`Active broadcasters remaining: ${broadcasters.size}`);
      if (broadcasters.size > 0) {
        console.log('Remaining broadcasters:');
        for (const [bid, data] of broadcasters.entries()) {
          console.log(`- ${bid} (${data.name || 'unnamed'})`);
        }
      }
    }
  });
});

// Start the server
const PORT = config.port;

// Detect available network interfaces
function getNetworkAddresses() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const results = {};

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }

  return results;
}

server.listen(PORT, () => {
  const networkAddresses = getNetworkAddresses();
  const isProduction = config.isProduction;
  const isRender = config.isRender;
  
  let addressList = '';
  
  if (isRender) {
    // Running on Render
    const renderUrl = config.renderUrl;
    addressList = `║   ${renderUrl.padEnd(40)} ║`;
  } else {
    // Local development - show network addresses
    for (const [iface, addresses] of Object.entries(networkAddresses)) {
      addresses.forEach(addr => {
        addressList += `║   http://${addr}:${PORT}              ║\n`;
      });
    }
    addressList = addressList.trim();
  }
  
  console.log(`
╔══════════════════════════════════════════╗
║                                          ║
║   Atmos Streaming Server                 ║
║   Running on port ${PORT}${isProduction ? ' (Production)' : '          '}          ║
║                                          ║
║   Available at:                          ║
${addressList}
║                                          ║
╚══════════════════════════════════════════╝
  `);
  
  if (isRender) {
    console.log(`WebRTC signaling server started on Render (port ${PORT})`);
    console.log(`📱 Mobile app should connect to: https://atmos-7hli.onrender.com`);
    console.log(`🌐 Viewer available at:`);
    console.log(`   - GitHub Pages: https://anshusharma111.github.io/Atmos/`);
    console.log(`   - Direct: https://atmos-7hli.onrender.com/viewer.html`);
    console.log(`🔍 Debug endpoint: https://atmos-7hli.onrender.com/api/debug`);
  } else {
    console.log(`WebRTC signaling server started on port ${PORT}`);
    console.log(`Access the viewer at: http://localhost:${PORT}/viewer.html`);
  }
});