/**
 * extractors.js - Product Key Extraction for E-commerce Sites
 * 
 * PURPOSE:
 * Extract canonical product identifiers from Amazon, Flipkart, Myntra, and Meesho product pages.
 * Uses robust extraction methods: URL patterns → JSON-LD → Meta tags → Data attributes.
 * Avoids brittle CSS class selectors that break when sites update.
 * 
 * USAGE IN CONTENT SCRIPTS:
 * ```javascript
 * // Call on product page after DOM load
 * const product = await extractProductKey();
 * if (product) {
 *   console.log('Product ID:', product.canonical_key);
 *   console.log('Site:', product.site);
 *   console.log('Title:', product.title);
 *   
 *   // Send to backend for price tracking
 *   fetch(`/v1/price?site=${product.site}&id=${product.id}&title=${encodeURIComponent(product.title)}`);
 * }
 * ```
 * 
 * RETURNS:
 * {
 *   site: 'amazon' | 'flipkart' | 'myntra' | 'meesho',
 *   id: string,              // Raw extracted ID (ASIN, PID, styleId, etc.)
 *   canonical_key: string,   // Normalized key (e.g., 'amazon:B0ABC123XY')
 *   title?: string,          // Product title
 *   model?: string,          // Model number/SKU
 *   image?: string           // Product image URL
 * }
 * or null if not a supported product page
 * 
 * DEBUG MODE:
 * Set window.SMARTSHOPPER_DEBUG = true in console to see extraction steps
 * 
 * CONSTRAINTS:
 * - Does NOT use brittle CSS class selectors
/**
 * - No API keys embedded
 * - No network calls from this module
 */

// Helper to get window object (global.window in tests, window in browser)
function getWindow() {
  if (typeof global !== 'undefined' && global.window) {
    return global.window;
  }
  if (typeof window !== 'undefined') {
    return window;
  }
  throw new Error('No window object available');
}

// Helper to get document object
function getDocument() {
  if (typeof global !== 'undefined' && global.document) {
    return global.document;
  }
  if (typeof document !== 'undefined') {
    return document;
  }
  throw new Error('No document object available');
}

const DEBUG = () => {
  const win = getWindow();
  return win && win.SMARTSHOPPER_DEBUG === true;
};

function debug(...args) {
  if (DEBUG()) {
    console.debug('[SmartShopper Extractor]', ...args);
  }
}

/**
 * Extract product key from current page
 * @returns {Promise<Object|null>} Product data or null
 */
async function extractProductKey() {
  const win = getWindow();
  const url = win.location.href;
  const hostname = win.location.hostname;
  
  debug('Starting extraction for URL:', url);
  
  // Detect site
  let site = null;
  if (hostname.includes('amazon.')) {
    site = 'amazon';
  } else if (hostname.includes('flipkart.com')) {
    site = 'flipkart';
  } else if (hostname.includes('myntra.com')) {
    site = 'myntra';
  } else if (hostname.includes('meesho.com')) {
    site = 'meesho';
  } else {
    debug('Not a supported e-commerce site');
    return null;
  }
  
  debug('Detected site:', site);
  
  // Site-specific extraction
  let result = null;
  
  switch (site) {
    case 'amazon':
      result = await extractAmazon(url);
      break;
    case 'flipkart':
      result = await extractFlipkart(url);
      break;
    case 'myntra':
      result = await extractMyntra(url);
      break;
    case 'meesho':
      result = await extractMeesho(url);
      break;
  }
  
  if (result) {
    result.site = site;
    result.canonical_key = `${site}:${result.id}`;
    debug('✅ Extraction successful:', result);
  } else {
    debug('❌ Extraction failed for', site);
  }
  
  return result;
}

/**
 * Extract Amazon ASIN (10 character alphanumeric ID)
 */
async function extractAmazon(url) {
  const doc = getDocument();
  debug('[Amazon] Starting extraction');
  
  // Method 1: URL patterns
  // Amazon URLs: /dp/ASIN or /gp/product/ASIN or /product/ASIN
  const urlPatterns = [
    /\/dp\/([A-Z0-9]{10})/,
    /\/gp\/product\/([A-Z0-9]{10})/,
    /\/product\/([A-Z0-9]{10})/,
    /[?&]asin=([A-Z0-9]{10})/i
  ];
  
  for (const pattern of urlPatterns) {
    const match = url.match(pattern);
    if (match) {
      debug('[Amazon] Found ASIN in URL:', match[1]);
      const asin = match[1];
      return {
        id: asin,
        ...(await extractCommonMetadata())
      };
    }
  }
  
  // Method 2: JSON-LD structured data
  const jsonLd = await findInJsonLd();
  if (jsonLd) {
    const asin = jsonLd.sku || jsonLd.productID || jsonLd.gtin13;
    if (asin && /^[A-Z0-9]{10}$/.test(asin)) {
      debug('[Amazon] Found ASIN in JSON-LD:', asin);
      return {
        id: asin,
        title: jsonLd.name,
        image: jsonLd.image?.[0] || jsonLd.image,
        model: jsonLd.model
      };
    }
  }
  
  // Method 3: Meta tags
  const metaAsin = doc.querySelector('meta[name="keywords"]')?.content.match(/\b[A-Z0-9]{10}\b/)?.[0];
  if (metaAsin) {
    debug('[Amazon] Found ASIN in meta keywords:', metaAsin);
    return {
      id: metaAsin,
      ...(await extractCommonMetadata())
    };
  }
  
  // Method 4: Data attributes (safer than classes)
  const asinAttr = doc.querySelector('[data-asin]')?.getAttribute('data-asin');
  if (asinAttr && /^[A-Z0-9]{10}$/.test(asinAttr)) {
    debug('[Amazon] Found ASIN in data-asin:', asinAttr);
    return {
      id: asinAttr,
      ...(await extractCommonMetadata())
    };
  }
  
  debug('[Amazon] No ASIN found');
  return null;
}

/**
 * Extract Flipkart PID (product ID from URL)
 */
async function extractFlipkart(url) {
  const doc = getDocument();
  debug('[Flipkart] Starting extraction');
  
  // Method 1: URL patterns
  // Flipkart URLs: /product/p/itmXXX or ?pid=XXX
  const pidMatch = url.match(/[?&]pid=([A-Z0-9]+)/i);
  if (pidMatch) {
    debug('[Flipkart] Found PID in URL:', pidMatch[1]);
    return {
      id: pidMatch[1],
      ...(await extractCommonMetadata())
    };
  }
  
  // Extract from path: /product-name/p/itmABCD123
  const pathMatch = url.match(/\/p\/(itm[a-z0-9]+)/i);
  if (pathMatch) {
    debug('[Flipkart] Found ITM in path:', pathMatch[1]);
    return {
      id: pathMatch[1],
      ...(await extractCommonMetadata())
    };
  }
  
  // Method 2: JSON-LD structured data
  const jsonLd = await findInJsonLd();
  if (jsonLd) {
    const pid = jsonLd.sku || jsonLd.productID;
    if (pid) {
      debug('[Flipkart] Found PID in JSON-LD:', pid);
      return {
        id: pid,
        title: jsonLd.name,
        image: jsonLd.image?.[0] || jsonLd.image,
        model: jsonLd.model
      };
    }
  }
  
  // Method 3: Meta tags
  const ogUrl = doc.querySelector('meta[property="og:url"]')?.content;
  if (ogUrl) {
    const ogPidMatch = ogUrl.match(/[?&]pid=([A-Z0-9]+)/i);
    if (ogPidMatch) {
      debug('[Flipkart] Found PID in og:url:', ogPidMatch[1]);
      return {
        id: ogPidMatch[1],
        ...(await extractCommonMetadata())
      };
    }
  }
  
  // Method 4: Data attributes
  const pidAttr = doc.querySelector('[data-pid]')?.getAttribute('data-pid');
  if (pidAttr) {
    debug('[Flipkart] Found PID in data-pid:', pidAttr);
    return {
      id: pidAttr,
      ...(await extractCommonMetadata())
    };
  }
  
  debug('[Flipkart] No PID found');
  return null;
}

/**
 * Extract Myntra style ID or product ID
 */
async function extractMyntra(url) {
  const doc = getDocument();
  debug('[Myntra] Starting extraction');
  
  // Method 1: URL patterns
  // Myntra URLs: /product-name/12345678 or /12345678
  const styleIdMatch = url.match(/\/(\d{6,10})(?:\/|$|\?)/);
  if (styleIdMatch) {
    debug('[Myntra] Found style ID in URL:', styleIdMatch[1]);
    return {
      id: styleIdMatch[1],
      ...(await extractCommonMetadata())
    };
  }
  
  // Method 2: JSON-LD structured data
  const jsonLd = await findInJsonLd();
  if (jsonLd) {
    const styleId = jsonLd.sku || jsonLd.productID;
    if (styleId && /^\d{6,10}$/.test(styleId)) {
      debug('[Myntra] Found style ID in JSON-LD:', styleId);
      return {
        id: styleId,
        title: jsonLd.name,
        image: jsonLd.image?.[0] || jsonLd.image,
        model: jsonLd.model
      };
    }
  }
  
  // Method 3: Meta tags
  const ogUrl = doc.querySelector('meta[property="og:url"]')?.content;
  if (ogUrl) {
    const ogStyleMatch = ogUrl.match(/\/(\d{6,10})(?:\/|$|\?)/);
    if (ogStyleMatch) {
      debug('[Myntra] Found style ID in og:url:', ogStyleMatch[1]);
      return {
        id: ogStyleMatch[1],
        ...(await extractCommonMetadata())
      };
    }
  }
  
  // Method 4: Data attributes
  const styleAttr = doc.querySelector('[data-product-id]')?.getAttribute('data-product-id') ||
                    doc.querySelector('[data-style-id]')?.getAttribute('data-style-id');
  if (styleAttr && /^\d{6,10}$/.test(styleAttr)) {
    debug('[Myntra] Found style ID in data attribute:', styleAttr);
    return {
      id: styleAttr,
      ...(await extractCommonMetadata())
    };
  }
  
  debug('[Myntra] No style ID found');
  return null;
}

/**
 * Extract Meesho product ID
 */
async function extractMeesho(url) {
  const doc = getDocument();
  debug('[Meesho] Starting extraction');
  
  // Method 1: URL patterns
  // Meesho URLs: /product/name/12345678 or /p/12345678
  const productIdMatch = url.match(/\/(?:product|p)\/[^\/]+\/(\d+)|\/p\/(\d+)/);
  if (productIdMatch) {
    const productId = productIdMatch[1] || productIdMatch[2];
    debug('[Meesho] Found product ID in URL:', productId);
    return {
      id: productId,
      ...(await extractCommonMetadata())
    };
  }
  
  // Method 2: JSON-LD structured data
  const jsonLd = await findInJsonLd();
  if (jsonLd) {
    const productId = jsonLd.sku || jsonLd.productID;
    if (productId) {
      debug('[Meesho] Found product ID in JSON-LD:', productId);
      return {
        id: productId,
        title: jsonLd.name,
        image: jsonLd.image?.[0] || jsonLd.image,
        model: jsonLd.model
      };
    }
  }
  
  // Method 3: Meta tags
  const ogUrl = doc.querySelector('meta[property="og:url"]')?.content;
  if (ogUrl) {
    const ogProductMatch = ogUrl.match(/\/(?:product|p)\/[^\/]+\/(\d+)|\/p\/(\d+)/);
    if (ogProductMatch) {
      const productId = ogProductMatch[1] || ogProductMatch[2];
      debug('[Meesho] Found product ID in og:url:', productId);
      return {
        id: productId,
        ...(await extractCommonMetadata())
      };
    }
  }
  
  // Method 4: Data attributes
  const productAttr = doc.querySelector('[data-product-id]')?.getAttribute('data-product-id');
  if (productAttr) {
    debug('[Meesho] Found product ID in data attribute:', productAttr);
    return {
      id: productAttr,
      ...(await extractCommonMetadata())
    };
  }
  
  debug('[Meesho] No product ID found');
  return null;
}

/**
 * Extract JSON-LD structured data from page
 * @returns {Object|null} Product schema data
 */
async function findInJsonLd() {
  const doc = getDocument();
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);
      
      // Handle single object or array
      const items = Array.isArray(data) ? data : [data];
      
      for (const item of items) {
        // Look for Product schema
        if (item['@type'] === 'Product' || 
            item['@type']?.includes('Product') ||
            item.product?.['@type'] === 'Product') {
          const product = item['@type'] === 'Product' ? item : item.product;
          debug('Found JSON-LD Product schema:', product);
          return product;
        }
      }
    } catch (e) {
      debug('Failed to parse JSON-LD:', e);
    }
  }
  
  return null;
}

/**
 * Extract common metadata (title, image) from meta tags
 * @returns {Object} Metadata object
 */
async function extractCommonMetadata() {
  const doc = getDocument();
  const metadata = {};
  
  // Title: og:title > twitter:title > meta title > doc.title
  metadata.title = 
    doc.querySelector('meta[property="og:title"]')?.content ||
    doc.querySelector('meta[name="twitter:title"]')?.content ||
    doc.querySelector('meta[name="title"]')?.content ||
    doc.title;
  
  // Image: og:image > twitter:image
  metadata.image = 
    doc.querySelector('meta[property="og:image"]')?.content ||
    doc.querySelector('meta[name="twitter:image"]')?.content;
  
  // Model/SKU from meta
  metadata.model = 
    doc.querySelector('meta[property="product:model"]')?.content ||
    doc.querySelector('meta[name="product:sku"]')?.content;
  
  debug('Extracted common metadata:', metadata);
  return metadata;
}

// Export for both ES modules and browser/tests
if (typeof window !== 'undefined') {
  window.extractProductKey = extractProductKey;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extractProductKey };
}
