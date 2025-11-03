// config.js - API Configuration for SmartShopper AI
// Copy this file and rename to config.js, then add your API keys

export const API_CONFIG = {
  // RapidAPI Configuration
  rapidapi: {
    key: 'YOUR_RAPIDAPI_KEY_HERE', // Get free key from https://rapidapi.com
    
    // Amazon Real-Time Data API (Free tier: 100 requests/month)
    // https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data
    amazon: {
      host: 'real-time-amazon-data.p.rapidapi.com',
      enabled: false // Set to true after adding API key
    },

    // Alternative APIs you can integrate:
    
    // Flipkart Scraper API
    // https://rapidapi.com/datascraper/api/flipkart-scraper-api
    flipkart: {
      host: 'flipkart-scraper-api.p.rapidapi.com',
      enabled: false
    },

    // Amazon Price Tracker (Alternative)
    // https://rapidapi.com/ajmorenodelarosa/api/amazon-price1
    amazonPrice: {
      host: 'amazon-price1.p.rapidapi.com',
      enabled: false
    }
  },

  // Local Backend Server
  backend: {
    baseUrl: 'http://localhost:3000',
    enabled: false
  },

  // Feature Flags
  features: {
    useRealAPI: false, // Set to true to enable real API calls
    useMockData: true,  // Use mock data for development
    cacheResults: true, // Cache API responses
    cacheDuration: 3600000 // 1 hour in milliseconds
  }
};

// Usage:
// 1. Sign up at https://rapidapi.com (Free)
// 2. Subscribe to "Real-Time Amazon Data" API (Free tier)
// 3. Copy your API key
// 4. Replace 'YOUR_RAPIDAPI_KEY_HERE' with your actual key
// 5. Set rapidapi.amazon.enabled = true
// 6. Set features.useRealAPI = true
