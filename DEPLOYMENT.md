# Atmos: Environment Monitoring System

## Overview
Atmos is a real-time environmental monitoring system that enables remote camera streaming for emissions monitoring. The system uses WebRTC for real-time video streaming between devices and Socket.IO for signaling.

## Live Demo
The application is deployed and can be accessed at:
- [Vercel Deployment](https://your-vercel-app-name.vercel.app)

## Technical Architecture
- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js with Express
- **Real-time Communication**: WebRTC and Socket.IO
- **Deployment**: Vercel, with options for Render or Heroku

## Connection Setup
The system supports multiple connection methods:
1. **Automatic**: Click "Connect to Server" to connect to the default server
2. **Manual IP Connection**: Use "Connect via IP" to specify a custom server address
3. **Deployed Environment**: Automatically detects deployment platform (Vercel, Render, Heroku)

## Deployment Options

### Vercel Deployment
The system is configured to work seamlessly with Vercel:
- Socket.IO configured with the correct path (/api/socketio)
- Server endpoints mapped in vercel.json

### Local Development
Run the server locally:
```
npm install
node server.js
```
Access the viewer at http://localhost:3001

## Troubleshooting
If you encounter connection issues:
1. Check that the server is running
2. Verify you're on the same network if connecting locally
3. Check firewall settings
4. For "Connection Error: timeout", verify the server is accessible from your location
5. For deployment issues, check the server logs

## Future Improvements
- Add authentication for secure connections
- Implement data encryption for sensitive monitoring
- Add server clustering for better availability
- Improve error handling and recovery mechanisms