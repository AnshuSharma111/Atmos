// api/index.js - Vercel serverless entry point
import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';
import { setupSocketHandlers } from '../socket-handlers';

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// This is important for Vercel serverless functions
export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('*First use, starting Socket.IO server');
    
    // Create HTTP server
    const httpServer = createServer(app);
    
    // Create Socket.IO server
    const io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      addTrailingSlash: false,
      path: '/api/socketio',
    });

    // Set up socket handlers
    setupSocketHandlers(io);
    
    // Store io instance to reuse on subsequent requests
    res.socket.server.io = io;
  } else {
    console.log('Socket.IO server already running');
  }

  res.end('Socket.IO server is running');
}