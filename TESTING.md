# 🚀 Quick Start & Testing Guide - UPDATED

## ✅ Your Setup Status

- [x] RapidAPI key configured (and protected by .gitignore)
- [x] Amazon API enabled
- [x] Real API mode enabled
- [x] Mock data disabled

## 🔒 SECURITY FIRST!

**Your API key is now protected:**
- ✅ Added to `.gitignore` (won't be committed)
- ✅ Only accessible in extension context
- ✅ Never exposed to web pages
- ✅ Test page uses secure message passing

**Read SECURITY.md for complete guidelines!**

---

## 🧪 Recommended Testing Method

### ⭐ **Use test-extension.html (Secure Testing)**

This method keeps your API key safe in the extension's background script.

#### **Step 1: Load Extension in Chrome**
```powershell
# Open Chrome and go to: chrome://extensions/
# Enable "Developer mode" (top right toggle)
# Click "Load unpacked"
# Select folder: D:\smartshopper-ai-extension
```

#### **Step 2: Open Test Page**
```powershell
cd D:\smartshopper-ai-extension
start test-extension.html
```

#### **Step 3: Run Tests**
- Click **"1. Check Extension"** → Verifies extension loaded
- Click **"2. Test API"** → Tests RapidAPI (key stays secure!)
- Click **"3. Test Product Fetch"** → Searches for products
- Click **"4. Test Storage"** → Tests Chrome storage
- Click **"▶ Run All Tests"** → Runs all tests

---

## 🐛 Why test-quick.html Failed

**Error:** `Failed to fetch dynamically imported module: file:///D:/smartshopper-ai-extension/config.js`

**Reason:** ES6 modules (`import` statements) don't work with `file://` protocol when opening HTML files directly in browser.

**Solution:** Use `test-extension.html` which uses Chrome extension APIs instead of direct imports

2. **Test on Amazon:**
   - Visit: https://www.amazon.in/dp/B0CHWRXK6X
   - Click SmartShopper extension icon
   - Click "Compare Prices"
   - Should show REAL Amazon price!

3. **Check Console:**
   - Press F12
   - Look for: `✅ Fetched real price for...`

## 🐛 Common Issues

### Issue: Still seeing mock prices
**Fix:**
1. Reload extension in `chrome://extensions/`
2. Check config.js: `useRealAPI: true`
3. Clear browser cache

### Issue: API key error
**Fix:**
1. Check config.js for typos in API key
2. Verify key at: https://rapidapi.com/developer/apps
3. Make sure you subscribed to the API

### Issue: CORS error in test page
**Note:** This is NORMAL for web pages. Extension will work fine (bypasses CORS).

## 📊 Check API Usage

Visit: https://rapidapi.com/developer/billing/subscriptions-and-usage

You have **100 free requests/month** (~3 per day).

## 🎯 Quick Commands

```powershell
# Test configuration
start test-quick.html

# Open extension page
start chrome://extensions/

# View API usage
start https://rapidapi.com/developer/billing
```

## ✨ What Should Work

- ✅ Real Amazon prices from RapidAPI
- ✅ Price comparison with 4 sites (Amazon real, others mock)
- ✅ Track products to watchlist
- ✅ Automatic price checks every 3 hours
- ✅ Notifications for price drops
- ✅ AI suggestions based on price trends

## 🎉 You're All Set!

Your SmartShopper AI extension is configured and ready to use!
