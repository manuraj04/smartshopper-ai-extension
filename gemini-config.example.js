// gemini-config.example.js - Template for API Configuration
// SETUP INSTRUCTIONS:
// 1. Copy this file to 'gemini-config.js' (without .example)
// 2. Get your free API key from: https://makersuite.google.com/app/apikey
// 3. Replace 'YOUR_GEMINI_API_KEY_HERE' with your actual API key
// 4. Save the file (it's gitignored, so your key stays private)

const GEMINI_CONFIG = {
  // Add your actual API key here from: https://makersuite.google.com/app/apikey
  API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
  
  // Gemini API endpoint
  API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
  
  // Model settings
  MODEL: 'gemini-pro',
  
  // Free tier limits (as of 2024)
  // - 60 requests per minute
  // - 1500 requests per day
  RATE_LIMIT: {
    perMinute: 60,
    perDay: 1500
  }
};

// Export for use in popup.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GEMINI_CONFIG;
}
