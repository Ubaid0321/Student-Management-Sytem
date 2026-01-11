// ============================================
// 📱 API CONFIGURATION
// ============================================
// 
// WINDOWS 10 SETUP:
// 1. Open Command Prompt
// 2. Run: ipconfig
// 3. Find "IPv4 Address" under your WiFi adapter
// 4. Replace the IP below with your IP
//

// ========== CHANGE THIS IP TO YOUR COMPUTER'S IP ==========
const YOUR_COMPUTER_IP = '192.168.100.19';
// ===========================================================

// Port where backend is running
const BACKEND_PORT = 5000;

// API Configuration
const config = {
  API_URL: `http://${YOUR_COMPUTER_IP}:${BACKEND_PORT}/api`,
  APP_NAME: 'IUB Student Management System',
  VERSION: '2.0.0',
  REQUEST_TIMEOUT: 10000,
  DEBUG_MODE: true,
  BACKEND_PORT,
};

export default config;
