const express = require('express');
const router = express.Router();

// In-memory storage for tracked products (TODO: Replace with database)
const trackedProducts = new Map();

// POST /api/track - Track a product for price alerts
router.post('/', async (req, res) => {
  const { productName, url, currentPrice, targetPrice, email } = req.body || {};
  
  if (!url) {
    return res.status(400).json({ ok: false, error: 'Missing url' });
  }

  try {
    const trackingId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const trackingData = {
      id: trackingId,
      productName: productName || 'Unknown Product',
      url,
      currentPrice: currentPrice || 0,
      targetPrice: targetPrice || null,
      email: email || null,
      createdAt: new Date().toISOString(),
      alerts: [],
      active: true
    };
    
    // Store in memory (TODO: Save to database)
    trackedProducts.set(trackingId, trackingData);
    
    console.log(`✅ Tracking product: ${productName} (ID: ${trackingId})`);
    
    res.json({ 
      ok: true, 
      message: 'Product tracked successfully',
      trackingId,
      data: trackingData
    });
  } catch (err) {
    console.error('Track product error:', err);
    res.status(500).json({ ok: false, error: err.toString() });
  }
});

// GET /api/track/:id - Get tracking status
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const tracking = trackedProducts.get(id);
  
  if (!tracking) {
    return res.status(404).json({ ok: false, error: 'Tracking not found' });
  }
  
  res.json({ ok: true, data: tracking });
});

// DELETE /api/track/:id - Stop tracking a product
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  if (trackedProducts.has(id)) {
    trackedProducts.delete(id);
    res.json({ ok: true, message: 'Tracking stopped' });
  } else {
    res.status(404).json({ ok: false, error: 'Tracking not found' });
  }
});

module.exports = router;
