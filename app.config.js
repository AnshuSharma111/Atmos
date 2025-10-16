/**
 * Mobile App Configuration
 * Update these values for local development vs production
 */

// ENVIRONMENT CONFIGURATION
// Change this to switch between local and production
const ENVIRONMENT = 'production'; // 'local' or 'production'

// LOCAL DEVELOPMENT CONFIGURATION
// Replace YOUR_LOCAL_IP with your computer's IP address on your local network
// Find your IP: 
//   Windows: Open CMD and run 'ipconfig', look for IPv4 Address
//   Mac: Open Terminal and run 'ifconfig | grep inet'
//   Linux: Open Terminal and run 'hostname -I'
const LOCAL_CONFIG = {
  // Your computer's local IP address (NOT localhost, NOT 127.0.0.1)
  // Example: '192.168.1.100' or '10.0.0.50'
  serverUrl: 'http://192.168.220.54:3001', // <-- CHANGE THIS to your IP
  
  // Port must match your server (default: 3001)
  port: 3001,
  
  // ICE servers for WebRTC
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  
  // Environment metadata
  environment: 'local',
  isDevelopment: true,
  isProduction: false,
  
  // Socket.IO configuration
  socketConfig: {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: true,
  },
};

// PRODUCTION CONFIGURATION
// Update this with your deployed server URL
const PRODUCTION_CONFIG = {
  // Your deployed server URL (e.g., Render, Heroku, etc.)
  serverUrl: 'https://atmos-7hli.onrender.com',
  
  // Port (usually not needed for HTTPS)
  port: 443,
  
  // ICE servers for WebRTC
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.ekiga.net' },
    { urls: 'stun:stun.ideasip.com' },
  ],
  
  // Environment metadata
  environment: 'production',
  isDevelopment: false,
  isProduction: true,
  
  // Socket.IO configuration - optimized for production (Render wake-up)
  socketConfig: {
    transports: ['polling', 'websocket'], // Try polling first for better compatibility
    reconnection: true,
    reconnectionAttempts: 15, // More attempts for Render wake-up
    reconnectionDelay: 2000, // 2 seconds between attempts
    reconnectionDelayMax: 10000, // Max 10 seconds between attempts
    timeout: 60000, // 60 seconds timeout for Render wake-up
    forceNew: true,
    upgrade: true, // Allow upgrade from polling to websocket
    rememberUpgrade: false, // Don't cache the upgrade decision
  },
};

// Export the appropriate configuration based on environment
const AppConfig = ENVIRONMENT === 'production' ? PRODUCTION_CONFIG : LOCAL_CONFIG;

// Log configuration (only in development)
if (AppConfig.isDevelopment) {
  console.log('🔧 App Configuration:');
  console.log('   Environment:', AppConfig.environment);
  console.log('   Server URL:', AppConfig.serverUrl);
  console.log('   ICE Servers:', AppConfig.iceServers.length);
}

export default AppConfig;
