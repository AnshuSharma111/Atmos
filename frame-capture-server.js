// Create the uploads directory to store captured frames
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

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

// Socket.io logic for WebRTC signaling
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);
  
  socket.on('join-stream', () => {
    console.log('Client joined stream:', socket.id);
    socket.broadcast.emit('viewer-joined', socket.id);
  });

  socket.on('offer', (offer) => {
    console.log('Received offer from broadcaster');
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    console.log('Received answer from viewer');
    socket.broadcast.emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate) => {
    console.log('Received ICE candidate');
    socket.broadcast.emit('ice-candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    socket.broadcast.emit('broadcaster-disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`- Frame upload endpoint: http://localhost:${PORT}/api/save-frames`);
  console.log(`- Frame listing endpoint: http://localhost:${PORT}/api/frames`);
  console.log(`- WebRTC signaling server running`);
});