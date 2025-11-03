# SmartShopper AI Extension

This repository contains a scaffold for a Chrome/Edge browser extension called SmartShopper AI plus a small local server for scraping/insights.

What was added
- `manifest.json` - extension manifest (MV3)
- `background.js`, `content.js`
- `popup/` (popup.html, popup.js, popup.css)
- `overlay/` (overlay.html, overlay.js, overlay.css)
- `assets/` (placeholder logos)
- `scripts/` (api.js, aiEngine.js, storage.js)
- `server/` (Express server scaffold with routes and scraper)

Notes
- I detected an existing `package.json` in the workspace and did not overwrite it. If you want a fresh `package.json` for the server, let me know and I can add `package.server.json` or a default one and install deps.
- Placeholder logos were created as tiny base64 PNG placeholders. Replace `assets/logo*.png` with proper icons.
- The server uses `node-fetch` and `express`; install them in your project if you want to run `server/index.js`.

Quick start for the server

1. From the `server/` folder, install deps (in PowerShell):

```powershell
cd server; npm install express body-parser node-fetch@2
```

2. Run the server:

```powershell
node index.js
```

Load the extension in Chrome/Edge
1. Open `chrome://extensions/` (or edge://extensions/)
2. Enable "Developer mode"
3. Click "Load unpacked" and pick the repository root

API Integration Status
- ✅ Mock APIs working (development mode)
- ✅ **RapidAPI integration ready** (Real Amazon data)
- ✅ Server endpoints created
- ⏳ Real web scraping pending for other sites
- ⏳ Database integration pending

**🚀 Enable Real Amazon API:** See [RAPIDAPI_SETUP.md](./RAPIDAPI_SETUP.md) for step-by-step guide (FREE - 100 requests/month)

For backend API integration instructions, see [API_INTEGRATION.md](./API_INTEGRATION.md)

Next steps I can help with
- Implement real web scraping (Puppeteer/Cheerio)
- Add database for price history tracking
- Set up authentication and API keys
- Replace placeholder images with proper icons
- Add unit tests and basic CI
- Deploy backend server to production

