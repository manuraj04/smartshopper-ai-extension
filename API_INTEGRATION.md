# SmartShopper AI - Real API Integration Guide

## 🎯 Overview

This document outlines the steps to integrate real APIs into the SmartShopper AI extension.

## 📋 Current Status

- ✅ Mock API functions implemented
- ✅ API structure defined
- ✅ Server endpoints created
- ⏳ Real scraping implementation pending
- ⏳ Database integration pending
- ⏳ Authentication pending

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install express body-parser node-fetch@2 cors
npm install cheerio puppeteer  # For web scraping
npm install mongodb mongoose    # For database (optional)
npm install jsonwebtoken bcrypt # For authentication (optional)
```

### 2. Enable Real APIs

In `scripts/api.js`, change:
```javascript
const USE_REAL_API = false; // Change to true
```

### 3. Configure Environment Variables

Create `server/.env`:
```env
PORT=3000
NODE_ENV=development

# API Keys (if using third-party services)
RAPID_API_KEY=your_key_here
SCRAPER_API_KEY=your_key_here

# Database (if using)
MONGODB_URI=mongodb://localhost:27017/smartshopper

# JWT Secret (for authentication)
JWT_SECRET=your_secret_here
```

## 🌐 API Endpoints

### 1. Get Prices from Multiple Sites
**Endpoint:** `POST /api/prices`

**Request:**
```json
{
  "productName": "iPhone 15",
  "productUrl": "https://amazon.in/...",
  "sites": ["amazon", "flipkart", "myntra", "meesho"]
}
```

**Response:**
```json
{
  "ok": true,
  "prices": [
    {
      "site": "Amazon",
      "price": 79999,
      "link": "https://amazon.in/...",
      "availability": "In Stock",
      "rating": 4.5
    }
  ],
  "count": 4,
  "timestamp": "2025-11-02T10:30:00Z"
}
```

### 2. Get Price History
**Endpoint:** `POST /api/price-history`

**Request:**
```json
{
  "url": "https://amazon.in/product/...",
  "days": 30
}
```

**Response:**
```json
{
  "ok": true,
  "history": [
    {
      "date": "2025-10-03",
      "price": 79999,
      "site": "average"
    }
  ],
  "url": "https://amazon.in/product/...",
  "days": 30
}
```

### 3. Track Product
**Endpoint:** `POST /api/track`

**Request:**
```json
{
  "productName": "iPhone 15",
  "url": "https://amazon.in/...",
  "currentPrice": 79999,
  "targetPrice": 75000,
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Product tracked successfully",
  "trackingId": "track_1234567890_abc123",
  "data": { ... }
}
```

## 🔐 Authentication (TODO)

Add JWT-based authentication:

1. **Create authentication middleware** (`server/middleware/auth.js`)
2. **Add user registration/login endpoints**
3. **Protect API routes** with authentication
4. **Store API keys securely** in extension storage

## 🕷️ Web Scraping Implementation

### Option 1: Use Third-Party APIs (Recommended)
- **RapidAPI** - Multiple price comparison APIs
- **ScraperAPI** - Handles proxies, CAPTCHAs
- **Bright Data** - Enterprise scraping solution

### Option 2: Build Custom Scraper
Using Puppeteer:

```javascript
const puppeteer = require('puppeteer');

async function scrapeAmazon(productUrl) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(productUrl, { waitUntil: 'networkidle2' });
  
  const price = await page.$eval('#priceblock_ourprice', 
    el => el.textContent.trim()
  );
  
  await browser.close();
  return price;
}
```

### Option 3: Use Cheerio (Lightweight)
```javascript
const cheerio = require('cheerio');

async function scrapePrice(html) {
  const $ = cheerio.load(html);
  const price = $('#priceblock_ourprice').text().trim();
  return price;
}
```

## 📊 Database Schema (TODO)

### Products Collection
```javascript
{
  _id: ObjectId,
  name: String,
  url: String,
  sites: [
    {
      name: String,
      currentPrice: Number,
      lastUpdated: Date
    }
  ],
  priceHistory: [
    {
      date: Date,
      price: Number,
      site: String
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

### Tracked Products Collection
```javascript
{
  _id: ObjectId,
  userId: String,
  productId: ObjectId,
  targetPrice: Number,
  email: String,
  alertSent: Boolean,
  active: Boolean,
  createdAt: Date
}
```

## 🚀 Next Steps

1. **Choose scraping method** (API vs. custom)
2. **Implement real scrapers** for each site in `server/utils/scraper.js`
3. **Add database** (MongoDB/PostgreSQL)
4. **Implement authentication**
5. **Add rate limiting** and caching
6. **Set up background jobs** for price updates
7. **Add email notifications** for price alerts
8. **Deploy backend** (Heroku, AWS, Digital Ocean)
9. **Update extension** to use production API URL

## ⚠️ Legal Considerations

- Check each website's Terms of Service
- Respect robots.txt
- Implement rate limiting
- Use proper User-Agent headers
- Consider using official APIs if available

## 📚 Resources

- [Puppeteer Documentation](https://pptr.dev/)
- [Cheerio Documentation](https://cheerio.js.org/)
- [RapidAPI Price APIs](https://rapidapi.com/category/Price)
- [Chrome Extension Best Practices](https://developer.chrome.com/docs/extensions/mv3/)

## 🐛 Testing

```bash
# Start the server
cd server
node index.js

# Test endpoint
curl -X POST http://localhost:3000/api/prices \
  -H "Content-Type: application/json" \
  -d '{"productName": "iPhone 15", "sites": ["amazon"]}'
```

---

**Status:** Development Mode (Mock APIs Active)  
**Next Milestone:** Implement real scraping for at least 2 sites
