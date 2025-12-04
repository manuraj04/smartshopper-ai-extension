# 🛍️ SmartShopper - Smart Price Comparison Extension

A powerful Chrome extension that helps you find the best deals across Amazon, Flipkart, and Myntra with AI-powered shopping assistance.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Chrome](https://img.shields.io/badge/Chrome-Extension-yellow)

## ✨ Features

### 🔍 **Smart Price Comparison**

- **Auto-Load**: Automatically compares prices when you open the extension on a product page
- **Backend Fetching**: All price searches happen invisibly in the background (no tab clutter)
- **Multi-Site Support**: Compares prices across Amazon, Flipkart, and Myntra
- **Real-Time Data**: Extracts actual prices from product and search result pages

### 🤖 **AI Shopping Assistant** (Powered by Google Gemini)

- Ask questions about products: "Should I buy this?"
- Get money-saving tips: "Where can I save money?"
- Product analysis: Works for clothes, electronics, appliances, everything!
- Smart recommendations based on current price comparison data

### ⚡ **Quick Actions**

- **One-Click Comparison**: Instant price comparison across 3 major e-commerce sites
- **Product Summarize**: Extract key details (name, price, rating, reviews)
- **Track Prices**: Add products to your watchlist (coming soon)
- **Copy URL**: Paste product links with one click

## 🚀 Installation

### For Users

1. **Download the Extension**

   bash
   git clone https://github.com/manuraj04/smartshopper-ai-extension.git

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `smartshopper-ai-extension` folder

3. **Start Using**
   - Visit any product page on Amazon, Flipkart, or Myntra
   - Click the SmartShopper extension icon
   - Prices will automatically load!

### For Developers

1. **Clone Repository**

   bash
   git clone <https://github.com/manuraj04/smartshopper-ai-extension.git>
   cd smartshopper-ai-extension
   

2. **Setup Gemini AI (Optional but Recommended)**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key" (free tier: 60 req/min, 1500 req/day)
   - Copy your API key
   - In the extension folder, copy `gemini-config.example.js` to `gemini-config.js`:

     bash
     cp gemini-config.example.js gemini-config.js
     

   - Open `gemini-config.js` and replace `'YOUR_GEMINI_API_KEY_HERE'` with your actual API key
   - Save the file (it's already gitignored, so your key stays private!)

3. **Load Extension** (same as user installation step 2)

## 📖 Usage

### Basic Usage

1. Visit any product page on Amazon, Flipkart, or Myntra
2. Click the SmartShopper extension icon in your toolbar
3. Prices automatically load from all 3 sites
4. See the best price highlighted in green
5. Click site links to visit the product page

### AI Assistant

1. After prices load, scroll to "AI Shopping Assistant"
2. Type your question (e.g., "Should I buy this?")
3. Click "Generate Insights"
4. Get intelligent AI-powered advice

### Other Features

- **Summarize**: Click to extract product name, price, rating, and reviews
- **Track**: Add product to watchlist (feature coming soon)
- **Paste URL**: Quickly paste product URL from clipboard

## 🎯 How It Works

### Price Extraction

1. **Current Page**: Extracts price from the product page you're viewing
2. **Keyword Extraction**: Intelligently extracts product keywords (removes stop words, handles URL encoding)
3. **Background Search**: Sends search queries to other sites using `fetch()` API
4. **DOM Parsing**: Parses HTML and extracts prices from first search result
5. **Display Results**: Shows all prices sorted from lowest to highest

### AI Integration

1. **Context Building**: Collects current product name and available prices
2. **API Call**: Sends context + user query to Google Gemini API
3. **Smart Response**: Returns intelligent shopping advice in 2-3 sentences
4. **Fallback**: If API fails, uses local AI logic for offline responses

## 🔒 Security & Privacy

### 🛡️ **API Key Protection**

- ⚠️ **NEVER commit your actual API key to GitHub!**
- API keys are stored locally in your browser extension only
- `gemini-config.js` is in `.gitignore` (protected)
- Keep your API key private and secure

### 🔐 **Data Privacy**

- ✅ All price fetching happens client-side in your browser
- ✅ No personal data is collected or stored
- ✅ No tracking or analytics
- ✅ Data sent only to:
  - E-commerce sites (for price data)
  - Google Gemini API (if enabled, for AI responses)
- ✅ Comparison data stored temporarily in memory only

## 📁 Project Structure


smartshopper-ai-extension/
├── icons/                      # Extension icons
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── popup/                      # Extension popup UI
│   ├── popup.html             # Main UI structure
│   ├── popup.css              # Styles with dark mode
│   └── popup.js               # Core logic (price extraction, AI)
├── background.js              # Background service worker (fetch prices)
├── manifest.json              # Chrome extension configuration
├── gemini-config.example.js   # API config template (committed)
├── gemini-config.js           # Your actual API key (gitignored, create from example)
└── README.md                  # This file


## 🛠️ Technical Details

### Technologies Used

- **Chrome Extension Manifest V3**
- **Vanilla JavaScript** (no frameworks)
- **CSS Variables** (dark mode support)
- **Google Gemini AI API** (free tier)
- **Chrome APIs**: `tabs`, `scripting`, `storage`, `runtime`

### Supported Sites

| Site | Price Extraction | Search Support | Selectors |
|------|-----------------|----------------|-----------|
| **Amazon.in** | ✅ | ✅ | 12+ price patterns |
| **Flipkart.com** | ✅ | ✅ | 10+ price patterns |
| **Myntra.com** | ✅ | ✅ | 6+ price patterns |

### Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave 1.20+
- ❌ Firefox (uses different extension API)

## 🐛 Troubleshooting

### Prices Not Loading?

- Check if you're on a supported site (Amazon/Flipkart/Myntra)
- Reload the extension at `chrome://extensions/`
- Check browser console (F12) for error messages
- Site selectors may have changed (open an issue on GitHub)

### AI Not Working?

- Verify API key is correctly added in `popup/popup.js`
- Check you haven't exceeded rate limits (60/min, 1500/day)
- Extension will fallback to local AI if Gemini API fails
- Check internet connection

### "Could not extract price from this page"?

- Product page structure may have changed
- Try refreshing the page
- Some products (out of stock, restricted) may not show prices

## 🚧 Known Limitations

1. **CORS Restrictions**: Some sites may block background `fetch()` requests
2. **Dynamic Content**: Search results loaded with JavaScript may not be captured
3. **Rate Limits**: Gemini AI has free tier limits (60 req/min, 1500 req/day)
4. **Selector Changes**: E-commerce sites update their HTML structure periodically
5. **India Only**: Currently supports `.in` domains only

## 🔮 Roadmap

- [ ] Price history tracking with charts
- [ ] Price drop notifications
- [ ] Support for more sites (Snapdeal, Paytm Mall, etc.)
- [ ] Export comparison as CSV/PDF
- [ ] Voice input for AI questions
- [ ] Price prediction using ML
- [ ] Browser action badge with price difference
- [ ] Multi-currency support

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Important Rules

- ⚠️ **NEVER commit API keys or secrets**
- ✅ Test your changes on all 3 supported sites
- ✅ Follow existing code style
- ✅ Update README if adding new features

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Manu Raj**

- GitHub: [@manuraj04](https://github.com/manuraj04)
- Repository: [smartshopper-ai-extension](https://github.com/manuraj04/smartshopper-ai-extension)

## 🙏 Acknowledgments

- Google Gemini AI for free API tier
- Chrome Extensions documentation
- All contributors and users

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/manuraj04/smartshopper-ai-extension/issues)
- **Discussions**: [GitHub Discussions](https://github.com/manuraj04/smartshopper-ai-extension/discussions)

**Made with ❤️ for smart shoppers**

*Save money, shop smarter with SmartShopper!*
