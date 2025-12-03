
// background.js - minimal service worker
// Keep this file simple; add message handlers here if needed.

self.addEventListener('install', (event) => {
  // service worker installed
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // activated
  console.log('Comparify service worker activated');
});

// Handle backend price fetching without opening visible tabs
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchPrice') {
    // Fetch page in background and extract price
    fetchPriceInBackground(request.url, request.siteName)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }
});

// Fetch price from search results page without opening visible tab
async function fetchPriceInBackground(url, siteName) {
  try {
    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to fetch' };
    }

    const html = await response.text();
    
    // Parse HTML and extract price based on site
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    let price = null;
    let productUrl = null;
    let productName = null;

    if (siteName === 'Amazon') {
      // Amazon search results parsing
      const firstResult = doc.querySelector('[data-component-type="s-search-result"]');
      if (firstResult) {
        const priceElem = firstResult.querySelector('.a-price .a-offscreen, .a-price-whole');
        if (priceElem) {
          const text = priceElem.textContent.replace(/[^0-9,\.]/g, '').replace(/,/g, '');
          if (text && parseFloat(text) > 0) {
            price = '₹' + parseInt(text.split('.')[0]).toLocaleString('en-IN');
          }
        }
        
        const linkElem = firstResult.querySelector('h2 a, .a-link-normal.s-no-outline');
        if (linkElem) {
          productUrl = 'https://www.amazon.in' + linkElem.getAttribute('href');
        }
        
        const nameElem = firstResult.querySelector('h2 span, .a-text-normal');
        if (nameElem) {
          productName = nameElem.textContent.trim();
        }
      }
    } else if (siteName === 'Flipkart') {
      // Flipkart search results parsing
      const firstResult = doc.querySelector('div._1AtVbE, div._13oc-S, div._2kHMtA, a._1fQZEK');
      if (firstResult) {
        const priceSelectors = ['div._30jeq3', 'div._3I9_wc', 'div.Nx9bqj'];
        for (const selector of priceSelectors) {
          const priceElem = firstResult.querySelector(selector);
          if (priceElem && priceElem.textContent.trim()) {
            const text = priceElem.textContent.replace(/[^0-9,]/g, '').replace(/,/g, '');
            if (text && parseFloat(text) > 0) {
              price = '₹' + parseInt(text).toLocaleString('en-IN');
              break;
            }
          }
        }
        
        const linkElem = firstResult.closest('a') || firstResult.querySelector('a');
        if (linkElem) {
          const href = linkElem.getAttribute('href');
          productUrl = href.startsWith('http') ? href : 'https://www.flipkart.com' + href;
        }
        
        const nameSelectors = ['div._4rR01T', 'a.s1Q9rs', 'div.IRpwTa'];
        for (const selector of nameSelectors) {
          const nameElem = firstResult.querySelector(selector);
          if (nameElem && nameElem.textContent.trim()) {
            productName = nameElem.textContent.trim();
            break;
          }
        }
      }
    } else if (siteName === 'Myntra') {
      // Myntra search results parsing
      const firstResult = doc.querySelector('.product-base, .product-productMetaInfo');
      if (firstResult) {
        const priceElem = firstResult.querySelector('.product-discountedPrice, .product-price');
        if (priceElem) {
          const text = priceElem.textContent.replace(/[^0-9,]/g, '').replace(/,/g, '');
          if (text && parseFloat(text) > 0) {
            price = '₹' + parseInt(text).toLocaleString('en-IN');
          }
        }
        
        const linkElem = firstResult.closest('a') || firstResult.querySelector('a');
        if (linkElem) {
          const href = linkElem.getAttribute('href');
          productUrl = href.startsWith('http') ? href : 'https://www.myntra.com' + href;
        }
      }
    }

    if (price) {
      return {
        success: true,
        price,
        productUrl,
        productName
      };
    } else {
      return { success: false, error: 'Price not found' };
    }

  } catch (err) {
    console.error('Background fetch error:', err);
    return { success: false, error: err.message };
  }
}

// Example message handler (for future use)
self.addEventListener('message', (event) => {
  console.log('BG received message:', event.data);
});

