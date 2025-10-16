/**
 * Configuration Module
 * Loads environment variables and provides configuration for the application
 */

require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local'
});

const config = {
  // Server Configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,
  serverUrl: process.env.SERVER_URL || 'http://localhost:3001',
  
  // WebRTC Configuration
  iceServers: [
    { urls: process.env.STUN_SERVER_1 || 'stun:stun.l.google.com:19302' },
    { urls: process.env.STUN_SERVER_2 || 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.ekiga.net' },
    { urls: 'stun:stun.ideasip.com' }
  ],
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  verboseLogging: process.env.VERBOSE_LOGGING === 'true',
  
  // Environment checks
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isRender: process.env.RENDER === 'true' || !!process.env.RENDER_EXTERNAL_URL,
  
  // Render-specific
  renderUrl: process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL,
};

// Log configuration on startup (only in development or if verbose)
if (config.isDevelopment || config.verboseLogging) {
  console.log('🔧 Configuration loaded:');
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Server URL: ${config.serverUrl}`);
  console.log(`   Is Production: ${config.isProduction}`);
  console.log(`   Is Render: ${config.isRender}`);
  console.log(`   Verbose Logging: ${config.verboseLogging}`);
}

module.exports = config;
