// server/index.js - Express server for SmartShopper AI backend
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const priceRoutes = require('./routes/priceRoutes');
const trendRoutes = require('./routes/trendRoutes');

const app = express();

// Middleware
app.use(cors()); // Enable CORS for extension
app.use(bodyParser.json());

// TODO: Add authentication middleware
// app.use('/api', authMiddleware);

// API Routes
app.use('/api/prices', priceRoutes);
app.use('/api/trend', trendRoutes);
app.use('/api/price-history', require('./routes/priceHistoryRoutes'));
app.use('/api/track', require('./routes/trackRoutes'));

// Health check
app.get('/', (req, res) => res.json({ 
  ok: true, 
  message: 'SmartShopper AI Server',
  version: '1.0.0',
  endpoints: [
    'POST /api/prices - Get prices from multiple sites',
    'POST /api/trend - Get price trends',
    'POST /api/price-history - Get historical prices',
    'POST /api/track - Track product for alerts'
  ]
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    ok: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✨ SmartShopper AI Server running on http://localhost:${port}`);
  console.log(`📊 Ready to serve price comparison requests`);
});
