// scripts/aiEngine.js - AI inference and suggestion engine

export async function summarizeProduct(details) {
  // In a real implementation this would call an LLM or your AI service
  return {
    summary: `Summary for ${details.title || 'product'}`,
    score: Math.round(Math.random() * 100) / 100
  };
}

/**
 * Generate AI-powered price suggestion based on price history
 * @param {number[]} priceHistory - Array of historical prices (oldest to newest)
 * @returns {object} - Suggestion object with icon, action, and message
 */
export function getAISuggestion(priceHistory) {
  if (!priceHistory || priceHistory.length === 0) {
    return {
      icon: '🔔',
      action: 'Track',
      message: 'Not enough data. Track this product for insights.',
      color: 'gray'
    };
  }

  // Get the latest price
  const latestPrice = priceHistory[priceHistory.length - 1];

  // Calculate average price
  const average = priceHistory.reduce((sum, price) => sum + price, 0) / priceHistory.length;

  // Determine suggestion based on comparison
  if (latestPrice > average) {
    // Current price is above average - wait for better deal
    const difference = ((latestPrice - average) / average * 100).toFixed(1);
    return {
      icon: '🕓',
      action: 'Wait',
      message: `Prices trending down. Current price is ${difference}% above average. Wait for a better deal.`,
      color: 'orange'
    };
  } else if (latestPrice < average) {
    // Current price is below average - good time to buy
    const difference = ((average - latestPrice) / average * 100).toFixed(1);
    return {
      icon: '🟢',
      action: 'Buy Now',
      message: `Great deal! Price is ${difference}% below average. Prices may rise soon.`,
      color: 'green'
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

/**
 * Generate simulated price history for demo purposes
 * @param {number} currentPrice - Current price of the product
 * @param {number} days - Number of days of history to generate
 * @returns {number[]} - Array of historical prices
 */
export function generateMockPriceHistory(currentPrice, days = 30) {
  const history = [];
  let price = currentPrice + (Math.random() * 200 - 100); // Start from a random baseline

  for (let i = 0; i < days; i++) {
    // Add some random fluctuation
    price += (Math.random() * 60 - 30);
    // Keep price positive
    price = Math.max(price, currentPrice * 0.7);
    history.push(Math.round(price));
  }

  return history;
}
