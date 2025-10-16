/**
 * Atmos Monitoring System - Simple Server
 * Supports multiple broadcasters with a single viewer interface
 */

// Load environment variables from .env file
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const os = require('os');

// Initialize Express app with minimal setup
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

// Configure upload directory
const uploadDir = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created upload directory: ${uploadDir}`);
}

// Configure CORS
app.use(cors());
app.use(express.json());

// Serve static files (important for deployment)
app.use(express.static(__dirname));

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// Serve the uploads folder
app.use('/uploads', express.static(uploadDir));

// Endpoint to save frames
app.post('/api/save-frames', upload.array('frames'), (req, res) => {
  console.log(`Received ${req.files.length} frames`);
  
  const MAX_FILES = 10;
  
  // After saving new files, check if we need to delete older ones
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).json({ error: 'Failed to manage files' });
    }
    
    // Sort files by creation time (oldest first)
    const sortedFiles = files.map(file => {
      return {
        name: file,
        time: fs.statSync(path.join(uploadDir, file)).birthtime.getTime()
      };
    }).sort((a, b) => a.time - b.time);
    
    // Delete oldest files if we exceed MAX_FILES
    if (sortedFiles.length > MAX_FILES) {
      const filesToDelete = sortedFiles.slice(0, sortedFiles.length - MAX_FILES);
      filesToDelete.forEach(file => {
        fs.unlinkSync(path.join(uploadDir, file.name));
        console.log(`Deleted old file: ${file.name}`);
      });
    }
    
    res.json({ 
      success: true, 
      message: `Saved ${req.files.length} frames`,
      totalFrames: Math.min(files.length, MAX_FILES)
    });
  });
});

// Endpoint to get all frames
app.get('/api/frames', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).json({ error: 'Failed to read files' });
    }
    
    // Sort files by creation time (newest first)
    const sortedFiles = files.map(file => {
      return {
        name: file,
        url: `/uploads/${file}`,
        time: fs.statSync(path.join(uploadDir, file)).birthtime.getTime()
      };
    }).sort((a, b) => b.time - a.time);
    
    res.json(sortedFiles);
  });
});

// Get active broadcasters
app.get('/api/broadcasters', (req, res) => {
  const broadcasterList = Array.from(broadcasters.entries()).map(([id, metadata]) => ({
    id,
    name: metadata.name,
    location: metadata.location,
    connected: metadata.connected,
    lastSeen: metadata.lastSeen
  }));
  
  res.json(broadcasterList);
});

// Socket.io logic for WebRTC signaling
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  
  // Function to get the next monitor number
  function getNextMonitorNumber() {
    let usedNumbers = [];
    
    // Get all currently used monitor numbers
    for (const [id, broadcaster] of broadcasters.entries()) {
      if (broadcaster.monitorNumber) {
        usedNumbers.push(broadcaster.monitorNumber);
      }
    }
    
    // Start from 1 and find the first available number
    let nextNumber = 1;
    while (usedNumbers.includes(nextNumber)) {
      nextNumber++;
    }
    
    return nextNumber;
  }
  
  // Handle broadcaster registration
  socket.on('register-broadcaster', (metadata = {}) => {
    console.log(`New broadcaster registered:`, metadata);
    
    // Use custom ID if provided, otherwise use socket ID
    const broadcasterId = metadata.id || socket.id;
    socket.broadcasterId = broadcasterId;
    
    // Get next monitor number
    const monitorNumber = getNextMonitorNumber();
    const monitorName = `Monitor ${monitorNumber}`;
    
    // Store broadcaster information
    broadcasters.set(broadcasterId, {
      id: broadcasterId,
      socketId: socket.id,
      name: metadata.name || monitorName,
      monitorNumber: monitorNumber,
      location: metadata.location || 'Unknown',
      connected: true,
      lastSeen: new Date().toISOString()
    });
    
    // Log all current broadcasters for debugging
    console.log('Current broadcasters:');
    broadcasters.forEach((value, key) => {
      console.log(`- ${key}: ${value.name} (Monitor ${value.monitorNumber})`);
    });
    
    // Notify viewers about new broadcaster
    socket.broadcast.emit('broadcaster-joined', {
      id: broadcasterId,
      name: monitorName,
      monitorNumber: monitorNumber,
      location: broadcasters.get(broadcasterId).location
    });
    
    // Also notify the broadcaster of its monitor number
    socket.emit('monitor-number', {
      broadcasterId: broadcasterId,
      number: monitorNumber
    });
  });
  
  // Handle viewer connection
  socket.on('viewer-connect', () => {
    console.log('Viewer connected:', socket.id);
    
    // Send list of all active broadcasters to new viewer
    const activeBroadcasters = Array.from(broadcasters.entries())
      .filter(([_, metadata]) => metadata.connected)
      .map(([id, metadata]) => ({
        id,
        name: metadata.name || `Monitor ${metadata.monitorNumber}`,
        monitorNumber: metadata.monitorNumber,
        location: metadata.location
      }));
    
    socket.emit('broadcaster-list', activeBroadcasters);
  });
  
  // Handle list-broadcasters request
  socket.on('list-broadcasters', () => {
    console.log('Client requested broadcaster list');
    
    // Convert the broadcasters map to an array of active broadcasters
    const activeBroadcasters = Array.from(broadcasters.entries())
      .filter(([_, broadcaster]) => broadcaster.connected)
      .map(([id, broadcaster]) => ({
        id,
        name: broadcaster.name || `Monitor ${broadcaster.monitorNumber}`,
        monitorNumber: broadcaster.monitorNumber,
        location: broadcaster.location
      }));
    
    socket.emit('broadcaster-list', activeBroadcasters);
  });
  
  // Handle viewer requesting connection to a specific broadcaster
  socket.on('connect-to-broadcaster', (broadcasterId) => {
    console.log(`Viewer ${socket.id} requesting connection to broadcaster ${broadcasterId}`);
    
    if (broadcasters.has(broadcasterId)) {
      // Forward the connection request to the specific broadcaster
      socket.to(broadcasterId).emit('viewer-connect-request', socket.id);
    } else {
      // Broadcaster not found
      socket.emit('broadcaster-not-found', broadcasterId);
    }
  });
  
  // Legacy event - keep for compatibility
  socket.on('join-stream', () => {
    console.log('Client joined stream (legacy):', socket.id);
    // Treat as viewer connect
    socket.emit('broadcaster-list', Array.from(broadcasters.entries())
      .filter(([_, metadata]) => metadata.connected)
      .map(([id, metadata]) => ({
        id,
        name: metadata.name,
        location: metadata.location
      })));
  });

  // WebRTC signaling - offer from broadcaster to viewer
  socket.on('offer', (payload) => {
    // Extract the SDP and broadcaster ID
    const sdp = payload.sdp || payload;
    const broadcasterId = payload.broadcasterId || socket.broadcasterId || socket.id;
    
    console.log(`Offer from broadcaster ${broadcasterId}`, JSON.stringify(payload).substring(0, 100) + '...');
    
    // Make sure this broadcaster is registered
    if (!broadcasters.has(broadcasterId)) {
      console.log(`Warning: Received offer from unregistered broadcaster ${broadcasterId}. Adding to registry.`);
      
      // Auto-register this broadcaster if it's not registered yet
      // (This can happen if mobile app reloaded but kept same ID)
      const monitorNumber = getNextMonitorNumber();
      const monitorName = `Monitor ${monitorNumber}`;
      
      broadcasters.set(broadcasterId, {
        id: broadcasterId,
        socketId: socket.id,
        name: monitorName,
        monitorNumber: monitorNumber,
        location: 'Auto-registered',
        connected: true,
        lastSeen: new Date().toISOString()
      });
      
      // Notify broadcaster of its monitor number
      socket.emit('monitor-number', {
        broadcasterId: broadcasterId,
        number: monitorNumber
      });
      
      // Notify viewers about new broadcaster
      socket.broadcast.emit('broadcaster-joined', {
        id: broadcasterId,
        name: monitorName,
        monitorNumber: monitorNumber,
        location: 'Auto-registered'
      });
    }
    
    if (payload.target) {
      // Direct offer to specific viewer
      console.log(`Sending direct offer to viewer ${payload.target}`);
      io.to(payload.target).emit('offer', {
        sdp: sdp,
        broadcasterId: broadcasterId
      });
    } else {
      // Broadcast to all viewers
      console.log(`Broadcasting offer to all viewers`);
      socket.broadcast.emit('offer', {
        sdp: sdp,
        broadcasterId: broadcasterId
      });
    }
  });

  // WebRTC signaling - answer from viewer to broadcaster
  socket.on('answer', (payload) => {
    // Extract the answer and target broadcaster ID
    const answer = payload.sdp || payload.answer || payload;
    const targetBroadcasterId = payload.targetBroadcasterId || payload.target;
    
    console.log(`Answer from viewer ${socket.id} to broadcaster ${targetBroadcasterId}`, 
      JSON.stringify(answer).substring(0, 100) + '...');
    
    if (targetBroadcasterId && broadcasters.has(targetBroadcasterId)) {
      // Get the socket ID for this broadcaster
      const broadcasterSocketId = broadcasters.get(targetBroadcasterId).socketId;
      
      // Make sure we have a properly formatted SDP answer
      const properAnswer = {
        type: 'answer',
        sdp: answer.sdp || answer
      };
      
      console.log(`Sending formatted answer to broadcaster ${targetBroadcasterId}`);
      
      // Send answer to the specific broadcaster
      io.to(broadcasterSocketId).emit('answer', {
        sdp: properAnswer,
        viewer: socket.id
      });
    } else {
      console.log('No target broadcaster found for answer, broadcasting to all');
      // Fallback to legacy behavior
      socket.broadcast.emit('answer', {
        type: 'answer',
        sdp: answer.sdp || answer
      });
    }
  });

  // WebRTC signaling - ICE candidates
  socket.on('ice-candidate', (payload) => {
    // Log the received ICE candidate format for debugging
    console.log('ICE candidate payload received:', JSON.stringify(payload).substring(0, 100) + '...');
    
    // Extract candidate information
    const candidate = payload.candidate || payload;
    const targetBroadcasterId = payload.targetBroadcasterId || payload.target;
    const senderBroadcasterId = payload.broadcasterId || socket.broadcasterId;
    
    // Ensure the candidate has the required properties
    const validCandidate = {
      candidate: candidate.candidate || candidate,
      sdpMLineIndex: candidate.sdpMLineIndex !== undefined ? candidate.sdpMLineIndex : 0,
      sdpMid: candidate.sdpMid || '0',
      usernameFragment: candidate.usernameFragment
    };
    
    if (targetBroadcasterId && broadcasters.has(targetBroadcasterId)) {
      // Viewer sending ICE candidate to specific broadcaster
      console.log(`ICE candidate from viewer ${socket.id} to broadcaster ${targetBroadcasterId}`);
      
      // Get socket ID for this broadcaster
      const broadcasterSocketId = broadcasters.get(targetBroadcasterId).socketId;
      
      io.to(broadcasterSocketId).emit('ice-candidate', {
        candidate: validCandidate,
        sender: socket.id
      });
    } else if (senderBroadcasterId) {
      // Broadcaster sending ICE candidate to all viewers
      console.log(`ICE candidate from broadcaster ${senderBroadcasterId} to viewers`);
      
      socket.broadcast.emit('ice-candidate', {
        candidate: validCandidate,
        broadcasterId: senderBroadcasterId
      });
    } else {
      // Legacy behavior
      console.log('Received ICE candidate (legacy format)');
      socket.broadcast.emit('ice-candidate', validCandidate);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Check if this was a broadcaster by looking at custom ID
    if (socket.broadcasterId && broadcasters.has(socket.broadcasterId)) {
      const broadcasterId = socket.broadcasterId;
      broadcasters.get(broadcasterId).connected = false;
      broadcasters.get(broadcasterId).lastSeen = new Date().toISOString();
      
      // Notify viewers that this specific broadcaster disconnected
      socket.broadcast.emit('broadcaster-disconnected', broadcasterId);
      
      console.log(`Broadcaster ${broadcasterId} disconnected`);
      
      // Optional: Remove broadcaster after some time
      setTimeout(() => {
        if (broadcasters.has(broadcasterId) && !broadcasters.get(broadcasterId).connected) {
          broadcasters.delete(broadcasterId);
          console.log(`Removed inactive broadcaster: ${broadcasterId}`);
        }
      }, 60 * 60 * 1000); // Remove after 1 hour of inactivity
    } else {
      // Check if this was a broadcaster by socket ID (legacy)
      let wasBroadcaster = false;
      for (const [id, broadcaster] of broadcasters.entries()) {
        if (broadcaster.socketId === socket.id) {
          broadcaster.connected = false;
          broadcaster.lastSeen = new Date().toISOString();
          
          // Notify viewers that this broadcaster disconnected
          socket.broadcast.emit('broadcaster-disconnected', id);
          
          console.log(`Broadcaster ${id} disconnected (by socket ID)`);
          wasBroadcaster = true;
          break;
        }
      }
      
      if (!wasBroadcaster) {
        // Was just a viewer, no special handling needed
        console.log('Viewer disconnected:', socket.id);
      }
    }
  });
});

// Serve viewer.html at the root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/viewer.html');
});

// Add a status route to check server status
app.get('/status', (req, res) => {
  const status = {
    server: 'running',
    activeConnections: io.engine.clientsCount,
    broadcasters: Array.from(broadcasters.entries())
      .filter(([_, metadata]) => metadata.connected)
      .map(([id, metadata]) => ({
        id,
        name: metadata.name,
        monitorNumber: metadata.monitorNumber,
        lastSeen: metadata.lastSeen
      }))
  };
  
  res.json(status);
});

// Serve the HTML files directly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'viewer.html'));
});

app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/viewer', (req, res) => {
  res.sendFile(path.join(__dirname, 'viewer.html'));
});

app.get('/viewer.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'viewer.html'));
});

// Start the server
const PORT = process.env.PORT || 3001; // Changed to port 3001 to avoid conflicts
// Listen on all available network interfaces (0.0.0.0)
server.listen(PORT, '0.0.0.0', () => {
  // Get all possible network interfaces
  const networkInterfaces = os.networkInterfaces();
  const ipAddresses = [];

  // Extract all available IP addresses
  Object.keys(networkInterfaces).forEach(interfaceName => {
    const interfaces = networkInterfaces[interfaceName];
    interfaces.forEach(iface => {
      // Skip internal/non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        ipAddresses.push(iface.address);
      }
    });
  });

  const primaryIp = ipAddresses[0] || 'localhost';
  
  console.log(`\n🚀 Atmos Monitoring System Server`);
  console.log(`==================================`);
  console.log(`✅ Server running on port ${PORT}`);
  
  // If multiple IPs found, list all of them
  if (ipAddresses.length > 0) {
    console.log(`\nAvailable IP Addresses to connect from mobile app:`);
    ipAddresses.forEach((ip, index) => {
      console.log(`${index + 1}. http://${ip}:${PORT}`);
    });
    console.log(`\n🔒 Use one of these IP addresses in your App.tsx SIGNALING_SERVER_URL!`);
  } else {
    console.log(`📱 Mobile app should connect to: http://${primaryIp}:${PORT}`);
  }
  
  console.log(`\n🌐 Web viewer available at: http://${primaryIp}:${PORT}`);
  console.log(`🔍 Status endpoint: http://${primaryIp}:${PORT}/status`);
  console.log(`📸 Frame upload API: http://${primaryIp}:${PORT}/api/save-frames`);
  console.log(`📋 Frame listing API: http://${primaryIp}:${PORT}/api/frames`);
  console.log(`📡 WebRTC signaling active (multi-broadcaster mode)`);
  console.log(`==================================\n`);
});