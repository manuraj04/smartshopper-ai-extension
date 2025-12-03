const express = require('express');
const router = express.Router();
const scraper = require('../utils/scraper');

// POST /api/prices - Get prices from multiple shopping sites
router.post('/', async (req, res) => {
  const { productName, productUrl, sites } = req.body || {};
  
  if (!productName && !productUrl) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Missing productName or productUrl' 
    });
  }

  try {
    // TODO: Implement real scraping for each site
    const sitesToScrape = sites || ['amazon', 'flipkart', 'myntra', 'meesho'];
    const pricePromises = sitesToScrape.map(site => 
      scraper.scrapeSite(site, productName, productUrl)
    );

    const results = await Promise.allSettled(pricePromises);
    
    const prices = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    res.json({ 
      ok: true, 
      prices,
      count: prices.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Price fetch error:', err);
    res.status(500).json({ ok: false, error: err.toString() });
  }
});

module.exports = router;
