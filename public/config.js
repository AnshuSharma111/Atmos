/**
 * Client Configuration
 * This file is served to the browser and provides configuration for the viewer
 * It automatically detects the environment and configures accordingly
 */

(function() {
  'use strict';
  
  // Auto-detect environment based on hostname
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  const isGitHubPages = hostname.includes('github.io');
  const isRenderDirect = hostname.includes('onrender.com');
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isLocalNetwork = hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\./);
  
  // Configuration object
  window.ATMOS_CONFIG = {
    // Detect environment
    environment: isLocalhost || isLocalNetwork ? 'local' : 'production',
    
    // Server URL configuration
    getServerUrl: function() {
      if (isGitHubPages) {
        // GitHub Pages - connect to production backend
        return 'https://atmos-7hli.onrender.com';
      } else if (isRenderDirect) {
        // Deployed on Render - use same server
        return `${protocol}//${hostname}`;
      } else if (isLocalhost) {
        // Local development
        return 'http://localhost:3001';
      } else if (isLocalNetwork) {
        // Local network (e.g., 192.168.x.x)
        return `http://${hostname}:3001`;
      } else {
        // Fallback - try production
        return 'https://atmos-7hli.onrender.com';
      }
    },
    
    // ICE Servers for WebRTC
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.ekiga.net' },
      { urls: 'stun:stun.ideasip.com' }
    ],
    
    // Dashboard configuration
    dashboard: {
      maxFrames: 7,
      captureInterval: 3000, // milliseconds
      frameQuality: 0.8 // JPEG quality (0-1)
    },
    
    // Socket.IO configuration
    socketConfig: {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000
    },
    
    // Debug mode
    debug: isLocalhost || isLocalNetwork,
    
    // Log configuration info
    logInfo: function() {
      console.log('🔧 Atmos Client Configuration:');
      console.log(`   Environment: ${this.environment}`);
      console.log(`   Server URL: ${this.getServerUrl()}`);
      console.log(`   Debug Mode: ${this.debug}`);
      console.log(`   Dashboard Max Frames: ${this.dashboard.maxFrames}`);
      console.log(`   Capture Interval: ${this.dashboard.captureInterval}ms`);
    }
  };
  
  // Log configuration if in debug mode
  if (window.ATMOS_CONFIG.debug) {
    window.ATMOS_CONFIG.logInfo();
  }
  
})();
