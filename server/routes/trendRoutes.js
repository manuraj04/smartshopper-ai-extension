const express = require('express');
const router = express.Router();
const scraper = require('../utils/scraper');

router.post('/', async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ ok: false, error: 'Missing url' });

  try {
    const trend = await scraper.estimateTrend(url);
    res.json({ ok: true, trend });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.toString() });
  }
});

module.exports = router;
