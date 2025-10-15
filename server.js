// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve viewer.html at the root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/viewer.html');
});

// Add a status route to check server status and connections
app.get('/status', (req, res) => {
  const status = {
    server: 'running',
    broadcaster: broadcasterSocket ? {
      id: broadcasterSocket.id,
      connected: broadcasterSocket.connected
    } : null,
    viewers: Array.from(viewerSockets).map(s => ({
      id: s.id,
      connected: s.connected
    })),
    totalConnections: io.engine.clientsCount
  };
  
  res.json(status);
});

// Keep track of broadcaster and viewer sockets
let broadcasterSocket = null;
const viewerSockets = new Set();
// Store the latest offer to send to new viewers
let latestOffer = null;

// Log server start with timestamp
const startTime = new Date().toISOString();
console.log(`🚀 Server starting at ${startTime}`);

io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);
  console.log(`Current state - Broadcaster: ${broadcasterSocket?.id || 'none'}, Viewers: ${viewerSockets.size}`);

  socket.on("offer", (offer) => {
    console.log("📣 Received offer from:", socket.id);
    
    // Log SDP info (partially)
    if (offer && offer.sdp) {
      console.log(`SDP snippet: ${offer.sdp.substring(0, 50)}...`);
      
      // Check if offer contains video and audio
      const hasVideo = offer.sdp.includes("m=video");
      const hasAudio = offer.sdp.includes("m=audio");
      console.log(`Offer contains: ${hasVideo ? '✓' : '✗'} video, ${hasAudio ? '✓' : '✗'} audio`);
    }
    
    // This socket is the broadcaster
    broadcasterSocket = socket;
    // Store the latest offer to send to any new viewers
    latestOffer = offer;
    
    // Inform all viewers there's a broadcaster
    if (viewerSockets.size > 0) {
      console.log(`🔄 Forwarding offer to ${viewerSockets.size} viewer(s)`);
      viewerSockets.forEach(viewerSocket => {
        viewerSocket.emit("offer", offer);
      });
    } else {
      console.log("No viewers connected yet");
    }
  });

  socket.on("answer", (answer) => {
    console.log("📩 Received answer from:", socket.id);
    
    // The viewer is already in the set due to the 'join-stream' event
    // Forward answer to broadcaster
    if (broadcasterSocket && broadcasterSocket.id !== socket.id) {
      console.log("🔄 Forwarding answer to broadcaster:", broadcasterSocket.id);
      broadcasterSocket.emit("answer", answer);
    } else {
      console.log("⚠️ No broadcaster available to receive answer");
    }
  });

  // NEW: A viewer requests to join the stream
  socket.on("join-stream", () => {
    console.log("👥 Viewer attempting to join:", socket.id);

    // Add the socket to the viewers set immediately
    viewerSockets.add(socket);
    console.log(`Added viewer. Now have ${viewerSockets.size} viewer(s)`);

    // If a broadcaster offer exists, send it to this specific viewer
    if (broadcasterSocket && latestOffer) {
      console.log(`📡 Sending stored offer to new viewer: ${socket.id}`);
      socket.emit("offer", latestOffer);
    } else {
      console.log("No broadcaster available yet, viewer will wait for offer");
    }
  });

  socket.on("ice-candidate", (candidate) => {
    console.log("🧊 ICE candidate from:", socket.id);
    
    // Log candidate type if available
    if (candidate && candidate.candidate) {
      const candidateStr = candidate.candidate;
      const candidateType = 
        candidateStr.includes("host") ? "host" :
        candidateStr.includes("srflx") ? "server reflexive" :
        candidateStr.includes("relay") ? "relay" : "unknown";
      
      console.log(`ICE candidate type: ${candidateType}`);
    }
    
    // If from broadcaster, send to all viewers
    if (broadcasterSocket && socket.id === broadcasterSocket.id) {
      if (viewerSockets.size > 0) {
        console.log(`🔄 Forwarding broadcaster ICE candidate to ${viewerSockets.size} viewer(s)`);
        viewerSockets.forEach(viewerSocket => {
          viewerSocket.emit("ice-candidate", candidate);
        });
      } else {
        console.log("No viewers to send ICE candidate to");
      }
    } 
    // If from viewer, send to broadcaster only
    else if (broadcasterSocket) {
      console.log("🔄 Forwarding viewer ICE candidate to broadcaster");
      broadcasterSocket.emit("ice-candidate", candidate);
    } else {
      console.log("⚠️ No broadcaster to send ICE candidate to");
    }
  });

  socket.on("disconnect", () => {
    console.log("👋 Client disconnected:", socket.id);
    
    // If broadcaster disconnected, clean up
    if (broadcasterSocket && socket.id === broadcasterSocket.id) {
      console.log("📢 Broadcaster disconnected, notifying all viewers");
      broadcasterSocket = null;
      latestOffer = null; // Clear the stored offer
      io.emit("broadcaster-disconnected");
    }
    
    // Remove from viewers if it was a viewer
    const wasViewer = viewerSockets.delete(socket);
    if (wasViewer) {
      console.log(`👥 Viewer disconnected. ${viewerSockets.size} viewer(s) remaining`);
    }
    
    // Log current state
    console.log(`Current state - Broadcaster: ${broadcasterSocket?.id || 'none'}, Viewers: ${viewerSockets.size}`);
  });
});

server.listen(3000, () => {
  const ip = Object.values(require('os').networkInterfaces())
    .flat()
    .filter(details => details.family === 'IPv4' && !details.internal)
    .map(details => details.address)[0];
  
  console.log(`🚀 Signaling server running on port 3000`);
  console.log(`📱 Mobile app should connect to: http://${ip}:3000`);
  console.log(`🌐 Web viewer available at: http://${ip}:3000`);
  console.log(`📊 Status endpoint: http://${ip}:3000/status`);
});