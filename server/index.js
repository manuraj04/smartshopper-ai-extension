// server/index.js - Express server for SmartShopper AI backend
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const priceRoutes = require('./routes/priceRoutes');
const trendRoutes = require('./routes/trendRoutes');
const scraper = require('./utils/scraper');

// New v1 API routes
const priceV1Routes = require('./routes/price');
const searchRoutes = require('./routes/search-crosssite');

const app = express();

// Middleware
app.use(cors()); // Enable CORS for extension
app.use(bodyParser.json());

// TODO: Add authentication middleware
// app.use('/api', authMiddleware);

// V1 API Routes (new canonical endpoints)
app.use('/v1', priceV1Routes);
app.use('/v1', searchRoutes);

// Legacy API Routes
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
    'GET /v1/price - Get price data for product (new)',
    'GET /v1/search-crosssite - Find matches across sites (new)',
    'GET /healthz - Health check',
    'POST /api/prices - Get prices from multiple sites (legacy)',
    'POST /api/trend - Get price trends (legacy)',
    'POST /api/price-history - Get historical prices (legacy)',
    'POST /api/track - Track product for alerts (legacy)'
  ]
}));

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

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
const server = app.listen(port, () => {
  console.log(`✨ SmartShopper AI Server running on http://localhost:${port}`);
  console.log(`📊 Ready to serve price comparison requests`);
  console.log(`🤖 Puppeteer scraper initialized`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await scraper.cleanup();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down...');
  await scraper.cleanup();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
