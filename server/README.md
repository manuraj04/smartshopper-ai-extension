# SmartShopper AI Server

Real-time price scraping server using Puppeteer and Cheerio for the SmartShopper AI Chrome extension.

## Features

- **Real-time Price Scraping**: Extracts actual prices from Amazon, Flipkart, Myntra, and Meesho
- **Headless Browser**: Uses Puppeteer for JavaScript-rendered pages
- **Fast Parsing**: Cheerio for quick HTML parsing
- **Shared Browser Instance**: Optimized performance with browser reuse
- **Multiple Search Results**: Fetches up to 5 results per site for better matching
- **Price History**: Track prices over time (database integration ready)
- **Graceful Shutdown**: Properly closes browser on server shutdown

## Installation

```bash
cd server
npm install
```

## Dependencies

- **express**: Web server framework
- **puppeteer**: Headless Chrome for scraping
- **cheerio**: Fast HTML parsing
- **node-fetch**: HTTP requests
- **cors**: Cross-origin support
- **body-parser**: JSON request parsing

## Usage

### Start the Server

```bash
npm start
```

Server runs on `http://localhost:3000`

### Test the Scraper

```bash
node test-scraper.js
```

This will test:
1. Direct product URL scraping
2. Search functionality
3. Multi-site price comparison
4. Price extraction utility

## API Endpoints

### 1. Get Prices from Multiple Sites

```http
POST /api/prices
Content-Type: application/json

{
  "productName": "wireless mouse",
  "sites": ["amazon", "flipkart", "myntra"]
}
```

**Response:**
```json
{
  "ok": true,
  "prices": [
    {
      "site": "Amazon",
      "productName": "Logitech M235 Wireless Mouse",
      "price": "₹649",
      "numericPrice": 649,
      "url": "https://www.amazon.in/...",
      "availability": "In Stock",
      "scrapedAt": "2025-02-03T10:30:00.000Z"
    }
  ],
  "count": 3,
  "timestamp": "2025-02-03T10:30:00.000Z"
}
```

### 2. Get Price Trend

```http
POST /api/trend
Content-Type: application/json

{
  "url": "https://www.amazon.in/dp/B0BPX3F3Q4"
}
```

**Response:**
```json
{
  "ok": true,
  "trend": "Falling"
}
```

### 3. Get Price History

```http
POST /api/price-history
Content-Type: application/json

{
  "productId": "amazon_B0BPX3F3Q4",
  "days": 30
}
```

### 4. Track Product

```http
POST /api/track
Content-Type: application/json

{
  "url": "https://www.amazon.in/dp/B0BPX3F3Q4",
  "email": "user@example.com"
}
```

## Scraper Functions

### Core Functions

#### `scrapeSite(site, productName, productUrl)`
Main function to scrape a single site.
- **site**: 'amazon', 'flipkart', 'myntra', or 'meesho'
- **productName**: Product to search for
- **productUrl**: (Optional) Direct product URL

```javascript
const result = await scraper.scrapeSite('amazon', 'wireless mouse');
```

#### `scrapeProductUrl(url)`
Scrape a specific product URL.

```javascript
const product = await scraper.scrapeProductUrl('https://www.amazon.in/dp/B0BPX3F3Q4');
```

#### `scrapeSearchResults(site, productName, maxResults)`
Get multiple search results from a site.

```javascript
const results = await scraper.scrapeSearchResults('flipkart', 'laptop', 5);
```

#### `extractPrice(text)`
Extract price from text string.

```javascript
const price = scraper.extractPrice('₹1,499.00');
// Returns: { raw: '₹1,499.00', numeric: 1499, formatted: '₹1,499' }
```

### Utility Functions

- `getBrowser()` - Get shared Puppeteer browser instance
- `cleanup()` - Close browser and clean up resources
- `analyzePriceHistory(productId, currentPrice)` - Analyze price trends

## Site Configuration

Each site has detailed selectors for:
- Price extraction (multiple fallback selectors)
- Product name
- Search results
- Product links
- Availability status

### Supported Sites

| Site | Search URL | Status |
|------|-----------|--------|
| Amazon India | ✅ Fully supported | Production |
| Flipkart | ✅ Fully supported | Production |
| Myntra | ✅ Fully supported | Production |
| Meesho | ⚠️ Partial support | Beta |

## Performance

- **Browser Reuse**: Single browser instance shared across requests
- **Parallel Scraping**: Multiple sites scraped concurrently
- **Smart Timeouts**: 30s page load, 10s element wait
- **Memory Efficient**: Automatic browser cleanup on shutdown

## Error Handling

- Graceful fallbacks for missing selectors
- Timeout protection (30 seconds)
- Detailed error logging
- Partial results on site failures

## Production Deployment

### Environment Variables

```bash
PORT=3000
NODE_ENV=production
```

### PM2 (Recommended)

```bash
npm install -g pm2
pm2 start index.js --name smartshopper-server
pm2 startup
pm2 save
```

### Docker

```dockerfile
FROM node:18-alpine
RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

## Database Integration (TODO)

For price history tracking, integrate a database:

```javascript
// Example: MongoDB
const mongoose = require('mongoose');

const PriceHistorySchema = new mongoose.Schema({
  productId: String,
  site: String,
  price: Number,
  timestamp: Date,
  url: String
});

// Save price
await PriceHistory.create({
  productId: 'amazon_B0BPX3F3Q4',
  site: 'Amazon',
  price: 649,
  timestamp: new Date(),
  url: productUrl
});
```

## Troubleshooting

### Puppeteer Issues

If Puppeteer fails to launch:

```bash
# Linux - Install dependencies
sudo apt-get install -y \
  chromium-browser \
  fonts-liberation \
  libnss3 \
  libatk-bridge2.0-0

# macOS
brew install chromium

# Windows
# Download Chrome/Chromium manually
```

### Rate Limiting

Sites may block requests. Solutions:
- Add delays between requests
- Rotate User-Agent headers
- Use proxy rotation
- Implement request queuing

## License

MIT - See LICENSE file

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new scrapers
4. Submit pull request

## Support

For issues, open a GitHub issue with:
- Site URL that failed
- Error message
- Expected vs actual behavior
