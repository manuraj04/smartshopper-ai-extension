/**
 * server/routes/price.js - Price API Route
 * 
 * GET /v1/price?site=&id=&title=
 * Returns price data for a specific product (currently mock data)
 * 
 * MOCK DATA STRATEGY:
 * - Uses product ID to generate deterministic prices
 * - Returns realistic price history (30 days)
 * - Returns mock cross-site matches
 * 
 * PRODUCTION TODO:
 * Replace mock logic with:
 * ```javascript
 * const product = await db.products.findOne({ 
 *   canonical_key: `${site}:${id}` 
 * });
 * const history = await db.price_history.find({ 
 *   product_id: product.id 
 * }).limit(30);
 * const matches = await matcher.findMatches(product);
 * ```
 */

const express = require('express');
const router = express.Router();

// Mock price generator (deterministic based on ID)
function generateMockPrice(id, site) {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = 1000 + (hash % 5000); // Base price 1000-6000
  return Math.round(basePrice / 10) * 10; // Round to nearest 10
}

// Mock price history (30 days)
function generatePriceHistory(currentPrice) {
  const history = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  for (let i = 30; i >= 0; i--) {
    const variation = (Math.random() - 0.5) * 0.1; // ±10% variation
    const price = Math.round(currentPrice * (1 + variation));
    history.push({
      ts: now - (i * dayMs),
      price_cents: price * 100,
      source: i === 0 ? 'current' : 'historical'
    });
  }
  
  return history;
}

// Mock cross-site matches
function generateMatches(site, id, currentPrice) {
  const sites = ['amazon', 'flipkart', 'myntra', 'meesho'];
  const matches = [];
  
  for (const targetSite of sites) {
    if (targetSite === site) continue;
    
    const variation = (Math.random() - 0.3) * 0.2; // -10% to +10%
    const matchPrice = Math.round(currentPrice * (1 + variation));
    const score = 0.7 + (Math.random() * 0.3); // 0.7-1.0 similarity
    
    matches.push({
      site: targetSite,
      site_id: `MOCK_${targetSite.toUpperCase()}_${id}`,
      score: parseFloat(score.toFixed(2)),
      url: `https://www.${targetSite}.com/product/${id}`,
      price_cents: matchPrice * 100
    });
  }
  
  return matches.sort((a, b) => a.price_cents - b.price_cents);
}

// Mock coupons
function generateCoupons(site) {
  const coupons = [
    {
      code: 'SAVE10',
      desc: 'Get 10% off on orders above ₹999',
      valid: true,
      discount_percent: 10,
      min_order: 99900
    },
    {
      code: 'FIRST20',
      desc: 'First order discount - 20% off',
      valid: true,
      discount_percent: 20,
      min_order: 0
    }
  ];
  
  return coupons.filter(() => Math.random() > 0.5); // Random subset
}

/**
 * GET /v1/price
 * Query params: site, id, title (optional)
 */
router.get('/price', (req, res) => {
  const { site, id, title } = req.query;
  
  // Validation
  if (!site || !id) {
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['site', 'id'],
      optional: ['title']
    });
  }
  
  const validSites = ['amazon', 'flipkart', 'myntra', 'meesho'];
  if (!validSites.includes(site)) {
    return res.status(400).json({
      error: 'Invalid site',
      valid: validSites
    });
  }
  
  console.log(`[Price API] Fetching price for ${site}:${id} - ${title || 'No title'}`);
  
  // Generate mock data (deterministic based on ID)
  const currentPrice = generateMockPrice(id, site);
  const canonical_key = `${site}:${id}`;
  
  const response = {
    product: {
      canonical_key,
      site,
      site_id: id,
      title: title || `Mock Product ${id}`,
      image: `https://via.placeholder.com/300x300.png?text=${site}+${id}`
    },
    current_price: {
      amount_cents: currentPrice * 100,
      currency: 'INR',
      ts: Date.now(),
      source: 'mock_api'
    },
    price_history: generatePriceHistory(currentPrice),
    matches: generateMatches(site, id, currentPrice),
    coupons: generateCoupons(site),
    _meta: {
      mock: true,
      note: 'Replace with DB queries in production'
    }
  };
  
  res.json(response);
});

module.exports = router;
