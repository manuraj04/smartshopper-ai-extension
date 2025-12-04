/**
 * scripts/flipkart-search.js - Flipkart Product Scraper
 * 
 * USAGE:
 * node scripts/flipkart-search.js "iphone 14 pro"
 * 
 * OUTPUT:
 * data/flipkart_search_iphone-14-pro.json
 * 
 * SETUP:
 * npm install playwright
 * npx playwright install chromium
 * 
 * FEATURES:
 * - Scrapes top 20 Flipkart search results
 * - Extracts: title, url, product_id, price, image, rating
 * - Handles lazy loading (scrolls to load more)
 * - Polite delays between actions
 * - Retry logic for network errors
 * - Saves as JSON array or NDJSON
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  headless: true,
  baseUrl: 'https://www.flipkart.com',
  searchPath: '/search',
  maxResults: 20,
  politeDelay: 2000,        // 2 seconds between actions
  scrollDelay: 1000,        // 1 second after scroll
  maxRetries: 3,
  timeout: 30000
};

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate slug from search query
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Extract product ID from Flipkart URL
 */
function extractProductId(url) {
  const pidMatch = url.match(/[?&]pid=([A-Z0-9]+)/i);
  if (pidMatch) return pidMatch[1];
  
  const pathMatch = url.match(/\/p\/(itm[a-z0-9]+)/i);
  if (pathMatch) return pathMatch[1];
  
  return null;
}

/**
 * Parse price text to number (cents)
 */
function parsePrice(priceText) {
  if (!priceText) return null;
  
  const cleaned = priceText.replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned) * 100 : null;
}

/**
 * Scrape Flipkart search results
 */
async function scrapeFlipkartSearch(query) {
  console.log(`🔍 Scraping Flipkart for: "${query}"`);
  
  let browser;
  let results = [];
  
  try {
    // Launch browser
    browser = await chromium.launch({ headless: CONFIG.headless });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    const page = await context.newPage();
    
    // Navigate to search page
    const searchUrl = `${CONFIG.baseUrl}${CONFIG.searchPath}?q=${encodeURIComponent(query)}`;
    console.log(`📄 Loading: ${searchUrl}`);
    
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout 
    });
    
    // Wait for results to load
    await sleep(CONFIG.politeDelay);
    
    // Close any popups/modals
    try {
      const closeButton = page.locator('button:has-text("✕"), button._2KpZ6l');
      if (await closeButton.count() > 0) {
        await closeButton.first().click();
        await sleep(500);
      }
    } catch (e) {
      // Ignore if no popup
    }
    
    // Scroll to load more results (lazy loading)
    console.log('📜 Scrolling to load products...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await sleep(CONFIG.scrollDelay);
    }
    
    // Extract products using robust selectors
    console.log('🔎 Extracting product data...');
    
    const products = await page.evaluate(() => {
      const results = [];
      
      // Flipkart product cards - try multiple selectors
      const productSelectors = [
        '[data-id]',                    // Data attribute (most reliable)
        'a[href*="/p/"]',               // Product links
        'div._1AtVbE',                  // Common card class (fallback)
      ];
      
      let productCards = [];
      for (const selector of productSelectors) {
        productCards = document.querySelectorAll(selector);
        if (productCards.length > 0) break;
      }
      
      productCards.forEach(card => {
        try {
          // Extract URL
          const linkElem = card.querySelector('a[href*="/p/"]') || card;
          const url = linkElem.href || linkElem.getAttribute('href');
          
          if (!url) return;
          
          // Extract title
          const titleElem = card.querySelector('[class*="IRpwTa"], [class*="_4rR01T"], a[title]');
          const title = titleElem?.textContent?.trim() || titleElem?.getAttribute('title') || '';
          
          // Extract price
          const priceElem = card.querySelector('[class*="Nx9bqj"], [class*="_30jeq3"]');
          const priceText = priceElem?.textContent?.trim() || '';
          
          // Extract image
          const imgElem = card.querySelector('img');
          const image = imgElem?.src || imgElem?.getAttribute('data-src') || '';
          
          // Extract rating
          const ratingElem = card.querySelector('[class*="XQDdHH"]');
          const rating = ratingElem?.textContent?.trim() || '';
          
          // Product ID from data attribute or URL
          const productId = card.getAttribute('data-id') || 
                           url.match(/[?&]pid=([A-Z0-9]+)/i)?.[1] ||
                           url.match(/\/p\/(itm[a-z0-9]+)/i)?.[1];
          
          if (title && url) {
            results.push({
              title,
              url: url.startsWith('http') ? url : `https://www.flipkart.com${url}`,
              product_id: productId,
              price_text: priceText,
              image,
              rating
            });
          }
        } catch (e) {
          console.error('Error extracting product:', e);
        }
      });
      
      return results;
    });
    
    // Process and clean results
    results = products.slice(0, CONFIG.maxResults).map(p => ({
      title: p.title,
      url: p.url,
      product_id: p.product_id || extractProductId(p.url),
      price_cents: parsePrice(p.price_text),
      price_display: p.price_text,
      image: p.image,
      rating: p.rating,
      source: 'flipkart',
      scraped_at: new Date().toISOString()
    }));
    
    console.log(`✅ Extracted ${results.length} products`);
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return results;
}

/**
 * Save results to file
 */
function saveResults(query, results, format = 'json') {
  const slug = slugify(query);
  const dataDir = path.join(__dirname, '..', 'data');
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  const filename = `flipkart_search_${slug}.json`;
  const filepath = path.join(dataDir, filename);
  
  if (format === 'ndjson') {
    // Newline-delimited JSON
    const ndjson = results.map(r => JSON.stringify(r)).join('\n');
    fs.writeFileSync(filepath, ndjson);
  } else {
    // Regular JSON array
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  }
  
  console.log(`💾 Saved ${results.length} results to: ${filepath}`);
  return filepath;
}

/**
 * Main function with retry logic
 */
async function main() {
  const query = process.argv[2];
  
  if (!query) {
    console.error('❌ Usage: node scripts/flipkart-search.js "search query"');
    console.error('   Example: node scripts/flipkart-search.js "iphone 14 pro"');
    process.exit(1);
  }
  
  let lastError;
  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      console.log(`\n🚀 Attempt ${attempt}/${CONFIG.maxRetries}`);
      
      const results = await scrapeFlipkartSearch(query);
      
      if (results.length === 0) {
        console.warn('⚠️  No results found');
        return;
      }
      
      const filepath = saveResults(query, results);
      
      // Print summary
      console.log('\n📊 Summary:');
      console.log(`   Query: "${query}"`);
      console.log(`   Results: ${results.length}`);
      console.log(`   File: ${filepath}`);
      console.log('\n✨ Done!');
      
      return;
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt < CONFIG.maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  console.error(`\n❌ All ${CONFIG.maxRetries} attempts failed`);
  console.error('Last error:', lastError.message);
  process.exit(1);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { scrapeFlipkartSearch, saveResults };
