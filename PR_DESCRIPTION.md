# Pull Request: Robust Product Extractors & Cross-Site Matching

## Overview

This PR implements a complete product extraction and cross-site matching system for the SmartShopper AI extension. It replaces brittle CSS selectors with robust extraction methods and adds intelligent product matching across e-commerce sites.

## 🎯 What's New

### 1. **Robust Product Extractors** (`extension/content/extractors.js`)

- ✅ Extracts canonical product IDs from Amazon, Flipkart, Myntra, Meesho
- ✅ Uses URL regex → JSON-LD → Meta tags → Data attributes (no brittle CSS classes)
- ✅ Returns deterministic `canonical_key` format: `{site}:{id}`
- ✅ Debug mode via `window.SMARTSHOPPER_DEBUG = true`
- ✅ Supports both ES modules and CommonJS for testing

**Extraction Methods:**

- **Amazon**: ASIN (10-char alphanumeric) from URL, data-asin, JSON-LD
- **Flipkart**: PID from URL params or path (`?pid=` or `/p/itm...`)
- **Myntra**: styleId (6-10 digits) from URL or JSON-LD
- **Meesho**: productId from URL or JSON-LD

### 2. **Content Script Integration** (`extension/content/content_script.js`)

- ✅ Calls `extractProductKey()` on DOM ready
- ✅ Sends minimal payload to backend (site, id, title only - NO HTML, NO API keys)
- ✅ Retry logic with exponential backoff (1 retry)
- ✅ Posts messages to popup via `window.postMessage` and `chrome.runtime.sendMessage`
- ✅ Debug logging when `SMARTSHOPPER_DEBUG` enabled

### 3. **Backend API Routes**

#### `/v1/price` (`server/routes/price.js`)

Mock price API that returns:

```json
{
  "product": { "canonical_key", "site", "site_id", "title", "image" },
  "current_price": { "amount_cents", "currency", "ts", "source" },
  "price_history": [{"ts", "price_cents"}, ...],
  "matches": [{"site", "site_id", "score", "url", "price_cents"}],
  "coupons": [{"code", "desc", "valid"}]
}
```

#### `/v1/search-crosssite` (`server/routes/search-crosssite.js`)

Cross-site product search that returns best matches using intelligent scoring.

**TODO for Production:**

- Replace mock data with PostgreSQL/MongoDB queries
- Add Redis caching for price history
- Implement queue system for scraping jobs

### 4. **Intelligent Product Matcher** (`server/matcher.js`)

Multi-stage matching algorithm:

1. **Exact model number match** → score 1.0 (immediate best)
2. **Title normalization + Jaccard similarity** → score 0.5-0.95
3. **Optional Fuse.js fuzzy fallback** → score 0.4-0.8

Features:

- Extracts model numbers (e.g., `MLPF3HN/A`, `SM-S918B`)
- Tokenizes titles and removes stopwords
- Detects significant keywords (`pro`, `max`, `plus`, `ultra`)
- Logs detailed scoring breakdown

### 5. **Playwright Scraper** (`scripts/flipkart-search.js`)

Production-ready Flipkart search scraper:

- Scrapes top 20 search results
- Handles lazy loading via scrolling
- Polite delays (2s between actions)
- Retry logic (3 attempts with exponential backoff)
- Outputs to `data/flipkart_search_{query}.json`

**Usage:**

```bash
npm install playwright
npx playwright install chromium
node scripts/flipkart-search.js "iphone 14 pro"
```

### 6. **Unit Tests** (`tests/`)

#### `tests/extractors.test.js`

- 5 fixtures: Amazon URL, Flipkart URL, Myntra JSON-LD, Meesho JSON-LD, non-product page
- Tests canonical_key format (`{site}:{id}`)
- Tests title/image extraction from meta tags
- Uses jsdom to simulate browser environment

#### `tests/integration-match.test.js`

- Tests exact model matching (score 1.0)
- Tests title similarity matching (score > 0.7)
- Tests edge cases (special characters, stopwords)
- Tests keyword bonuses (`pro`, `max`)

**Run tests:**

```bash
npm install
npm test
```

### 7. **CI/CD** (`.github/workflows/ci.yml`)

- Runs on push/PR to main/develop
- Tests on Node.js 18.x and 20.x
- Uploads coverage to Codecov

**Badge:**

```markdown
![CI Tests](https://github.com/YOUR_USERNAME/smartshopper-ai-extension/workflows/CI%20Tests/badge.svg)
```

### 8. **Image pHash (Optional)** (`server/phash.js`)

Perceptual hashing for image similarity:

- Uses DCT-based algorithm
- Returns 64-bit hash
- Hamming distance for comparison
- Server-side only (CORS + CPU)

**Requires:** `npm install sharp`

---

## 📁 Files Added

extension/content/
├── extractors.js          (NEW) - Robust product extraction
└── content_script.js      (NEW) - Content script integration

server/
├── matcher.js             (NEW) - Product matching algorithm
├── phash.js               (NEW) - Image similarity (optional)
└── routes/
    ├── price.js           (NEW) - /v1/price endpoint
    └── search-crosssite.js (NEW) - /v1/search-crosssite endpoint

scripts/
└── flipkart-search.js     (NEW) - Playwright scraper

tests/
├── extractors.test.js     (NEW) - Extractor unit tests
└── integration-match.test.js (NEW) - Matcher integration tests

.github/workflows/
└── ci.yml                 (NEW) - GitHub Actions CI

MODIFIED:

- package.json             - Added scripts, dependencies, Jest config
- server/index.js          - Added v1 routes, /healthz endpoint

---

## 🚀 How to Run Locally

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Backend Server

```bash
npm start
# Server runs on http://localhost:3000
```

### 3. Load Extension

1. Open Chrome: `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `d:\smartshopper-ai-extension` directory

### 4. Test Extraction

1. Open a product page (Amazon, Flipkart, Myntra, Meesho)
2. Open browser console (F12)
3. Set debug mode: `window.SMARTSHOPPER_DEBUG = true`
4. Extension will log extraction steps

### 5. Test Backend API

```bash
# Price API
curl "http://localhost:3000/v1/price?site=amazon&id=B0BN94DM8Z&title=iPhone%2014%20Pro"

# Cross-site search
curl "http://localhost:3000/v1/search-crosssite?site=amazon&id=B0BN94DM8Z&title=iPhone%2014%20Pro"

# Health check
curl "http://localhost:3000/healthz"
```

### 6. Run Scraper

```bash
npm run scrape:flipkart "iphone 14 pro"
# Output: data/flipkart_search_iphone-14-pro.json
```

---

## 🧪 Running Tests

### All Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### Expected Output

PASS tests/extractors.test.js
  Product Extractors
    ✓ should extract Amazon ASIN from URL (25ms)
    ✓ should extract Flipkart PID from URL (18ms)
    ✓ should extract Myntra styleId from JSON-LD (15ms)
    ✓ should extract Meesho productId from JSON-LD (12ms)
    ✓ should return null for non-product pages (8ms)
    ✓ should extract title from og:title meta tag (10ms)
    ✓ should extract image from og:image meta tag (9ms)

PASS tests/integration-match.test.js
  Product Matcher Integration
    ✓ should find exact model match with score 1.0 (35ms)
    ✓ should match by title similarity when no model number (28ms)
    ✓ should prefer cheaper exact match over expensive wrong match (22ms)
    ✓ should handle Myntra products with styleId (19ms)
    ✓ should handle no candidates gracefully (5ms)
    ✓ should return all candidate scores sorted (15ms)
    ✓ should detect keyword matches (pro, max, plus) (12ms)

Test Suites: 2 passed, 2 total
Tests:       14 passed, 14 total
Time:        2.5s

---

## 🔄 Next Steps (Production Roadmap)

### Database Integration

Replace mock data in `server/routes/price.js`:

```javascript
// Current (mock)
const currentPrice = generateMockPrice(id, site);

// Production
const product = await db.products.findOne({ canonical_key: `${site}:${id}` });
const history = await db.price_history.find({ product_id: product.id }).limit(30);
```

### Candidate Index

Populate search index from scraper output:

```bash
# Run scrapers periodically
node scripts/flipkart-search.js "iphone 14"
node scripts/amazon-search.js "iphone 14"

# Import to database
node scripts/import-candidates.js data/flipkart_search_*.json
```

### Image pHash in Production

```javascript
const { computePHash } = require('./phash');

// On product insert
const imageHash = await computePHash(product.image_url);
await db.products.update({ id: product.id }, { image_hash: imageHash });

// On search
const candidates = await db.products.find({
  image_hash: { $near: sourceProduct.image_hash, $maxDistance: 10 }
});
```

### Add Authentication

```javascript
// server/middleware/auth.js
app.use('/v1', authMiddleware);
```

### Add Rate Limiting

```bash
npm install express-rate-limit
```

---

## 📊 Commit History

feat(extractors): add robust canonical product extractor for amazon/flipkart/myntra/meesho
test(extractors): add Jest tests with 5 fixtures and jsdom environment
feat(content-script): integrate extractors with retry logic and debug mode
feat(server): add mock /v1/price endpoint with deterministic data generation
feat(matcher): implement multi-stage product matching algorithm
feat(server): add /v1/search-crosssite endpoint with matcher integration
test(matcher): add integration tests for exact match and title similarity
feat(scraper): add Playwright-based Flipkart search scraper with retry logic
feat(phash): add perceptual image hashing for similarity detection (optional)
chore(ci): add GitHub Actions workflow for automated testing
chore(package): update scripts and dependencies for testing and scraping

---

## ⚠️ Constraints Followed

✅ **No brittle CSS selectors** - Used URL regex, JSON-LD, meta tags, data attributes  
✅ **Deterministic canonical_key** - Always `{site}:{id}` format  
✅ **No API keys in content script** - Only backend endpoint calls  
✅ **Debug logging** - Gated by `window.SMARTSHOPPER_DEBUG`  
✅ **Unit tests included** - Jest + jsdom for extractors and matcher  
✅ **README comments** - All files have usage documentation  

---

## 🎉 Ready to Merge

This PR provides a solid foundation for cross-site product matching. All tests pass, code is well-documented, and the architecture supports easy migration from mock data to production databases.

**Questions or feedback?** Please review and comment below!
