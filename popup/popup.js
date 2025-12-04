// popup.js - UI behaviour and placeholder logic
document.addEventListener('DOMContentLoaded', async () => {
  const closeBtn = document.getElementById('close-btn');
  const pasteBtn = document.getElementById('paste-btn');
  const productUrl = document.getElementById('product-url');
  const compareBtn = document.getElementById('compare-prices');
  const summarizeBtn = document.getElementById('summarize-btn');
  const generateBtn = document.getElementById('generate-btn');
  const priceComp = document.getElementById('price-comparison');
  const priceTable = document.getElementById('price-table');
  const status = document.getElementById('status');
  const trackBtn = document.getElementById('track-product');

  // Auto-load current tab URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      productUrl.value = tab.url;
      
      // Auto-compare prices if on a product page
      if (tab.url.includes('amazon.') || tab.url.includes('flipkart.com') || tab.url.includes('myntra.com')) {
        // Automatically trigger price comparison
        setTimeout(() => handleCompare(), 500);
      }
    }
  } catch (err) {
    console.error('Failed to load current URL:', err);
  }

  // Store latest comparison data for AI
  let latestComparisonData = null;

  // close popup
  closeBtn.addEventListener('click', () => window.close());

  // paste from clipboard
  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        productUrl.value = text;
        showStatus('✅ Pasted from clipboard!');
      } else {
        showStatus('⚠️ Clipboard is empty.');
      }
    } catch (err) {
      // Fallback: use execCommand if clipboard API fails
      try {
        productUrl.focus();
        document.execCommand('paste');
        showStatus('✅ Pasted!');
      } catch (e) {
        showStatus('❌ Clipboard access denied. Please paste manually (Ctrl+V).');
        productUrl.focus();
      }
      console.error('Clipboard error:', err);
    }
  });

  // Compare prices - extract real price from current page
  compareBtn.addEventListener('click', handleCompare);

  async function handleCompare() {
    const url = productUrl.value.trim();
    if (!url) {
      showStatus('Please paste a product URL.');
      return;
    }

    showStatus('Extracting price from page...');
    priceTable.innerHTML = '';
    priceComp.classList.add('hidden');

    try {
      // Get current tab and extract price
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        showStatus('Cannot access current page.');
        return;
      }

      // Inject script to extract price from page
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPriceFromPage
      });

      const priceData = results[0]?.result;

      if (!priceData || !priceData.price) {
        priceTable.innerHTML = '<div style="padding:10px;text-align:center;color:#6b7280;font-size:12px">❌ Could not extract price from this page. Make sure you\'re on a product page (Amazon, Flipkart, etc.)</div>';
        priceComp.classList.remove('hidden');
        showStatus('No price data found.');
        return;
      }

      // Start with current site price
      const allPrices = [priceData];
      
      // Search other sites using backend matcher
      if (priceData.productName && priceData.productId) {
        showStatus('🔍 Searching across sites using smart matcher...');
        
        try {
          // Call backend /v1/search-crosssite endpoint
          const backendUrl = 'http://localhost:3000/v1/search-crosssite';
          const params = new URLSearchParams({
            site: priceData.site.toLowerCase(),
            id: priceData.productId,
            title: priceData.productName
          });
          
          console.log('[Compare] Calling backend:', `${backendUrl}?${params}`);
          const response = await fetch(`${backendUrl}?${params}`);
          const matchData = await response.json();
          console.log('[Compare] Backend response:', matchData);
          
          if (matchData && matchData.results && matchData.results.length > 0) {
            console.log('[Compare] Found', matchData.results.length, 'site results');
            // Add all site results (both available and not available)
            for (const result of matchData.results) {
              console.log('[Compare] Site:', result.site, 'available:', result.available, 'score:', result.score);
              
              if (result.available) {
                // Product found on this site
                allPrices.push({
                  site: result.site.charAt(0).toUpperCase() + result.site.slice(1),
                  price: `₹${(result.price_cents / 100).toLocaleString('en-IN')}`,
                  url: result.url,
                  status: 'available',
                  productName: result.title,
                  matchScore: result.score,
                  matchQuality: result.match_quality
                });
              } else {
                // Product not available on this site
                allPrices.push({
                  site: result.site.charAt(0).toUpperCase() + result.site.slice(1),
                  price: 'Not Available',
                  url: result.url, // Search URL as fallback
                  status: 'not-found',
                  productName: result.title,
                  matchScore: result.score,
                  reason: result.reason
                });
              }
            }
            
            const availableCount = matchData.results.filter(r => r.available).length;
            showStatus(`✅ Found on ${availableCount} other site(s)`);
          } else {
            showStatus('⚠️ No matching products found on other sites');
          }
        } catch (backendError) {
          console.warn('Backend matcher failed, trying RapidAPI fallback:', backendError);
          showStatus('🔍 Backend unavailable, trying RapidAPI...');
          
          // Fallback to RapidAPI
          try {
            const { getPrices } = await import('../scripts/api.js');
            const apiPrices = await getPrices(priceData.productName, url);
            
            if (apiPrices && apiPrices.length > 0) {
              const otherSitePrices = apiPrices.filter(p => p.site !== priceData.site);
              allPrices.push(...otherSitePrices);
              showStatus('✅ Got prices from RapidAPI');
            }
          } catch (apiError) {
            console.warn('RapidAPI also failed:', apiError);
            showStatus('⚠️ Could not fetch prices from other sites');
          }
        }
      } else {
        showStatus('⚠️ Missing product ID or name, showing current site only.');
      }

      // Sort by price (lowest first), putting "Not Found" at the end
      allPrices.sort((a, b) => {
        if (a.status === 'not-found') return 1;
        if (b.status === 'not-found') return -1;
        if (a.status === 'out-of-stock') return 1;
        if (b.status === 'out-of-stock') return -1;
        
        const priceA = parseFloat(a.price.replace(/[^0-9.]/g, ''));
        const priceB = parseFloat(b.price.replace(/[^0-9.]/g, ''));
        return priceA - priceB;
      });

      // Display all prices
      displayRealPrices(allPrices, priceData.site);
      priceComp.classList.remove('hidden');
      trackBtn.classList.remove('hidden');
      
      // Store comparison data for AI
      latestComparisonData = {
        productName: priceData.productName,
        currentSite: priceData.site,
        prices: allPrices,
        timestamp: new Date().toISOString()
      };
      
      showStatus(`Found prices across ${allPrices.filter(p => p.status !== 'not-found').length} sites`);

    } catch (error) {
      console.error('Price extraction error:', error);
      priceTable.innerHTML = '<div style="padding:10px;text-align:center;color:#dc2626;font-size:12px">⚠️ Error: ' + escapeHtml(error.message) + '</div>';
      priceComp.classList.remove('hidden');
      showStatus('Failed to extract price.');
    }
  }

  // Track product price
  trackBtn.addEventListener('click', async () => {
    try {
      const url = productUrl.value.trim();
      if (!url) {
        showStatus('No product to track');
        return;
      }

      // Get current price from latest comparison
      if (!latestComparisonData || !latestComparisonData.prices || latestComparisonData.prices.length === 0) {
        showStatus('Please compare prices first');
        return;
      }

      const currentPrice = latestComparisonData.prices[0];
      if (!currentPrice || !currentPrice.price || currentPrice.status === 'not-found') {
        showStatus('No valid price to track');
        return;
      }

      // Extract numeric price
      const numericPrice = parseFloat(currentPrice.price.replace(/[^0-9.]/g, ''));
      
      // Import and use aiEngine functions
      const { storePriceHistory, getPriceHistory, getAISuggestion } = await import('./scripts/aiEngine.js');
      
      // Store price in history
      await storePriceHistory(url, numericPrice, latestComparisonData.productName);
      
      // Get history and show AI suggestion
      const history = await getPriceHistory(url);
      const suggestion = getAISuggestion(history);
      
      // Show suggestion
      showStatus(`✅ Tracked! ${suggestion.message}`);
      trackBtn.textContent = '✓ Tracking';
      
      setTimeout(() => {
        trackBtn.textContent = '📊 Track Price';
      }, 3000);
      
    } catch (err) {
      console.error('Track error:', err);
      showStatus('Failed to track product');
    }
  });

  // Search for product on other sites using background fetch (no visible tabs)
  async function searchOtherSites(productName, currentSite) {
    const sites = [
      { name: 'Amazon', searchUrl: 'https://www.amazon.in/s?k=', domain: 'amazon.in' },
      { name: 'Flipkart', searchUrl: 'https://www.flipkart.com/search?q=', domain: 'flipkart.com' },
      { name: 'Myntra', searchUrl: 'https://www.myntra.com/search?q=', domain: 'myntra.com' }
    ];

    const results = [];
    
    // Extract key search terms from product name (properly decode URL encoding)
    const keywords = extractKeywords(productName);
    const searchQuery = encodeURIComponent(keywords);

    // Use background script to fetch prices without opening tabs
    for (const site of sites) {
      if (site.name === currentSite) continue; // Skip current site

      try {
        const searchUrl = site.searchUrl + searchQuery;
        
        // Send message to background script to fetch the page
        const response = await chrome.runtime.sendMessage({
          action: 'fetchPrice',
          url: searchUrl,
          siteName: site.name
        });

        if (response && response.success && response.searchResults) {
          // Find best matching product using similarity score
          let bestMatch = null;
          let bestScore = 0;
          const SIMILARITY_THRESHOLD = 0.4; // 40% minimum similarity
          
          for (const result of response.searchResults) {
            const similarity = calculateProductSimilarity(productName, result.productName);
            if (similarity > bestScore) {
              bestScore = similarity;
              bestMatch = result;
            }
          }
          
          // Only include if similarity is above threshold
          if (bestMatch && bestScore >= SIMILARITY_THRESHOLD) {
            results.push({
              site: site.name,
              price: bestMatch.price,
              url: bestMatch.productUrl || searchUrl,
              status: 'available',
              productName: bestMatch.productName,
              matchScore: bestScore
            });
          } else {
            results.push({
              site: site.name,
              price: 'N/A',
              url: searchUrl,
              status: 'not-found',
              message: 'Exact match not found'
            });
          }
        } else {
          results.push({
            site: site.name,
            price: 'N/A',
            url: searchUrl,
            status: 'not-found',
            message: 'Not Found'
          });
        }
      } catch (err) {
        console.error(`Error searching ${site.name}:`, err);
        results.push({
          site: site.name,
          price: 'N/A',
          url: site.searchUrl + searchQuery,
          status: 'not-found',
          message: 'Not Found'
        });
      }
    }

    return results;
  }

  // Extract important keywords from product name for search (properly decode)
  function extractKeywords(productName) {
    // Decode URL encoding if present (%20 -> space, etc.)
    let decoded = decodeURIComponent(productName);
    
    // Remove common stop words and keep important terms
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'for', 'on', 'at', 'to', 'from', 'of', 'by', 'pack'];
    
    // Clean and split the product name
    let cleaned = decoded
      .toLowerCase()
      .replace(/[\(\)\[\]\{\}]/g, ' ') // Remove brackets
      .replace(/[^a-z0-9\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
    
    // Split into words
    const words = cleaned.split(' ');
    
    // Filter out stop words and very short words
    const keywords = words.filter(word => 
      word.length > 2 && !stopWords.includes(word)
    );
    
    // Take first 5-6 important keywords to avoid too long search query
    return keywords.slice(0, 6).join(' ');
  }

  // Extract product attributes for matching (brand, model, key features)
  function extractProductAttributes(productName) {
    // Normalize product name
    let normalized = productName.toLowerCase().trim();
    
    // Extract potential brand (usually first 1-2 words)
    const words = normalized.split(/\s+/);
    const brand = words.slice(0, 2).join(' ');
    
    // Extract numbers (size, capacity, model numbers)
    const numbers = productName.match(/\d+(\.\d+)?/g) || [];
    
    // Extract units (ml, kg, l, gb, etc.)
    const units = productName.match(/\d+\s*(ml|l|kg|g|gb|mb|oz|inch|cm|mm)/gi) || [];
    
    // Key features extraction (words in all caps or between brackets/parentheses)
    const capsWords = productName.match(/\b[A-Z]{2,}\b/g) || [];
    const bracketed = productName.match(/[\(\[](.*?)[\)\]]/g) || [];
    
    return {
      brand,
      numbers,
      units,
      capsWords,
      bracketed,
      normalized,
      keywords: extractKeywords(productName).split(' ')
    };
  }

  // Calculate similarity between two products (0-1 score)
  function calculateProductSimilarity(currentProduct, searchResult) {
    let score = 0;
    let totalWeight = 0;
    
    const current = extractProductAttributes(currentProduct);
    const result = extractProductAttributes(searchResult);
    
    // Brand matching (high weight - 30%)
    const brandWeight = 0.3;
    totalWeight += brandWeight;
    if (result.normalized.includes(current.brand) || current.normalized.includes(result.brand)) {
      score += brandWeight;
    }
    
    // Numbers matching (model, size, capacity - 25%)
    const numberWeight = 0.25;
    totalWeight += numberWeight;
    let numberMatches = 0;
    current.numbers.forEach(num => {
      if (result.numbers.includes(num)) numberMatches++;
    });
    if (current.numbers.length > 0) {
      score += (numberMatches / current.numbers.length) * numberWeight;
    }
    
    // Units matching (ml, kg, etc. - 20%)
    const unitWeight = 0.2;
    totalWeight += unitWeight;
    let unitMatches = 0;
    current.units.forEach(unit => {
      const unitLower = unit.toLowerCase();
      if (result.units.some(u => u.toLowerCase() === unitLower)) unitMatches++;
    });
    if (current.units.length > 0) {
      score += (unitMatches / current.units.length) * unitWeight;
    }
    
    // Keyword overlap (25%)
    const keywordWeight = 0.25;
    totalWeight += keywordWeight;
    let keywordMatches = 0;
    current.keywords.forEach(kw => {
      if (result.keywords.includes(kw)) keywordMatches++;
    });
    if (current.keywords.length > 0) {
      score += (keywordMatches / current.keywords.length) * keywordWeight;
    }
    
    return score;
  }

  // Function to inject into page and extract price
  function extractPriceFromPage() {
    const url = window.location.href;
    let site = 'Unknown';
    let price = null;
    let productName = null;
    let productId = null;
    let mrp = null;
    let status = 'available';

    // Extract product ID helper (defined inline for injection context)
    function extractProductIdFromUrl(url, site) {
      if (site === 'Amazon') {
        const patterns = [
          /\/dp\/([A-Z0-9]{10})/,
          /\/gp\/product\/([A-Z0-9]{10})/,
          /[?&]asin=([A-Z0-9]{10})/i
        ];
        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match) return match[1];
        }
      } else if (site === 'Flipkart') {
        const pidMatch = url.match(/[?&]pid=([A-Z0-9]+)/i);
        if (pidMatch) return pidMatch[1];
        const pathMatch = url.match(/\/p\/(itm[a-z0-9]+)/i);
        if (pathMatch) return pathMatch[1];
      } else if (site === 'Myntra') {
        const styleMatch = url.match(/\/(\d{6,10})(?:\/|$|\?)/);
        if (styleMatch) return styleMatch[1];
      } else if (site === 'Meesho') {
        const productMatch = url.match(/\/(?:product|p)\/[^\/]+\/(\d+)|\/p\/(\d+)/);
        if (productMatch) return productMatch[1] || productMatch[2];
      }
      return null;
    }

    // Detect site
    if (url.includes('amazon.')) {
      site = 'Amazon';
      productId = extractProductIdFromUrl(url, 'Amazon');
      
      // Check if out of stock
      const availabilityElem = document.querySelector('#availability span, #availability');
      if (availabilityElem && availabilityElem.textContent.toLowerCase().includes('out of stock')) {
        status = 'out-of-stock';
      }
      
      // Try multiple selectors for Amazon price (updated for 2025)
      const priceSelectors = [
        // Main price display (most common)
        '.a-price.aok-align-center.reinventPricePriceToPayMargin.priceToPay span.a-price-whole',
        '.a-price.reinventPricePriceToPayMargin.priceToPay .a-offscreen',
        'span.a-price.aok-align-center span.a-offscreen',
        '.a-price-whole',
        
        // Alternative locations
        '.apexPriceToPay span.a-offscreen',
        '#corePrice_feature_div .a-price .a-offscreen',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen',
        
        // Deal/offer prices
        '#priceblock_saleprice',
        '.priceToPay .a-offscreen'
      ];
      
      for (const selector of priceSelectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.textContent.trim()) {
          let text = elem.textContent.trim();
          // Extract numbers from text like "₹18,930" or "18,930.00"
          const cleaned = text.replace(/[^0-9,\.]/g, '').replace(/,/g, '');
          if (cleaned && parseFloat(cleaned) > 0) {
            const numericPrice = cleaned.split('.')[0];
            if (numericPrice.length >= 2) { // Ensure it's a valid price
              price = '₹' + parseInt(numericPrice).toLocaleString('en-IN');
              break;
            }
          }
        }
      }

      // Get MRP (fallback or comparison)
      const mrpSelectors = [
        '.a-price.a-text-price .a-offscreen',
        '.basisPrice .a-offscreen',
        'span.a-price.a-text-price span.a-offscreen'
      ];
      
      for (const selector of mrpSelectors) {
        const mrpElem = document.querySelector(selector);
        if (mrpElem && mrpElem.textContent.trim()) {
          const mrpText = mrpElem.textContent.replace(/[^0-9,\.]/g, '').replace(/,/g, '');
          if (mrpText && parseFloat(mrpText) > 0) {
            mrp = '₹' + parseInt(mrpText.split('.')[0]).toLocaleString('en-IN');
            break;
          }
        }
      }

      // Get product name
      const nameSelectors = ['#productTitle', 'h1.product-title', '#title'];
      for (const selector of nameSelectors) {
        const nameElem = document.querySelector(selector);
        if (nameElem && nameElem.textContent.trim()) {
          productName = nameElem.textContent.trim();
          break;
        }
      }

    } else if (url.includes('flipkart.com')) {
      site = 'Flipkart';
      productId = extractProductIdFromUrl(url, 'Flipkart');
      
      // Check if out of stock
      const stockSelectors = ['._16FRp0', '.availability', '._2aK_ub', 'div._2J33Rc'];
      for (const selector of stockSelectors) {
        const stockElem = document.querySelector(selector);
        if (stockElem) {
          const stockText = stockElem.textContent.toLowerCase();
          if (stockText.includes('out of stock') || stockText.includes('sold out') || stockText.includes('currently unavailable')) {
            status = 'out-of-stock';
            break;
          }
        }
      }
      
      // Try multiple selectors for Flipkart price (updated for Dec 2024)
      const priceSelectors = [
        // December 2024 structure (most common)
        'div.Nx9bqj.CxhGGd',
        'div.hl05eU div.Nx9bqj',
        
        // Common class patterns
        'div.Nx9bqj',
        'div.CxhGGd',
        
        // Alternative current structures  
        'div._30jeq3._16Jk6d',
        'div._30jeq3',
        '._25b18c ._16Jk6d',
        '._25b18c div',
        '.CEmiEU div._16Jk6d',
        'div._16Jk6d',
        
        // Price container patterns
        '[data-test-id="selling-price"]',
        '.pPAw9M',
        '._2Tpdn3',
        
        // Generic price patterns (broader search)
        'div[class*="Nx9bqj"]',
        'div[class*="CxhGGd"]',
        'div[class*="30jeq3"]',
        'div[class*="16Jk6d"]',
        
        // Older patterns (fallback)
        'div._3I9_wc._2p6lqe',
        'div._1vC4OE._3qQ9m1'
      ];
      
      console.log('[Flipkart Debug] Starting price extraction...');
      
      for (const selector of priceSelectors) {
        const priceElem = document.querySelector(selector);
        if (priceElem) {
          console.log('[Flipkart Debug] Found element with selector:', selector, 'Text:', priceElem.textContent.trim());
          const text = priceElem.textContent.replace(/[^0-9,]/g, '').replace(/,/g, '');
          if (text && parseFloat(text) > 0) {
            price = '₹' + parseInt(text).toLocaleString('en-IN');
            console.log('[Flipkart Debug] Extracted price:', price);
            break;
          }
        }
      }
      
      if (!price) {
        console.log('[Flipkart Debug] No price found with any selector. Trying fallback...');
        // Fallback: search all text nodes for price pattern
        const bodyText = document.body.innerText;
        const priceMatch = bodyText.match(/₹\s*[\d,]+/);
        if (priceMatch) {
          const text = priceMatch[0].replace(/[^0-9,]/g, '').replace(/,/g, '');
          price = '₹' + parseInt(text).toLocaleString('en-IN');
          console.log('[Flipkart Debug] Fallback found price:', price);
        }
      }

      // Get product name
      const nameSelectors = [
        // December 2024 structure
        'span.VU-ZEz',
        'h1 span.VU-ZEz',
        
        // Alternative structures
        'h1.yhB1nd',
        'span.B_NuCI',
        'h1._6EBuvT',
        'span._35KyD6',
        'h1 span',
        
        // Data attributes
        '[data-test-id="product-title"]',
        
        // Generic fallback
        'h1[class*="VU-ZEz"]',
        'h1[class*="yhB1nd"]',
        'span[class*="B_NuCI"]',
        
        // Broadest fallback - first h1 on page
        'h1'
      ];
      
      for (const selector of nameSelectors) {
        const nameElem = document.querySelector(selector);
        if (nameElem && nameElem.textContent.trim()) {
          productName = nameElem.textContent.trim();
          console.log('[Flipkart Debug] Found product name:', productName);
          break;
        }
      }
      
      if (!productName) {
        console.log('[Flipkart Debug] No product name found, using URL fallback');
        // Extract from URL as last resort
        const urlParts = url.split('/');
        const slugPart = urlParts.find(part => part.includes('-') && part.length > 10);
        if (slugPart) {
          productName = slugPart.replace(/-/g, ' ').split('/')[0];
        }
      }

    } else if (url.includes('myntra.com')) {
      site = 'Myntra';
      productId = extractProductIdFromUrl(url, 'Myntra');
      
      // Check if out of stock
      const stockElem = document.querySelector('.sold-out-title, .inventory-availabilityStatus');
      if (stockElem && stockElem.textContent.toLowerCase().includes('out of stock')) {
        status = 'out-of-stock';
      }
      
      const priceElem = document.querySelector('.pdp-price strong, .pdp-price');
      if (priceElem) {
        const text = priceElem.textContent.replace(/[^0-9,]/g, '').replace(/,/g, '');
        if (text) price = '₹' + text;
      }

      const nameElem = document.querySelector('.pdp-title, h1.pdp-name');
      if (nameElem) productName = nameElem.textContent.trim();
    }

    return {
      site: site,
      price: price,
      mrp: mrp,
      productName: productName,
      productId: productId,
      url: window.location.href,
      status: status
    };
  }

  // Display real extracted prices with clickable links
  function displayRealPrices(priceData, currentSite) {
    priceTable.innerHTML = '';

    priceData.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'price-row';
      
      // Highlight best available price (not "Not Found")
      const isBestPrice = index === 0 && item.status !== 'not-found' && item.status !== 'out-of-stock';
      if (isBestPrice) row.classList.add('best-price');
      
      const siteDiv = document.createElement('div');
      siteDiv.className = 'site-name';
      
      // Make site name clickable if URL exists
      if (item.url) {
        const link = document.createElement('a');
        link.href = item.url;
        link.target = '_blank';
        link.style.color = 'inherit';
        link.style.textDecoration = 'none';
        link.style.display = 'flex';
        link.style.alignItems = 'center';
        link.style.gap = '6px';
        link.textContent = item.site;
        
        // Add badges
        if (item.site === currentSite) {
          const badge = document.createElement('span');
          badge.className = 'badge';
          badge.style.background = '#3b82f6';
          badge.textContent = 'CURRENT';
          link.appendChild(badge);
        } else if (isBestPrice) {
          const badge = document.createElement('span');
          badge.className = 'badge';
          badge.textContent = 'BEST';
          link.appendChild(badge);
        }
        
        siteDiv.appendChild(link);
      } else {
        siteDiv.textContent = item.site;
      }
      
      const priceDiv = document.createElement('div');
      priceDiv.className = 'price-value';
      
      // Show different messages based on status
      if (item.status === 'not-found') {
        priceDiv.textContent = item.price || 'Not Available';
        priceDiv.style.color = '#dc2626'; // Red color for not available
        priceDiv.style.fontSize = '13px';
        priceDiv.style.fontWeight = '600';
        
        // Add small info icon with reason
        if (item.reason) {
          const infoIcon = document.createElement('span');
          infoIcon.textContent = ' ℹ️';
          infoIcon.title = item.reason;
          infoIcon.style.fontSize = '11px';
          infoIcon.style.cursor = 'help';
          priceDiv.appendChild(infoIcon);
        }
      } else if (item.status === 'out-of-stock') {
        priceDiv.textContent = 'Out of Stock';
        priceDiv.style.color = '#f59e0b'; // Orange color for out of stock
        priceDiv.style.fontSize = '12px';
        priceDiv.style.fontWeight = '600';
      } else {
        priceDiv.textContent = item.price || 'N/A';
        // Make best price more visible with darker, bolder font
        if (isBestPrice) {
          priceDiv.style.color = '#065f46'; // Darker green for better contrast
          priceDiv.style.fontWeight = '800';
          priceDiv.style.fontSize = '17px';
        }
        
        // Show match quality badge for scraped results
        if (item.matchQuality && item.matchQuality !== 'none') {
          const qualityBadge = document.createElement('span');
          qualityBadge.style.fontSize = '10px';
          qualityBadge.style.marginLeft = '6px';
          qualityBadge.style.opacity = '0.7';
          qualityBadge.textContent = item.matchQuality === 'excellent' ? '✓✓' : item.matchQuality === 'good' ? '✓' : '~';
          qualityBadge.title = `Match quality: ${item.matchQuality}`;
          priceDiv.appendChild(qualityBadge);
        }
      }
      
      row.appendChild(siteDiv);
      row.appendChild(priceDiv);
      priceTable.appendChild(row);
    });
  }

  // Summarize page - extract product details
  summarizeBtn.addEventListener('click', async () => {
    showStatus('Analyzing product...');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        showStatus('Cannot access current page.');
        return;
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractProductDetails
      });

      const details = results[0]?.result;
      if (!details) {
        showStatus('No product details found.');
        return;
      }

      // Show summary in a nice format
      const summary = `📦 ${details.name || 'Product'}\n💰 Price: ${details.price || 'N/A'}\n⭐ Rating: ${details.rating || 'N/A'}\n✅ ${details.reviews || '0'} reviews`;
      alert(summary);
      showStatus('Product summarized!');

    } catch (err) {
      console.error('Summarize error:', err);
      showStatus('Failed to summarize.');
    }
  });

  // Extract product details from page
  function extractProductDetails() {
    let name = null, price = null, rating = null, reviews = null;

    if (window.location.href.includes('amazon.')) {
      name = document.querySelector('#productTitle')?.textContent.trim();
      price = document.querySelector('.a-price-whole')?.textContent.trim();
      rating = document.querySelector('.a-icon-star')?.textContent.split(' ')[0];
      reviews = document.querySelector('#acrCustomerReviewText')?.textContent.replace(' ratings', '');
    } else if (window.location.href.includes('flipkart.com')) {
      name = document.querySelector('.VU-ZEz, h1.yhB1nd')?.textContent.trim();
      price = document.querySelector('._30jeq3')?.textContent.trim();
      rating = document.querySelector('._3LWZlK')?.textContent;
      reviews = document.querySelector('._2_R_DZ span')?.textContent;
    }

    return { name, price: price ? '₹' + price : null, rating, reviews };
  }

  // Generate AI Insights using Google Gemini (Free API)
  generateBtn.addEventListener('click', async () => {
    const query = document.getElementById('ai-input').value.trim();
    if (!query) {
      showStatus('Type something for the AI assistant.');
      return;
    }
    
    showStatus('🤖 AI is thinking...');
    
    try {
      // Prepare context from comparison data
      let context = '';
      if (latestComparisonData) {
        context = `Product: ${latestComparisonData.productName}\n`;
        context += `Current Site: ${latestComparisonData.currentSite}\n`;
        context += `Available Prices:\n`;
        latestComparisonData.prices.forEach(p => {
          if (p.status !== 'not-found') {
            context += `- ${p.site}: ${p.price}\n`;
          }
        });
      }

      // Call Google Gemini API (free tier)
      // API key is loaded from gemini-config.js (which is gitignored)
      // If GEMINI_CONFIG is not defined, the script tag wasn't loaded
      const GEMINI_API_KEY = (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.API_KEY) 
        ? GEMINI_CONFIG.API_KEY 
        : 'YOUR_GEMINI_API_KEY_HERE';
      const API_URL = (typeof GEMINI_CONFIG !== 'undefined' && GEMINI_CONFIG.API_URL)
        ? GEMINI_CONFIG.API_URL
        : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a smart shopping assistant. Current product context:\n${context}\n\nUser question: ${query}\n\nProvide helpful shopping advice in 2-3 sentences. Be specific about prices and recommendations.`
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error('AI service unavailable');
      }

      const data = await response.json();
      const aiResponse = data.candidates[0]?.content?.parts[0]?.text || 'No response from AI';
      
      // Display in alert or update textarea
      document.getElementById('ai-input').value = aiResponse;
      showStatus('✅ AI insights ready!');
      
    } catch (err) {
      console.error('AI error:', err);
      // Fallback to local AI logic if API fails
      const fallbackResponse = generateLocalAIResponse(query, latestComparisonData);
      document.getElementById('ai-input').value = fallbackResponse;
      showStatus('✅ AI response (offline mode)');
    }
  });

  // Local AI fallback when Gemini API is unavailable
  function generateLocalAIResponse(query, comparisonData) {
    const lowerQuery = query.toLowerCase();
    
    // Build context from comparison data
    let contextText = '';
    let bestPrice = null;
    let bestSite = null;
    
    if (comparisonData && comparisonData.prices) {
      const availablePrices = comparisonData.prices.filter(p => p.status !== 'not-found');
      if (availablePrices.length > 0) {
        bestPrice = availablePrices[0].price;
        bestSite = availablePrices[0].site;
        contextText = `Product: ${comparisonData.productName}\nBest price: ${bestPrice} on ${bestSite}`;
      }
    }
    
    if (lowerQuery.includes('buy') || lowerQuery.includes('should i')) {
      return `💡 Based on current prices:\n\n${contextText}\n\n✅ Recommendation: ${bestSite} offers the best deal at ${bestPrice}. Check seller ratings and delivery time before purchasing. Consider waiting for festive sales for additional discounts.`;
    } else if (lowerQuery.includes('cheap') || lowerQuery.includes('save')) {
      return `💰 Money Saving Tips:\n\n${contextText}\n\n📊 You can save by choosing ${bestSite}. Also:\n• Use bank card offers\n• Check for cashback\n• Compare warranty options\n• Read recent reviews`;
    } else if (lowerQuery.includes('difference') || lowerQuery.includes('compare')) {
      const diff = comparisonData?.prices.filter(p => p.status !== 'not-found').map(p => `${p.site}: ${p.price}`).join('\n');
      return `📊 Price Comparison:\n\n${diff}\n\nLowest: ${bestPrice} on ${bestSite}`;
    } else {
      return `🤖 AI Shopping Assistant\n\n${contextText}\n\n💬 Ask me:\n• "Should I buy this?"\n• "Where can I save money?"\n• "Compare the differences"\n\nI'll analyze prices and give you smart recommendations!`;
    }
  }

  // keyboard shortcuts: Enter in input triggers compare
  productUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      compareBtn.click();
    }
  });

  // utility
  function showStatus(msg) {
    status.textContent = msg;
    setTimeout(() => {
      if (status.textContent === msg) status.textContent = '';
    }, 2500);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
});


