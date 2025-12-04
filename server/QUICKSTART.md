# SmartShopper Server - Quick Start Guide

## 🚀 Getting Started

### 1. Installation Complete ✅

You've already installed the dependencies:

```bash
npm install puppeteer cheerio
```

### 2. Start the Server

```bash
cd server
npm start
```

You should see:

```
✨ SmartShopper AI Server running on http://localhost:3000
📊 Ready to serve price comparison requests
🤖 Puppeteer scraper initialized
```

### 3. Test the Scraper

Run the test suite to verify everything works:

```bash
npm test
```

This will test:

- Direct product URL scraping (Amazon)
- Product search (Flipkart)
- Multi-site comparison (Amazon, Flipkart, Myntra)
- Price extraction utility

## 📡 API Examples

### Example 1: Get Prices from Multiple Sites

```bash
curl -X POST http://localhost:3000/api/prices \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "wireless mouse",
    "sites": ["amazon", "flipkart", "myntra"]
  }'
```

### Example 2: Search Specific Product

```bash
curl -X POST http://localhost:3000/api/prices \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "iPhone 15 Pro",
    "sites": ["amazon", "flipkart"]
  }'
```

### Example 3: Get Price Trend

```bash
curl -X POST http://localhost:3000/api/trend \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.amazon.in/dp/B0BPX3F3Q4"
  }'
```

## 🧪 Test in Browser

Open your browser and visit:

```
http://localhost:3000
```

You'll see the API documentation with available endpoints.

## 🔌 Integrate with Extension

The Chrome extension can now use this server for server-side scraping:

**In your extension's background.js or popup.js:**

```javascript
async function getServerPrices(productName) {
  const response = await fetch('http://localhost:3000/api/prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productName: productName,
      sites: ['amazon', 'flipkart', 'myntra']
    })
  });
  
  const data = await response.json();
  return data.prices;
}
```

## 🛠️ Development Mode

For auto-restart on code changes:

```bash
npm run dev
```

This uses `nodemon` to watch for file changes.

## ⚙️ Configuration

### Change Port

Edit `server/index.js` or use environment variable:

```bash
PORT=8080 npm start
```

### Add More Sites

Edit `server/utils/scraper.js` and add to `siteConfigs`:

```javascript
newsite: {
  baseUrl: 'https://www.newsite.com',
  searchUrl: 'https://www.newsite.com/search?q=',
  priceSelectors: ['.price', '.product-price'],
  nameSelectors: ['.product-title'],
  searchResultSelector: '.product-card',
  searchPriceSelector: '.price',
  searchNameSelector: '.title',
  searchLinkSelector: 'a.product-link'
}
```

## 📊 Monitoring

### Check Server Health

```bash
curl http://localhost:3000
```

### View Logs

The server logs all scraping activity:

```
Scraping amazon for: wireless mouse
Scraping flipkart for: laptop bag
```

## 🐛 Troubleshooting

### Puppeteer Won't Start

**Windows:**

```bash
# Puppeteer should download Chromium automatically
# If it fails, install Chrome manually
```

**Linux:**

```bash
sudo apt-get update
sudo apt-get install -y chromium-browser
```

**macOS:**

```bash
brew install chromium
```

### Port Already in Use

```bash
# Windows - Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
PORT=8080 npm start
```

### Slow Scraping

- Normal: 3-5 seconds per site (Puppeteer is launching headless Chrome)
- To speed up: Browser instance is reused across requests
- First request is slower (browser startup), subsequent requests are faster

## 🚀 Next Steps

1. **Add Database**: Store price history in MongoDB
2. **Add Caching**: Cache results for 5-10 minutes
3. **Add Rate Limiting**: Prevent abuse
4. **Add Authentication**: Secure API endpoints
5. **Deploy to Cloud**: Heroku, AWS, or Google Cloud

## 📚 Full Documentation

See `server/README.md` for complete API documentation and advanced features.

## 🎯 What's Implemented

✅ Real-time price scraping with Puppeteer
✅ Multiple site support (Amazon, Flipkart, Myntra, Meesho)
✅ Search functionality (get multiple results)
✅ Direct URL scraping
✅ Price extraction from various formats
✅ Shared browser instance for performance
✅ Graceful shutdown handling
✅ Error handling and fallbacks
✅ REST API with Express
✅ CORS enabled for extension
✅ Test suite included

## 💡 Tips

- **First request is slow**: Puppeteer needs to start Chrome (3-5 sec)
- **Subsequent requests faster**: Browser instance is reused
- **Test locally first**: Run `npm test` before deploying
- **Monitor memory**: Puppeteer uses ~100-200MB RAM per browser
- **Add timeouts**: Sites may be slow, default timeout is 30 seconds

Happy scraping! 🎉
