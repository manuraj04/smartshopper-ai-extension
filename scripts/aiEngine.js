// scripts/aiEngine.js - AI inference and suggestion engine

export async function summarizeProduct(details) {
  // In a real implementation this would call an LLM or your AI service
  return {
    summary: `Summary for ${details.title || 'product'}`,
    score: Math.round(Math.random() * 100) / 100
  };
}

/**
 * Store price in history for tracking
 * @param {string} productUrl - Unique identifier for the product
 * @param {number} price - Current price
 * @param {string} productName - Product name
 */
export async function storePriceHistory(productUrl, price, productName) {
  try {
    // Create unique key from URL
    const productId = btoa(productUrl).substring(0, 50);
    const storageKey = `price_history_${productId}`;
    
    // Get existing history
    const result = await chrome.storage.local.get(storageKey);
    let history = result[storageKey] || { prices: [], name: productName, url: productUrl };
    
    // Add current price with timestamp
    const today = new Date().toISOString().split('T')[0];
    
    // Don't add duplicate if already recorded today
    const lastEntry = history.prices[history.prices.length - 1];
    if (!lastEntry || lastEntry.date !== today) {
      history.prices.push({
        price: price,
        date: today,
        timestamp: Date.now()
      });
      
      // Keep only last 90 days
      if (history.prices.length > 90) {
        history.prices = history.prices.slice(-90);
      }
      
      // Save updated history
      await chrome.storage.local.set({ [storageKey]: history });
    }
    
    return history;
  } catch (err) {
    console.error('Error storing price history:', err);
    return null;
  }
}

/**
 * Get price history for a product
 * @param {string} productUrl - Unique identifier for the product
 * @returns {object|null} - Price history object or null
 */
export async function getPriceHistory(productUrl) {
  try {
    const productId = btoa(productUrl).substring(0, 50);
    const storageKey = `price_history_${productId}`;
    
    const result = await chrome.storage.local.get(storageKey);
    return result[storageKey] || null;
  } catch (err) {
    console.error('Error getting price history:', err);
    return null;
  }
}

/**
 * Generate AI-powered price suggestion based on price history
 * @param {object} priceHistory - Price history object from storage
 * @returns {object} - Suggestion object with icon, action, and message
 */
export function getAISuggestion(priceHistory) {
  if (!priceHistory || !priceHistory.prices || priceHistory.prices.length === 0) {
    return {
      icon: '🔔',
      action: 'Track',
      message: 'Not enough data. Track this product for insights.',
      color: 'gray'
    };
  }

  // Extract price values
  const prices = priceHistory.prices.map(entry => entry.price);
  
  // Get the latest price
  const latestPrice = prices[prices.length - 1];

  // Calculate average price
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  
  // Calculate min and max
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // Calculate recent trend (last 7 days vs previous period)
  let trend = 'stable';
  if (prices.length >= 7) {
    const recent = prices.slice(-7);
    const previous = prices.slice(-14, -7);
    
    if (previous.length > 0) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
      
      if (recentAvg < prevAvg * 0.95) trend = 'falling';
      else if (recentAvg > prevAvg * 1.05) trend = 'rising';
    }
  }

  // Determine suggestion based on comparison
  if (latestPrice <= minPrice) {
    // At lowest price ever
    return {
      icon: '🟢',
      action: 'Buy Now',
      message: `Lowest price ever! ${latestPrice === minPrice ? 'Historical low' : 'Great deal'}. Buy now!`,
      color: 'green'
    };
  } else if (latestPrice < average * 0.9) {
    // Below average by 10%+
    const difference = ((average - latestPrice) / average * 100).toFixed(1);
    return {
      icon: '🟢',
      action: 'Buy Now',
      message: `Great deal! Price is ${difference}% below average. ${trend === 'rising' ? 'Prices trending up.' : ''}`,
      color: 'green'
    };
  } else if (latestPrice > average * 1.1 && trend === 'falling') {
    // Above average but falling
    const difference = ((latestPrice - average) / average * 100).toFixed(1);
    return {
      icon: '🕓',
      action: 'Wait',
      message: `Price is ${difference}% above average but trending down. Wait for better deal.`,
      color: 'orange'
    };
  } else if (latestPrice > average * 1.1) {
    // Well above average
    const difference = ((latestPrice - average) / average * 100).toFixed(1);
    return {
      icon: '❌',
      action: 'Wait',
      message: `Price is ${difference}% above average. Not a good time to buy.`,
      color: 'red'
    };
  } else if (trend === 'falling') {
    // Trending down
    return {
      icon: '🕓',
      action: 'Wait',
      message: 'Prices trending down. Wait a few days for better deal.',
      color: 'orange'
    };
  } else {
    // Price is stable at average
    return {
      icon: '🔔',
      action: 'Track',
      message: 'Stable price. Track this product to get alerts on price drops.',
      color: 'blue'
    };
  }
}
