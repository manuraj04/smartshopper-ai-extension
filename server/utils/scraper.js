// server/utils/scraper.js - Web scraping utilities for price extraction
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const os = require('os');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// RapidAPI configuration for Flipkart
const RAPIDAPI_CONFIG = {
  flipkart: {
    url: process.env.RAPIDAPI_FLIPKART_URL || 'https://real-time-flipkart-scraper.p.rapidapi.com/fk-product-details',
    key: process.env.RAPIDAPI_FLIPKART_KEY || '',
    host: process.env.RAPIDAPI_FLIPKART_HOST || 'real-time-flipkart-scraper.p.rapidapi.com'
  }
};

// Validate API key is configured
if (!RAPIDAPI_CONFIG.flipkart.key) {
  console.warn('⚠️  WARNING: RAPIDAPI_FLIPKART_KEY not configured. Flipkart scraping will fail.');
  console.warn('   Please set RAPIDAPI_FLIPKART_KEY in server/.env file');
}

// Try to find Chrome executable
function findChrome() {
  const platform = os.platform();
  const fs = require('fs');
  
  if (platform === 'win32') {
    const paths = [
      path.join(os.homedir(), '.cache', 'puppeteer', 'chrome', 'win64-142.0.7444.59', 'chrome-win64', 'chrome.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];
    
    for (const p of paths) {
      if (fs.existsSync(p)) {
        // Normalize path for Windows (convert backslashes)
        return p.replace(/\\/g, '/');
      }
    }
  }
  
  return undefined;
}

// Site-specific scraping configurations
const siteConfigs = {
  amazon: {
    baseUrl: 'https://www.amazon.in',
    searchUrl: 'https://www.amazon.in/s?k=',
    priceSelectors: [
      '.a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay span.a-price-whole',
      '.a-price.reinventPricePriceToPayMargin.priceToPay .a-offscreen',
      'span.a-price.aok-align-center span.a-offscreen',
      '.a-price-whole',
      '#corePrice_feature_div .a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.priceToPay .a-offscreen'
    ],
    nameSelectors: ['#productTitle', 'h1.product-title', 'span#productTitle'],
    searchResultSelector: '[data-component-type="s-search-result"]',
    searchPriceSelector: '.a-price .a-offscreen',
    searchNameSelector: 'h2 span',
    searchLinkSelector: 'h2 a.a-link-normal'
  },
  flipkart: {
    baseUrl: 'https://www.flipkart.com',
    searchUrl: 'https://www.flipkart.com/search?q=',
    priceSelectors: [
      'div._30jeq3._16Jk6d',
      'div._30jeq3',
      '._25b18c ._16Jk6d',
      '.CEmiEU div._16Jk6d',
      'div.Nx9bqj.CxhGGd',
      'div._16Jk6d'
    ],
    nameSelectors: [
      'span.VU-ZEz',
      'h1.yhB1nd',
      'span.B_NuCI',
      'h1._6EBuvT'
    ],
    searchResultSelector: 'div._1AtVbE, div._13oc-S, div._2kHMtA',
    searchPriceSelector: 'div._30jeq3, div._3I9_wc',
    searchNameSelector: 'div._4rR01T, a.s1Q9rs',
    searchLinkSelector: 'a._1fQZEK'
  },
  myntra: {
    baseUrl: 'https://www.myntra.com',
    searchUrl: 'https://www.myntra.com/search?q=',
    priceSelectors: [
      '.pdp-price strong',
      '.pdp-price',
      '.product-discountedPrice'
    ],
    nameSelectors: [
      '.pdp-title',
      'h1.pdp-name',
      '.product-product'
    ],
    searchResultSelector: '.product-base',
    searchPriceSelector: '.product-discountedPrice, .product-price',
    searchNameSelector: '.product-product, .product-brand',
    searchLinkSelector: 'a.product-base'
  },
  meesho: {
    baseUrl: 'https://www.meesho.com',
    searchUrl: 'https://www.meesho.com/search?q=',
    priceSelectors: [
      '.price',
      '.product-price',
      '[class*="ProductPrice"]'
    ],
    nameSelectors: [
      '.product-title',
      'h1[class*="ProductTitle"]'
    ],
    searchResultSelector: '[class*="ProductCard"]',
    searchPriceSelector: '[class*="Price"]',
    searchNameSelector: '[class*="ProductTitle"]',
    searchLinkSelector: 'a[class*="ProductCard"]'
  }
};

// Shared browser instance for better performance
let browserInstance = null;

async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    const chromePath = findChrome();
    
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    };
    
    // Add Chrome path if found
    if (chromePath) {
      launchOptions.executablePath = chromePath;
      console.log(`[Scraper] Using Chrome at: ${chromePath}`);
    }
    
    try {
      browserInstance = await puppeteer.launch(launchOptions);
      console.log('✓ Browser launched successfully');
    } catch (err) {
      console.error('Browser launch error:', err.message);
      throw new Error(`Failed to launch browser: ${err.message}`);
      throw err;
    }
  }
  return browserInstance;
}

// Close browser on process exit
process.on('exit', async () => {
  if (browserInstance) {
    await browserInstance.close();
  }
});

// Extract price from text using multiple patterns
function extractPrice(text) {
  if (!text) return null;
  
  // Remove whitespace and common prefixes
  const cleaned = text.trim().replace(/^(Price:|Rs\.?|₹|\$)\s*/i, '');
  
  // Match price patterns
  const patterns = [
    /₹\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,  // ₹1,499.00
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,       // 1,499.00
    /Rs\.?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/  // Rs. 1499
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const priceStr = match[1] || match[0];
      const numericPrice = parseFloat(priceStr.replace(/,/g, ''));
      if (numericPrice > 0) {
        return {
          raw: text,
          numeric: numericPrice,
          formatted: `₹${numericPrice.toLocaleString('en-IN')}`
        };
      }
    }
  }
  
  return null;
}

// Scrape product details from direct URL
async function scrapeProductUrl(url) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Determine site from URL
    let site = null;
    let config = null;
    
    for (const [siteName, siteConfig] of Object.entries(siteConfigs)) {
      if (url.includes(siteConfig.baseUrl.replace('https://', ''))) {
        site = siteName;
        config = siteConfig;
        break;
      }
    }
    
    if (!config) {
      throw new Error('Unsupported site');
    }
    
    // Extract price
    let price = null;
    for (const selector of config.priceSelectors) {
      try {
        const priceText = await page.$eval(selector, el => el.textContent.trim());
        price = extractPrice(priceText);
        if (price) break;
      } catch (err) {
        // Selector not found, try next one
        continue;
      }
    }
    
    // Extract product name
    let productName = null;
    for (const selector of config.nameSelectors) {
      try {
        productName = await page.$eval(selector, el => el.textContent.trim());
        if (productName) break;
      } catch (err) {
        continue;
      }
    }
    
    // Check availability
    const html = await page.content();
    const availability = html.toLowerCase().includes('out of stock') ? 'Out of Stock' : 'In Stock';
    
    return {
      site: site.charAt(0).toUpperCase() + site.slice(1),
      productName,
      price: price ? price.formatted : null,
      numericPrice: price ? price.numeric : null,
      url,
      availability,
      scrapedAt: new Date().toISOString()
    };
    
  } catch (err) {
    console.error(`Error scraping product URL ${url}:`, err.message);
    return null;
  } finally {
    await page.close();
  }
}

// Search for product and scrape results
async function scrapeSearchResults(site, productName, maxResults = 5) {
  const config = siteConfigs[site.toLowerCase()];
  if (!config) {
    throw new Error(`Unknown site: ${site}`);
  }
  
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const searchUrl = config.searchUrl + encodeURIComponent(productName);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for search results to load
    await page.waitForSelector(config.searchResultSelector, { timeout: 10000 });
    
    const html = await page.content();
    const $ = cheerio.load(html);
    
    const results = [];
    $(config.searchResultSelector).slice(0, maxResults).each((index, element) => {
      try {
        // Extract price
        let price = null;
        const priceSelectors = config.searchPriceSelector.split(',').map(s => s.trim());
        for (const selector of priceSelectors) {
          const priceText = $(element).find(selector).first().text().trim();
          if (priceText) {
            price = extractPrice(priceText);
            if (price) break;
          }
        }
        
        // Extract name
        let name = null;
        const nameSelectors = config.searchNameSelector.split(',').map(s => s.trim());
        for (const selector of nameSelectors) {
          name = $(element).find(selector).first().text().trim();
          if (name) break;
        }
        
        // Extract link
        let link = null;
        const linkElem = $(element).find(config.searchLinkSelector).first();
        if (linkElem.length > 0) {
          link = linkElem.attr('href');
          if (link && !link.startsWith('http')) {
            link = config.baseUrl + (link.startsWith('/') ? '' : '/') + link;
          }
        }
        
        if (price && name) {
          results.push({
            site: site.charAt(0).toUpperCase() + site.slice(1),
            productName: name,
            price: price.formatted,
            numericPrice: price.numeric,
            url: link || searchUrl,
            availability: 'In Stock',
            scrapedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error(`Error parsing result ${index}:`, err.message);
      }
    });
    
    return results;
    
  } catch (err) {
    console.error(`Error scraping search results for ${site}:`, err.message);
    return [];
  } finally {
    await page.close();
  }
}

// Main scraping function - searches for product on a site
async function scrapeSite(site, productName, productUrl = null) {
  console.log(`Scraping ${site} for: ${productName}`);
  
  try {
    // If direct URL provided, scrape it
    if (productUrl) {
      return await scrapeProductUrl(productUrl);
    }
    
    // Otherwise, search and get first result
    const results = await scrapeSearchResults(site, productName, 1);
    
    if (results.length > 0) {
      return results[0];
    }
    
    return null;
    
  } catch (err) {
    console.error(`Error in scrapeSite for ${site}:`, err.message);
    return null;
  }
}

// Legacy function - kept for backwards compatibility with fast fetch approach
async function scrapePrice(url) {
  try {
    const res = await fetch(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Determine site and use appropriate selectors
    let price = null;
    
    for (const [siteName, config] of Object.entries(siteConfigs)) {
      if (url.includes(config.baseUrl.replace('https://', ''))) {
        // Try each price selector
        for (const selector of config.priceSelectors) {
          const priceText = $(selector).first().text().trim();
          if (priceText) {
            const extracted = extractPrice(priceText);
            if (extracted) {
              price = extracted.formatted;
              break;
            }
          }
        }
        break;
      }
    }
    
    return price;
    
  } catch (err) {
    console.error('scrapePrice error:', err.message);
    return null;
  }
}

async function estimateTrend(url) {
  // Analyze price history from storage or database
  // For now, use simple heuristic based on current price vs average
  try {
    const currentPrice = await scrapePrice(url);
    if (!currentPrice) {
      return 'Unknown';
    }
    
    // TODO: Fetch historical prices from database
    // const history = await db.getPriceHistory(url);
    // const average = history.reduce((a, b) => a + b, 0) / history.length;
    // const current = parseFloat(currentPrice.replace(/[^0-9.]/g, ''));
    
    // For now, return random trend
    // In production, compare current vs historical average
    const trends = ['Rising', 'Falling', 'Stable'];
    return trends[Math.floor(Math.random() * trends.length)];
    
  } catch (err) {
    console.error('estimateTrend error:', err.message);
    return 'Unknown';
  }
}

// Get price history analysis
async function analyzePriceHistory(productId, currentPrice) {
  // TODO: Implement with database
  // const history = await db.getPriceHistory(productId);
  
  // Mock analysis for now
  return {
    lowestPrice: currentPrice * 0.85,
    highestPrice: currentPrice * 1.15,
    averagePrice: currentPrice,
    trend: await estimateTrend(null),
    recommendation: currentPrice < (currentPrice * 1.05) ? 'Buy Now' : 'Wait for discount'
  };
}

/**
 * Scrape Flipkart using RapidAPI (faster and more reliable)
 * @param {string} productUrl - Flipkart product URL
 * @returns {Promise<Object>} Product details
 */
async function scrapeFlipkartRapidAPI(productUrl) {
  try {
    console.log(`[RapidAPI] Scraping Flipkart: ${productUrl}`);
    
    const response = await fetch(RAPIDAPI_CONFIG.flipkart.url, {
      method: 'POST',
      headers: {
        'x-rapidapi-key': RAPIDAPI_CONFIG.flipkart.key,
        'x-rapidapi-host': RAPIDAPI_CONFIG.flipkart.host,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        urls: [productUrl]
      })
    });
    
    if (!response.ok) {
      throw new Error(`RapidAPI error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // RapidAPI returns array of results
    if (!data || !data.length || !data[0]) {
      throw new Error('No data returned from RapidAPI');
    }
    
    const product = data[0];
    
    // Extract price (handle both string and number formats)
    let price = null;
    if (product.price) {
      const priceStr = typeof product.price === 'string' ? product.price : String(product.price);
      price = extractPrice(priceStr);
    }
    
    return {
      site: 'Flipkart',
      productName: product.title || product.name || 'Unknown Product',
      price: price ? price.formatted : null,
      numericPrice: price ? price.numeric : null,
      url: productUrl,
      availability: product.in_stock ? 'In Stock' : 'Out of Stock',
      rating: product.rating || null,
      reviews: product.reviews_count || null,
      image: product.image || product.images?.[0] || null,
      scrapedAt: new Date().toISOString(),
      source: 'rapidapi'
    };
    
  } catch (err) {
    console.error(`[RapidAPI] Error scraping Flipkart:`, err.message);
    throw err;
  }
}

/**
 * Search Flipkart using RapidAPI
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results
 * @returns {Promise<Array>} Array of product results
 */
async function searchFlipkartRapidAPI(query, maxResults = 5) {
  try {
    console.log(`[RapidAPI] Searching Flipkart for: "${query}"`);
    
    // First, search on Flipkart to get product URLs
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;
    const browser = await getBrowser();
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extract product URLs from search results
    const productUrls = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/p/"]'));
      return links
        .map(link => link.href)
        .filter(url => url.includes('/p/'))
        .slice(0, 3); // Get top 3 URLs
    });
    
    await page.close();
    
    if (!productUrls.length) {
      console.log('[RapidAPI] No product URLs found in search');
      return [];
    }
    
    // Now fetch details using RapidAPI (more reliable than scraping)
    const response = await fetch(RAPIDAPI_CONFIG.flipkart.url, {
      method: 'POST',
      headers: {
        'x-rapidapi-key': RAPIDAPI_CONFIG.flipkart.key,
        'x-rapidapi-host': RAPIDAPI_CONFIG.flipkart.host,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        urls: productUrls
      })
    });
    
    if (!response.ok) {
      throw new Error(`RapidAPI error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Convert RapidAPI format to our format
    return data.filter(p => p && p.title).map(product => {
      const price = extractPrice(String(product.price || '0'));
      
      return {
        site: 'Flipkart',
        productName: product.title || product.name,
        price: price ? price.formatted : null,
        numericPrice: price ? price.numeric : null,
        url: product.url || productUrls[0],
        availability: product.in_stock ? 'In Stock' : 'Out of Stock',
        rating: product.rating || null,
        reviews: product.reviews_count || null,
        image: product.image || product.images?.[0] || null,
        scrapedAt: new Date().toISOString(),
        source: 'rapidapi'
      };
    }).slice(0, maxResults);
    
  } catch (err) {
    console.error(`[RapidAPI] Error searching Flipkart:`, err.message);
    return []; // Return empty array on error
  }
}

// Clean up browser on shutdown
async function cleanup() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

module.exports = { 
  scrapeSite,
  scrapeProductUrl,
  scrapeSearchResults,
  scrapeFlipkartRapidAPI,
  searchFlipkartRapidAPI,
  scrapePrice, 
  estimateTrend,
  analyzePriceHistory,
  extractPrice,
  cleanup,
  getBrowser
};
