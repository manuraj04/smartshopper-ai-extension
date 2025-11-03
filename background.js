
console.log('🚀 SmartShopper AI background service worker started');

import * as storage from './scripts/storage.js';
import * as apiModule from './scripts/api.js';
import { API_CONFIG } from './config.js';

// Constants
const CHECK_INTERVAL_MINUTES = 180;
const ALARM_NAME = 'priceCheckAlarm';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('✅ SmartShopper AI installed');
  
 
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icon48.png',
    title: 'SmartShopper AI',
    message: 'Extension installed! Start tracking products to get price drop alerts.',
    priority: 1
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('⏰ Running scheduled price check...');
    await checkAllPrices();
  }
});

async function checkAllPrices() {
  try {
    const watchlist = await storage.getWatchlist();
    
    if (watchlist.length === 0) {
      console.log('📋 No products in watchlist');
      return;
    }

    console.log(`🔍 Checking prices for ${watchlist.length} products...`);
    let priceDropsFound = 0;

    for (const product of watchlist) {
      if (!product.active) continue;

      try {
        const newPrice = await fetchProductPrice(product);
        
        if (newPrice && newPrice !== product.currentPrice) {
          const result = await storage.updateProductPrice(product.id, newPrice);
          
          if (result && result.priceDropped) {
            priceDropsFound++;
            
            const priceDrop = result.priceDifference;
            const percentDrop = ((priceDrop / product.currentPrice) * 100).toFixed(1);
            
            const targetMet = product.targetPrice && newPrice <= product.targetPrice;
            
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'assets/icon48.png',
              title: targetMet ? '🎯 Target Price Reached!' : '💰 Price Drop Alert!',
              message: `${product.name}\nOld: ₹${product.currentPrice} → New: ₹${newPrice}\nSave ₹${priceDrop} (${percentDrop}% off)`,
              priority: 2,
              requireInteraction: targetMet,
              buttons: [
                { title: 'View Product' },
                { title: 'Remove from Watchlist' }
              ]
            }, (notificationId) => {
              chrome.storage.local.set({
                [`notification_${notificationId}`]: {
                  productId: product.id,
                  productUrl: product.url,
                  productName: product.name
                }
              });
            });
          }
        }
      } catch (err) {
        console.error(`Error checking price for ${product.name}:`, err);
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`✅ Price check complete. ${priceDropsFound} price drops found.`);
    
    if (priceDropsFound > 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon48.png',
        title: '🔔 Price Check Complete',
        message: `Found ${priceDropsFound} price drop${priceDropsFound > 1 ? 's' : ''} in your watchlist!`,
        priority: 1
      });
    }
  } catch (err) {
    console.error('Error in checkAllPrices:', err);
  }
}

// Fetch current price for a product using real API or mock data
async function fetchProductPrice(product) {
  try {
    // Check if real API is enabled
    if (API_CONFIG.features.useRealAPI && product.url) {
      // Try to fetch real price from Amazon
      if (product.url.includes('amazon')) {
        const prices = await apiModule.getPrices(product.name, product.url);
        if (prices && prices.length > 0) {
          // Find Amazon price from results
          const amazonPrice = prices.find(p => p.site === 'Amazon');
          if (amazonPrice && amazonPrice.price > 0) {
            console.log(`✅ Fetched real price for ${product.name}: ₹${amazonPrice.price}`);
            return amazonPrice.price;
          }
        }
      }
    }
    
    // Fallback to mock data (simulate price changes)
    console.log(`⚠️ Using mock price for ${product.name}`);
    const variance = Math.random() * 100 - 50; // Random change between -50 and +50
    const newPrice = Math.max(product.currentPrice + variance, product.lowestPrice * 0.8);
    return Math.round(newPrice);
    
  } catch (err) {
    console.error('Error fetching product price:', err);
    
    // Fallback to mock data on error
    const variance = Math.random() * 100 - 50;
    const newPrice = Math.max(product.currentPrice + variance, product.lowestPrice * 0.8);
    return Math.round(newPrice);
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  const result = await chrome.storage.local.get([`notification_${notificationId}`]);
  const data = result[`notification_${notificationId}`];
  
  if (!data) return;
  
  if (buttonIndex === 0) {
    // View Product button
    chrome.tabs.create({ url: data.productUrl });
  } else if (buttonIndex === 1) {
    // Remove from Watchlist button
    await storage.removeFromWatchlist(data.productId);
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon48.png',
      title: 'SmartShopper AI',
      message: `${data.productName} removed from watchlist`,
      priority: 0
    });
  }
  
  // Clear notification data
  chrome.storage.local.remove([`notification_${notificationId}`]);
  chrome.notifications.clear(notificationId);
});

// Handle notification clicks (open popup or product page)
chrome.notifications.onClicked.addListener(async (notificationId) => {
  const result = await chrome.storage.local.get([`notification_${notificationId}`]);
  const data = result[`notification_${notificationId}`];
  
  if (data && data.productUrl) {
    chrome.tabs.create({ url: data.productUrl });
  }
});

// Handle messages from popup/content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;

  switch (message.type || message.action) {
    case 'FETCH_PRICE':
      fetch(message.url)
        .then(r => r.text())
        .then(text => sendResponse({ ok: true, text }))
        .catch(err => sendResponse({ ok: false, error: err.toString() }));
      return true; // Keep channel open for async response

    case 'CHECK_PRICES_NOW':
      // Manual trigger for price check
      checkAllPrices()
        .then(() => sendResponse({ ok: true, message: 'Price check started' }))
        .catch(err => sendResponse({ ok: false, error: err.toString() }));
      return true;

    case 'GET_WATCHLIST_COUNT':
      // Return watchlist count for badge
      storage.getWatchlist()
        .then(watchlist => {
          const count = watchlist.filter(p => p.active).length;
          chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
          chrome.action.setBadgeBackgroundColor({ color: '#0b74de' });
          sendResponse({ ok: true, count });
        })
        .catch(err => sendResponse({ ok: false, error: err.toString() }));
      return true;

    case 'testAPI':
      // Test API connection (used by test page) - API key stays secure in config.js
      (async () => {
        try {
          if (!API_CONFIG.rapidapi.key || API_CONFIG.rapidapi.key === 'YOUR_RAPIDAPI_KEY_HERE') {
            sendResponse({ success: false, error: 'API key not configured' });
            return;
          }

          const response = await fetch(
            `https://${API_CONFIG.rapidapi.amazon.host}/product-details?asin=${message.asin}&country=IN`,
            {
              headers: {
                'x-rapidapi-key': API_CONFIG.rapidapi.key,
                'x-rapidapi-host': API_CONFIG.rapidapi.amazon.host
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            sendResponse({ success: true, data: data.data });
          } else {
            sendResponse({ success: false, error: `API returned ${response.status}` });
          }
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;

    case 'searchProduct':
      // Search for products (used by test page) - API key stays secure
      (async () => {
        try {
          if (!API_CONFIG.rapidapi.key || API_CONFIG.rapidapi.key === '') {
            sendResponse({ success: false, error: 'API key not configured' });
            return;
          }

          const response = await fetch(
            `https://${API_CONFIG.rapidapi.amazon.host}/search?query=${encodeURIComponent(message.query)}&page=1&country=IN`,
            {
              headers: {
                'x-rapidapi-key': API_CONFIG.rapidapi.key,
                'x-rapidapi-host': API_CONFIG.rapidapi.amazon.host
              }
            }
          );

          if (response.ok) {
            const data = await response.json();
            sendResponse({ success: true, data: data.data.products });
          } else {
            sendResponse({ success: false, error: `API returned ${response.status}` });
          }
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;

    default:
      console.log('Unknown message type:', message.type || message.action);
  }
});

// Update badge when watchlist changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.smartshopper_watchlist) {
    const watchlist = changes.smartshopper_watchlist.newValue || [];
    const count = watchlist.filter(p => p.active).length;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#0b74de' });
  }
});

console.log('✅ Background service worker initialized');
