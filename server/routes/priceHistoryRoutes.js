const express = require('express');
const router = express.Router();

// POST /api/price-history - Get historical price data for a product
router.post('/', async (req, res) => {
  const { url, days = 30 } = req.body || {};
  
  if (!url) {
    return res.status(400).json({ ok: false, error: 'Missing url' });
  }

  try {
    // TODO: Implement real price history from database or scraping service
    // For now, return mock data
    const history = generateMockHistory(days, url);
    
    res.json({ 
      ok: true, 
      history,
      url,
      days,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Price history error:', err);
    res.status(500).json({ ok: false, error: err.toString() });
  }
});

// Helper: Generate mock price history
function generateMockHistory(days, url) {
  const history = [];
  let basePrice = 1500 + Math.floor(Math.random() * 500);
  
  for (let i = 0; i < days; i++) {
    basePrice += (Math.random() * 100 - 50);
    basePrice = Math.max(basePrice, 800); // Keep minimum price
    
    history.push({
      date: new Date(Date.now() - (days - i) * 86400000).toISOString().split('T')[0],
      price: Math.round(basePrice),
      site: 'average'
    });
  }
  
  return history;
}

module.exports = router;
