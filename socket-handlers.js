// socket-handlers.js - Extracted socket handlers from server.js
const broadcasters = new Map();

export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    
    // Handle viewer connections
    socket.on('viewer-connect', () => {
      // Send the current list of broadcasters to the new viewer
      const activeBroadcasters = Array.from(broadcasters.entries())
        .filter(([_, metadata]) => metadata.connected)
        .map(([id, metadata]) => ({
          id,
          name: metadata.name || 'Unknown',
          monitorNumber: metadata.monitorNumber
        }));
      
      socket.emit('broadcaster-list', activeBroadcasters);
    });
    
    // Same handler for the "list-broadcasters" event for compatibility
    socket.on('list-broadcasters', () => {
      const activeBroadcasters = Array.from(broadcasters.entries())
        .filter(([_, metadata]) => metadata.connected)
        .map(([id, metadata]) => ({
          id,
          name: metadata.name || 'Unknown',
          monitorNumber: metadata.monitorNumber
        }));
      
      socket.emit('broadcaster-list', activeBroadcasters);
    });
    
    // Handle broadcaster connections
    socket.on('broadcaster-connect', (name) => {
      console.log(`🎥 Broadcaster connected: ${socket.id} (${name || 'Unnamed'})`);
      
      // Add this broadcaster to our list
      broadcasters.set(socket.id, {
        name: name || 'Unnamed Device',
        connected: true,
        monitorNumber: getNextMonitorNumber(),
        lastSeen: new Date().toISOString()
      });
      
      // Notify all viewers that a new broadcaster is available
      socket.broadcast.emit('broadcaster-joined', {
        id: socket.id,
        name: broadcasters.get(socket.id).name,
        monitorNumber: broadcasters.get(socket.id).monitorNumber
      });
    });
    
    // Handle viewer's request to connect to a specific broadcaster
    socket.on('viewer-request-connection', (broadcasterId) => {
      console.log(`👀 Viewer ${socket.id} requesting connection to broadcaster ${broadcasterId}`);
      
      if (broadcasters.has(broadcasterId)) {
        // Forward the request to the specified broadcaster
        socket.to(broadcasterId).emit('viewer-requested-connection', socket.id);
      } else {
        socket.emit('error', { message: 'Requested broadcaster is not available' });
      }
    });
    
    // Handle broadcaster's offer to viewer
    socket.on('broadcaster-offer', ({ to, description }) => {
      socket.to(to).emit('broadcaster-offer', {
        from: socket.id,
        description
      });
    });
    
    // Handle viewer's answer to broadcaster
    socket.on('viewer-answer', ({ to, description }) => {
      socket.to(to).emit('viewer-answer', {
        from: socket.id,
        description
      });
    });
    
    // Handle ICE candidates
    socket.on('ice-candidate', ({ to, candidate }) => {
      socket.to(to).emit('ice-candidate', {
        from: socket.id,
        candidate
      });
    });
    
    // Handle disconnections
    socket.on('disconnect', () => {
      if (broadcasters.has(socket.id)) {
        console.log(`🎥 Broadcaster disconnected: ${socket.id}`);
        
        // Mark as disconnected but keep for history
        const broadcaster = broadcasters.get(socket.id);
        broadcaster.connected = false;
        broadcaster.lastSeen = new Date().toISOString();
        broadcasters.set(socket.id, broadcaster);
        
        // Notify all viewers that this broadcaster is gone
        socket.broadcast.emit('broadcaster-left', socket.id);
      } else {
        console.log(`👀 Client disconnected: ${socket.id}`);
      }
    });
  });
}

// Helper function to get the next monitor number
function getNextMonitorNumber() {
  let highestNumber = 0;
  
  broadcasters.forEach(metadata => {
    if (metadata.monitorNumber > highestNumber) {
      highestNumber = metadata.monitorNumber;
    }
  });
  
  return highestNumber + 1;
}