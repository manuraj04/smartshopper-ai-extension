/**
 * content_script.js - SmartShopper Content Script
 * 
 * Runs on product pages to extract product info and communicate with backend.
 * Uses robust extractors (not brittle CSS selectors) and minimal network calls.
 * 
 * FLOW:
 * 1. Wait for DOM ready
 * 2. Extract product using canonical extractors
 * 3. Send minimal payload to backend (site, id, title only)
 * 4. Post message to popup/background for UI updates
 * 
 * DEBUG: Set window.SMARTSHOPPER_DEBUG = true in console
 */

// Import extractor (works in Chrome extension context)
import { extractProductKey } from './extractors.js';

const DEBUG = () => typeof window !== 'undefined' && window.SMARTSHOPPER_DEBUG === true;

function debug(...args) {
  if (DEBUG()) {
    console.debug('[SmartShopper Content Script]', ...args);
  }
}

/**
 * Sleep helper for retry backoff
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry and exponential backoff
 * @param {string} url 
 * @param {number} maxRetries 
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, maxRetries = 1) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      debug(`Fetch attempt ${attempt + 1}/${maxRetries + 1}:`, url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      debug(`Fetch failed (attempt ${attempt + 1}):`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt) * 1000;
        debug(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Send product info to backend for price tracking
 * @param {Object} product - Extracted product data
 * @returns {Promise<Object>} Backend response
 */
async function sendToBackend(product) {
  const params = new URLSearchParams({
    site: product.site,
    id: product.id,
    title: product.title || 'Unknown Product'
  });
  
  // Backend URL from config or default to localhost
  const backendUrl = chrome?.runtime?.getManifest?.()?.host_permissions?.[0] || 'http://localhost:3000';
  const url = `${backendUrl}/v1/price?${params}`;
  
  debug('Sending to backend:', url);
  
  try {
    const response = await fetchWithRetry(url, 1);
    const data = await response.json();
    debug('Backend response:', data);
    return data;
  } catch (error) {
    console.error('[SmartShopper] Backend error:', error);
    throw error;
  }
}

/**
 * Post message to popup/background for UI updates
 * @param {Object} payload 
 */
function postToExtension(payload) {
  debug('Posting message to extension:', payload);
  
  window.postMessage({
    source: 'smartshopper',
    payload: payload
  }, '*');
  
  // Also send via chrome.runtime for background script
  if (chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage({
      action: 'productDetected',
      data: payload
    }).catch(err => {
      debug('Failed to send to background:', err);
    });
  }
}

/**
 * Main extraction and communication flow
 */
async function main() {
  try {
    debug('Content script loaded on:', window.location.href);
    
    // Extract product info
    const product = await extractProductKey();
    
    if (!product) {
      debug('Not a product page or extraction failed');
      return;
    }
    
    debug('✅ Product extracted:', product);
    
    // Send minimal payload to backend (no HTML, no API keys)
    let backendData = null;
    try {
      backendData = await sendToBackend(product);
    } catch (error) {
      debug('Backend call failed, continuing with local data');
    }
    
    // Post to extension popup/background
    postToExtension({
      type: 'product_detected',
      product: product,
      backend: backendData,
      timestamp: Date.now()
    });
    
    debug('✅ Content script completed successfully');
    
  } catch (error) {
    console.error('[SmartShopper] Content script error:', error);
    debug('Stack trace:', error.stack);
  }
}

// Wait for DOM ready then execute
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  // DOM already loaded
  main();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fetchWithRetry, sendToBackend };
}
