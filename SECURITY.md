# 🔒 Security Guidelines for SmartShopper AI

## **CRITICAL: API Key Protection**

Your RapidAPI key is a sensitive credential that must be protected at all times.

### ✅ What We've Done to Protect Your Key

1. **Git Ignore**: `config.js` is listed in `.gitignore` to prevent accidental commits
2. **Template File**: `config.example.js` provides a safe template without real credentials
3. **Secure Architecture**: API calls only happen in Chrome extension context (not exposed to web pages)
4. **No Logging**: API key is never logged to console or displayed in UI

### 🚨 Security Threats to Avoid

#### **NEVER Do These:**

❌ **Commit `config.js` to Git**
```bash
# WRONG - This exposes your key!
git add config.js
git commit -m "Add config"
git push
```

❌ **Share Your API Key in Chat/Email**
```javascript
// WRONG - Never share this
rapidapi: { key: '5954ac5ca8mshb4b27475c4b421bp182218jsndebacf14b37b' }
```

❌ **Expose Key in Frontend Code**
```javascript
// WRONG - Don't put key in content scripts or HTML
const API_KEY = '5954ac5ca8mshb4b27475c4b421bp182218jsndebacf14b37b';
```

❌ **Use Key in Browser Console**
```javascript
// WRONG - Console history can be exposed
fetch('https://api.com', { headers: { 'x-rapidapi-key': 'YOUR_KEY' }})
```

#### **✅ Do These Instead:**

✅ **Always Check Git Status Before Committing**
```powershell
# Check what's staged
git status

# Verify config.js is NOT listed
# If it appears, run: git restore --staged config.js
```

✅ **Use Environment Variables for Deployment**
```javascript
// For production builds
const API_KEY = process.env.RAPIDAPI_KEY;
```

✅ **Keep API Calls in Background Script**
```javascript
// CORRECT - API key only accessed in background.js (service worker)
// Web pages can't access service worker code
const { API_CONFIG } = await import('./config.js');
```

✅ **Use Message Passing for Tests**
```javascript
// CORRECT - Test page sends message to background script
chrome.runtime.sendMessage({ action: 'testAPI', asin: 'B07ZPKBL9V' });
// Background script handles the actual API call with key
```

---

## 🔐 How Our Architecture Protects Your Key

### **Chrome Extension Security Model**

```
┌─────────────────────────────────────────────────────┐
│  Web Pages (amazon.in, etc.)                        │
│  ❌ Cannot access config.js                         │
│  ❌ Cannot see API key                              │
└─────────────────────────────────────────────────────┘
                      ↓
            (Content Script Bridge)
                      ↓
┌─────────────────────────────────────────────────────┐
│  Extension Context (popup, background)              │
│  ✅ Can import config.js                            │
│  ✅ Can make API calls securely                     │
│  🔒 Key never leaves this context                   │
└─────────────────────────────────────────────────────┘
```

### **Test Page Security**

- `test-extension.html` uses **Chrome extension messaging** API
- It sends requests to `background.js` which handles API calls
- **API key never sent to test page** - only results returned
- Even if someone views test page source, they can't see your key

---

## 🛡️ Security Checklist

Before sharing your extension or code:

- [ ] Verify `config.js` is in `.gitignore`
- [ ] Run `git status` to ensure `config.js` not staged
- [ ] Check `config.example.js` has placeholder key, not real one
- [ ] Confirm API key not hardcoded anywhere except `config.js`
- [ ] Test with test page loads extension properly
- [ ] Review code comments don't mention actual key value

---

## 🚑 What to Do If Your Key Is Exposed

If you accidentally commit or share your API key:

### **Step 1: Revoke the Key Immediately**
1. Go to https://rapidapi.com/hub
2. Click your profile → "My Apps"
3. Find the app using this key
4. Delete or regenerate the key

### **Step 2: Generate New Key**
1. Create new application on RapidAPI
2. Subscribe to "Real-Time Amazon Data" API (free tier)
3. Copy new key to `config.js`

### **Step 3: Clean Git History (if committed)**
```powershell
# Remove file from Git history (DESTRUCTIVE!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch config.js" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (if repository is public)
git push origin --force --all
```

### **Step 4: Update .gitignore**
```bash
# Ensure config.js is ignored
echo "config.js" >> .gitignore
git add .gitignore
git commit -m "Add config.js to gitignore"
```

---

## 📋 Rate Limit Protection

Your free tier has **100 requests/month**. Protect against exhaustion:

### **Current Protections:**
- Background checks every 3 hours (not every minute)
- 2-second delay between product checks
- Manual "Check Now" button (not auto-refresh)
- Mock data fallback if API disabled

### **Monitor Usage:**
```javascript
// Check your RapidAPI dashboard regularly
// Visit: https://rapidapi.com/developer/billing/subscriptions-and-usage
```

### **Adjust Check Frequency:**
```javascript
// In background.js, increase interval if needed
const CHECK_INTERVAL_MINUTES = 360; // 6 hours instead of 3
```

---

## 🔍 Security Audit Commands

Run these periodically:

```powershell
# Check if config.js is tracked by Git
git ls-files | Select-String "config.js"
# Should return: (empty)

# Check if config.js in gitignore
Get-Content .gitignore | Select-String "config.js"
# Should return: config.js

# Search for hardcoded key patterns (from project root)
Get-ChildItem -Recurse -File | Select-String "5954ac5c" -ErrorAction SilentlyContinue
# Should only find: config.js (and this SECURITY.md for reference)

# Check staged files before commit
git diff --cached --name-only
# Ensure config.js not listed
```

---

## 📞 Security Questions?

**Q: Is my key safe in the extension?**  
A: Yes! Chrome extensions run in isolated context. Web pages cannot access your extension's files.

**Q: Can users extract my key from the extension?**  
A: If you distribute as `.crx` package, someone with technical skills could unpack it. For personal use only, don't distribute.

**Q: Should I use environment variables?**  
A: For development, `config.js` is fine (gitignored). For distribution, use Chrome extension's managed storage or backend proxy.

**Q: What if I want to share my extension?**  
A: Either:
1. Host API key on your own backend server (proxy)
2. Have each user get their own RapidAPI key
3. Use Chrome extension's managed storage for enterprise deployment

---

## 🎯 Summary

**Three Golden Rules:**
1. **NEVER commit `config.js`** - It's gitignored for a reason
2. **NEVER hardcode keys** - Use import from config only
3. **ALWAYS verify before pushing** - Check `git status` first

Your API key is like a password. Treat it with the same care! 🔐
