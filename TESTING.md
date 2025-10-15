# HackChrono Live Streaming App - Testing Guide

This guide will help you test the WebRTC streaming functionality between the mobile app and web viewer.

## Setup Instructions

### 1. Start the Signaling Server

Open a terminal in the `HackChronoApp` directory and run:

```bash
node server.js
```

This will start the signaling server on port 3000. The server will display its IP address - make note of this for the next steps.

### 2. Update the Mobile App (if needed)

In `App.tsx`, verify that `SIGNALING_SERVER_URL` is set to the correct IP address displayed by the server:

```typescript
const SIGNALING_SERVER_URL = 'http://YOUR_SERVER_IP:3000';
```

### 3. Run the React Native App

In another terminal window, start the React Native app:

```bash
npx react-native run-android
# or
npx react-native run-ios
```

### 4. Open the Web Viewer

Open a web browser and navigate to:
```
http://YOUR_SERVER_IP:3000
```

## Testing Workflow

1. **Start the Mobile App**
   - Grant camera and microphone permissions when prompted
   - You should see the camera preview

2. **Open the Web Viewer**
   - Click the "Connect to Stream" button to connect to the signaling server
   - Status should change to "Connected to server. Waiting for stream..."

3. **Start Streaming**
   - In the mobile app, tap the "Go Live" button
   - The app should show "LIVE" indicator and switch to streaming mode
   - The web viewer should receive the connection and display the video

4. **Check the Connection Status**
   - You can check the server status at: `http://YOUR_SERVER_IP:3000/status`
   - This will show the active connections and their statuses

5. **End the Stream**
   - In the mobile app, tap "Stop Live" to end the streaming session
   - The web viewer should show the stream has disconnected

## Troubleshooting

### No Video in Web Viewer
- Check browser console for WebRTC errors
- Make sure camera permissions are granted on the mobile device
- Verify the signaling server is running and both devices are connected
- Look for "Got remote track" logs in the browser console

### Connection Issues
- Ensure both devices are on the same network
- Check firewall settings that might block WebRTC connections
- Verify the correct IP address is being used

### Browser Support
- WebRTC is best supported in Chrome, Firefox, and Safari
- Some mobile browsers may have limited WebRTC support

## Logging

- The app, viewer, and server all have enhanced logging
- Check the console outputs for detailed information on the connection process
- Look for log messages about ICE candidates, SDP offers/answers, and tracks

## Debug Mode

For more detailed debugging:
- On the web viewer, open browser developer tools (F12) and go to the Console tab
- In the React Native app, check the Metro bundler console for logs