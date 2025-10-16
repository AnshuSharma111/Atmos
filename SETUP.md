# Atmos Monitoring System Setup Guide

This document provides instructions on how to set up and run the complete Atmos Monitoring System, including the mobile app, signaling server, and web viewer interface.

## Prerequisites

- Node.js v14 or later
- npm or Yarn
- React Native development environment set up
- Android Studio or Xcode (depending on your target platform)
- A mobile device or emulator/simulator for testing

## Setting Up the Server

1. **Start the signaling server:**

   ```sh
   # Navigate to the project root
   cd Atmos
   
   # Install dependencies if not already done
   npm install
   
   # Start the signaling server
   node frame-capture-server.js
   ```

   The server will start on port 3000 by default.

2. **Note your server IP address:**

   The mobile app and web viewer need to connect to this server. If running on the same network, find your local IP address (e.g., 192.168.1.x).

## Setting Up the Web Viewer

1. **Update server address (if needed):**

   Open `viewer.html` and locate the line where the socket connection is initialized:

   ```javascript
   socket = io("http://192.168.220.54:3000");
   ```

   Change the IP address to match your server's address.

2. **Open the viewer interface:**

   Open `viewer.html` in a modern web browser (Chrome, Firefox, etc.).

3. **Connect to the server:**

   Click the "Connect to Server" button to establish a connection with the signaling server.

## Setting Up the Mobile App

1. **Update server address:**

   Open `App.tsx` and locate the line where the socket connection is initialized:

   ```javascript
   const socket = socketIOClient('http://192.168.220.54:3000');
   ```

   Change the IP address to match your server's address.

2. **Build and run the app:**

   Follow the standard React Native process to build and run the app on your device or emulator.

   ```sh
   # For Android
   npx react-native run-android
   
   # For iOS
   npx react-native run-ios
   ```

## Testing the System

1. Start the signaling server
2. Open the viewer interface in a web browser and connect to the server
3. Launch the mobile app on one or more devices
4. Grant camera permissions when prompted
5. The mobile devices should appear as numbered monitors in the viewer interface

## Troubleshooting

- **Connection issues:** Make sure all devices are on the same network and can reach the server IP address
- **Video not showing:** Check that camera permissions are granted on the mobile devices
- **Multiple instances not working:** Verify that the server correctly identifies each broadcaster with a unique ID

## Advanced Configuration

- The server disconnection timeout can be adjusted in `frame-capture-server.js`
- The frame capture settings can be modified in `viewer.html`
- The video quality settings can be adjusted in `App.tsx`