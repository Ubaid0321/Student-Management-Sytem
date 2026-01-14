// ============================================
// 📱 API CONFIGURATION - AUTO IP DETECTION
// ============================================

import Constants from 'expo-constants';

// Backend port
const BACKEND_PORT = 5000;

// Auto-detect IP from Expo debugger host
const getApiUrl = () => {
  // Method 1: Get from Expo debugger host (works in Expo Go)
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  
  if (debuggerHost) {
    // debuggerHost is like "192.168.1.5:8081" - extract just the IP
    const ip = debuggerHost.split(':')[0];
    console.log('📱 Auto-detected IP:', ip);
    return `http://${ip}:${BACKEND_PORT}/api`;
  }
  
  // Method 2: Fallback for production/standalone builds
  // In production, you would use your actual server URL
  console.log('⚠️ Could not auto-detect IP, using localhost');
  return `http://localhost:${BACKEND_PORT}/api`;
};

// API Configuration
const config = {
  API_URL: getApiUrl(),
  APP_NAME: 'IUB Student Management System',
  VERSION: '3.0.0',
  REQUEST_TIMEOUT: 10000,
  DEBUG_MODE: __DEV__ || false,
  BACKEND_PORT,
};

// Log the API URL for debugging
if (config.DEBUG_MODE) {
  console.log('🌐 API URL:', config.API_URL);
}

export default config;
