
const WATCHLIST_KEY = 'smartshopper_watchlist';
const PRICE_HISTORY_KEY = 'smartshopper_price_history';

// Generic storage functions
export function setItem(key, value) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [key]: value }, () => resolve(true));
    } catch (err) {
      console.error('storage.setItem', err);
      resolve(false);
    }
  });
}

export function getItem(key) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get([key], (result) => resolve(result[key]));
    } catch (err) {
      console.error('storage.getItem', err);
      resolve(null);
    }
  });
}

// Watchlist management functions

/**
 * Add a product to the watchlist
 * @param {Object} product - Product object with name, url, price, etc.
 * @returns {Promise<boolean>} - Success status
 */
export async function addToWatchlist(product) {
  try {
    const watchlist = await getWatchlist();
    
    // Check if product already exists (by URL)
    const existingIndex = watchlist.findIndex(p => p.url === product.url);
    
    const productData = {
      id: product.id || `product_${Date.now()}`,
      name: product.name || product.title || 'Unknown Product',
      url: product.url,
      initialPrice: product.price || 0,
      currentPrice: product.price || 0,
      lowestPrice: product.price || 0,
      targetPrice: product.targetPrice || null,
      addedAt: product.addedAt || new Date().toISOString(),
      lastChecked: new Date().toISOString(),
      priceHistory: product.priceHistory || [],
      site: product.site || 'Unknown',
      imageUrl: product.imageUrl || null,
      active: true
    };

    if (existingIndex !== -1) {
      // Update existing product
      watchlist[existingIndex] = { ...watchlist[existingIndex], ...productData };
    } else {
      // Add new product
      watchlist.push(productData);
    }

    await setItem(WATCHLIST_KEY, watchlist);
    console.log('✅ Product added to watchlist:', productData.name);
    return true;
  } catch (err) {
    console.error('addToWatchlist error:', err);
    return false;
  }
}

/**
 * Get all products in the watchlist
 * @returns {Promise<Array>} - Array of tracked products
 */
export async function getWatchlist() {
  try {
    const watchlist = await getItem(WATCHLIST_KEY);
    return watchlist || [];
  } catch (err) {
    console.error('getWatchlist error:', err);
    return [];
  }
}

/**
 * Remove a product from the watchlist
 * @param {string} identifier - Product name, ID, or URL
 * @returns {Promise<boolean>} - Success status
 */
export async function removeFromWatchlist(identifier) {
  try {
    const watchlist = await getWatchlist();
    
    // Find product by name, ID, or URL
    const filteredList = watchlist.filter(product => 
      product.name !== identifier && 
      product.id !== identifier && 
      product.url !== identifier
    );

    if (filteredList.length === watchlist.length) {
      console.warn('Product not found in watchlist:', identifier);
      return false;
    }

    await setItem(WATCHLIST_KEY, filteredList);
    console.log('✅ Product removed from watchlist:', identifier);
    return true;
  } catch (err) {
    console.error('removeFromWatchlist error:', err);
    return false;
  }
}

/**
 * Update product price in watchlist
 * @param {string} productId - Product ID or URL
 * @param {number} newPrice - New price
 * @returns {Promise<Object|null>} - Updated product or null
 */
export async function updateProductPrice(productId, newPrice) {
  try {
    const watchlist = await getWatchlist();
    const productIndex = watchlist.findIndex(p => p.id === productId || p.url === productId);

    if (productIndex === -1) {
      return null;
    }

    const product = watchlist[productIndex];
    const oldPrice = product.currentPrice;

    // Update price and history
    product.currentPrice = newPrice;
    product.lastChecked = new Date().toISOString();
    
    // Update lowest price if applicable
    if (newPrice < product.lowestPrice) {
      product.lowestPrice = newPrice;
    }

    // Add to price history
    if (!product.priceHistory) {
      product.priceHistory = [];
    }
    product.priceHistory.push({
      date: new Date().toISOString(),
      price: newPrice
    });

    // Keep only last 30 days of history
    if (product.priceHistory.length > 30) {
      product.priceHistory = product.priceHistory.slice(-30);
    }

    watchlist[productIndex] = product;
    await setItem(WATCHLIST_KEY, watchlist);

    console.log(`💰 Price updated for ${product.name}: ₹${oldPrice} → ₹${newPrice}`);

    return {
      product,
      priceChanged: oldPrice !== newPrice,
      priceDropped: newPrice < oldPrice,
      priceDifference: oldPrice - newPrice
    };
  } catch (err) {
    console.error('updateProductPrice error:', err);
    return null;
  }
}

/**
 * Clear entire watchlist
 * @returns {Promise<boolean>}
 */
export async function clearWatchlist() {
  try {
    await setItem(WATCHLIST_KEY, []);
    console.log('🗑️ Watchlist cleared');
    return true;
  } catch (err) {
    console.error('clearWatchlist error:', err);
    return false;
  }
}

/**
 * Get watchlist statistics
 * @returns {Promise<Object>}
 */
export async function getWatchlistStats() {
  try {
    const watchlist = await getWatchlist();
    
    return {
      totalProducts: watchlist.length,
      activeProducts: watchlist.filter(p => p.active).length,
      totalSavings: watchlist.reduce((sum, p) => 
        sum + (p.initialPrice - p.currentPrice), 0
      ),
      productsWithDrops: watchlist.filter(p => 
        p.currentPrice < p.initialPrice
      ).length
    };
  } catch (err) {
    console.error('getWatchlistStats error:', err);
    return { totalProducts: 0, activeProducts: 0, totalSavings: 0, productsWithDrops: 0 };
  }
}
