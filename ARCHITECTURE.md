# Atmos System Architecture Changes

This document outlines the architectural changes made to transform the Atmos system from a single-broadcaster multi-viewer system to a multi-broadcaster single-viewer system.

## Original Architecture

The original system was designed with the following architecture:

```
+-------------+          +------------+          +-------------+
| Mobile App  | -------> | Signaling  | <------- | Web Viewer  |
| (Single     |          | Server     |          | (Multiple   |
| Broadcaster)|          |            |          | Viewers)    |
+-------------+          +------------+          +-------------+
      |                                                 ^
      |                                                 |
      +--------------------WebRTC Stream----------------+
```

Key characteristics:
- Only one mobile device could broadcast at a time
- Multiple web browsers could view the stream
- Simple broadcaster/viewer relationship
- No monitor numbering or identification

## New Architecture

The new system has been redesigned with the following architecture:

```
+-------------+
| Mobile App 1| \
| (Monitor 1) |  \
+-------------+   \
                   \        +------------+          +-------------+
+-------------+     \-----> | Signaling  | <------- | Web Viewer  |
| Mobile App 2|      /----> | Server     |          | (Single     |
| (Monitor 2) |     /       |            |          | Monitoring  |
+-------------+    /        +------------+          | Station)    |
                  /                                 +-------------+
+-------------+  /                                        ^
| Mobile App N| /                                         |
| (Monitor N) |/                                          |
+-------------+                                           |
      |                                                   |
      +--------------------WebRTC Streams-----------------+
```

Key changes:
1. **Multiple Broadcasters**: The system now supports multiple mobile devices broadcasting simultaneously
2. **Automatic Monitor Numbering**: Each broadcaster is automatically assigned a monitor number (Monitor 1, Monitor 2, etc.)
3. **Enhanced Server**: Consolidated server handling both WebRTC signaling and frame captures
4. **Dynamic Connection Management**: The server tracks individual broadcaster connections and routes messages appropriately
5. **Improved Viewer Interface**: The web viewer now displays multiple video streams with monitor identification

## Technical Implementation Details

1. **Mobile App Changes**:
   - Added unique broadcaster identification
   - Added monitor number display
   - Updated WebRTC connection handling for multi-broadcaster support
   - Enhanced error handling and reconnection logic

2. **Server Changes**:
   - Consolidated signaling and frame capture functionality
   - Implemented monitor number assignment
   - Added broadcaster tracking and management
   - Enhanced message routing between specific broadcasters and viewers
   - Improved error handling and connection state tracking

3. **Viewer Interface Changes**:
   - Updated to display multiple video streams
   - Added monitor number display
   - Implemented dynamic grid layout for multiple streams
   - Enhanced frame capture to work with any selected monitor

## File Changes Summary

1. **`App.tsx`**: Updated to support broadcaster identification and monitor number display
2. **`viewer.html`**: Enhanced to support multiple video streams with monitor numbering
3. **`server.js`**: Consolidated server with multi-broadcaster support
4. **`frame-capture-server.js`**: Functionality merged into `server.js`

## Benefits of the New Architecture

1. **Surveillance Capabilities**: Functions like a CCTV system with multiple camera feeds
2. **Better Organization**: Automatic monitor numbering provides clear identification
3. **Scalability**: System can handle many broadcasting devices simultaneously
4. **Maintainability**: Consolidated server code is easier to maintain
5. **Reliability**: Enhanced connection tracking improves reliability