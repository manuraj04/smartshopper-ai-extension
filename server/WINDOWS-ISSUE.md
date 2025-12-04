# Puppeteer Windows Issue

## Problem

Puppeteer fails to launch Chrome on Windows with error: **`spawn UNKNOWN`**

## Current Status

- ✅ Puppeteer and Chrome are installed correctly
- ✅ Chrome binary exists at: `C:\Users\DELL\.cache\puppeteer\chrome\win64-142.0.7444.59\chrome-win64\chrome.exe`
- ❌ Launching Chrome fails with `spawn UNKNOWN` error
- ✅ Price extraction utility works perfectly
- ✅ Extension's client-side scraping works fine

## Why This Happens

This is a known issue with Puppeteer on Windows related to:

1. Node.js spawn mechanism on Windows
2. Long file paths with certain characters
3. Windows executable permissions

## Workarounds

### Option 1: Use Extension's Client-Side Scraping (Recommended)

The extension already has working scraping in `background.js` using:

- `fetch()` API
- `DOMParser`
- Site-specific selectors

This works perfectly and doesn't need Puppeteer.

### Option 2: Deploy Server to Linux

Puppeteer works flawlessly on Linux:

```bash
# Deploy to any Linux server (AWS, Heroku, DigitalOcean, etc.)
git push heroku main
```

### Option 3: Use Windows Subsystem for Linux (WSL)

```bash
# Install WSL
wsl --install

# Inside WSL
cd /mnt/d/smartshopper-ai-extension/server
npm install
npm start
```

### Option 4: Use Docker

```bash
docker build -t smartshopper-server .
docker run -p 3000:3000 smartshopper-server
```

## What Works Now

### ✅ Price Extraction

```javascript
const { extractPrice } = require('./utils/scraper');
const price = extractPrice('₹1,499.00');
// Returns: { raw: '₹1,499.00', numeric: 1499, formatted: '₹1,499' }
```

### ✅ Extension Scraping

The Chrome extension scrapes prices using:

- `popup/popup.js` - Client-side price extraction
- `background.js` - Background fetch for search results
- Works on all sites without Puppeteer

## Recommendation

**For development on Windows:**
Use the extension's built-in client-side scraping. It's faster and doesn't need a server.

**For production:**
Deploy the server to Linux where Puppeteer works perfectly.

## Testing

```bash
# Simple test (works on Windows)
npm test

# Full Puppeteer test (Linux only)
npm run test:full
```

## References

- <https://github.com/puppeteer/puppeteer/issues/8148>
- <https://github.com/puppeteer/puppeteer/issues/7740>
- <https://pptr.dev/troubleshooting#chrome-doesnt-launch-on-windows>
