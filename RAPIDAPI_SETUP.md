# 🚀 How to Enable Real Amazon API with RapidAPI

## Overview
SmartShopper AI can use **Real-Time Amazon Data API** from RapidAPI to fetch live product prices, ratings, and availability. The **free tier includes 100 requests per month** - perfect for testing!

---

## ✅ Step-by-Step Setup

### 1. Create RapidAPI Account (Free)

1. Go to [RapidAPI.com](https://rapidapi.com)
2. Click **"Sign Up"** (top right)
3. Sign up with Google/GitHub or email
4. Verify your email

### 2. Subscribe to Real-Time Amazon Data API

1. Visit: [Real-Time Amazon Data API](https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data)
2. Click **"Subscribe to Test"**
3. Choose **"Basic" plan** (FREE - 100 requests/month)
4. Click **"Subscribe"**

### 3. Get Your API Key

1. After subscribing, you'll see the API dashboard
2. Look for **"X-RapidAPI-Key"** in the code snippets section
3. Copy your API key (looks like: `a1b2c3d4e5...`)

### 4. Configure SmartShopper AI

1. Open `config.js` in the extension folder
2. Replace `'YOUR_RAPIDAPI_KEY_HERE'` with your actual key:

```javascript
export const API_CONFIG = {
  rapidapi: {
    key: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0', // Your actual key
    
    amazon: {
      host: 'real-time-amazon-data.p.rapidapi.com',
      enabled: true // ✅ Change to true
    }
  },

  features: {
    useRealAPI: true, // ✅ Change to true
    useMockData: false // ✅ Change to false
  }
};
```

### 5. Reload Extension

1. Go to `chrome://extensions/`
2. Click the **refresh icon** on SmartShopper AI
3. Test on any Amazon product page!

---

## 🧪 Testing the Integration

1. Open any Amazon India product page (e.g., https://www.amazon.in/...)
2. Click the SmartShopper AI extension icon
3. Click **"Compare Prices"**
4. You should see **real Amazon data** instead of mock prices!

---

## 📊 API Endpoints Used

### 1. Product Details (by ASIN)
```
GET /product-details?asin={ASIN}&country=IN
```
Returns: price, rating, availability, images, etc.

### 2. Product Search (by name)
```
GET /search?query={product_name}&page=1&country=IN&sort_by=RELEVANCE
```
Returns: search results with prices and details

---

## 💰 API Limits & Pricing

| Plan | Requests/Month | Price |
|------|---------------|-------|
| **Basic** | 100 | **FREE** |
| Pro | 1,000 | $10/month |
| Ultra | 10,000 | $50/month |
| Mega | 100,000 | $200/month |

**💡 Tip:** 100 free requests = ~3 requests/day. Perfect for personal use!

---

## 🔍 What Data You Get

From Amazon API:
- ✅ Product Title
- ✅ Current Price (₹)
- ✅ Original Price
- ✅ Discount Percentage
- ✅ Star Rating (out of 5)
- ✅ Number of Ratings
- ✅ Availability Status
- ✅ Product Images
- ✅ Product URL
- ✅ ASIN (Amazon ID)

---

## 🛠️ Troubleshooting

### Error: "Invalid API Key"
- Double-check you copied the entire key
- Make sure there are no extra spaces
- Verify you subscribed to the API

### Error: "Rate Limit Exceeded"
- You've used 100 free requests this month
- Wait until next month or upgrade plan
- Check usage at: [RapidAPI Dashboard](https://rapidapi.com/developer/billing/subscriptions-and-usage)

### Error: "CORS blocked"
- This is expected in web pages (not in extension)
- Extension background scripts bypass CORS
- Make sure `background.js` is handling the requests

### No Real Data Showing
- Check `config.js`: `useRealAPI` should be `true`
- Check `config.js`: `amazon.enabled` should be `true`
- Open browser console (F12) and check for errors
- Verify API key is correct

---

## 🔐 Security Best Practices

1. **Never commit `config.js` to GitHub**
   - It's already in `.gitignore`
   - Only commit `config.example.js`

2. **Regenerate API key if exposed**
   - Go to RapidAPI dashboard
   - Apps → Your App → Regenerate Key

3. **Use environment variables** (for production)
   - Store key in Chrome extension storage
   - Or use a backend proxy server

---

## 🌟 Alternative APIs on RapidAPI

If you want more data or different sources:

1. **Amazon Product Search & Reviews**
   - https://rapidapi.com/ajmorenodelarosa/api/amazon-product-reviews-api
   - Free tier: 50 requests/month

2. **Flipkart Scraper API**
   - https://rapidapi.com/datascraper/api/flipkart-scraper-api
   - Free tier: 100 requests/month

3. **Amazon Price Tracker**
   - https://rapidapi.com/ajmorenodelarosa/api/amazon-price1
   - Free tier: 100 requests/month

To add these, update `config.js` and modify `scripts/api.js` accordingly.

---

## 📈 Next Steps

Once you have real API working:

1. **Add Flipkart API** for real Flipkart prices
2. **Add caching** to reduce API calls
3. **Set up backend server** to hide API keys
4. **Add price history tracking** to database
5. **Deploy backend** to cloud (Heroku/Railway)

---

## 🎯 Quick Start Checklist

- [ ] Created RapidAPI account
- [ ] Subscribed to Real-Time Amazon Data API (Free)
- [ ] Copied API key
- [ ] Updated `config.js` with API key
- [ ] Set `useRealAPI: true` in config
- [ ] Reloaded extension in Chrome
- [ ] Tested on Amazon product page
- [ ] Checked browser console for errors

---

## 📞 Support

- RapidAPI Documentation: [View Docs](https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data)
- RapidAPI Support: [Contact](https://rapidapi.com/contact)
- Extension Issues: Check browser console (F12)

---

**🎉 Enjoy real-time Amazon price tracking with SmartShopper AI!**
