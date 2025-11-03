// scripts/api.js - helpers for calling APIs (RapidAPI + local server)

import { API_CONFIG } from '../config.js';

const SERVER_BASE = API_CONFIG.backend.baseUrl;
const USE_REAL_API = API_CONFIG.features.useRealAPI;
const RAPIDAPI_KEY = API_CONFIG.rapidapi.key;
const RAPIDAPI_AMAZON_HOST = API_CONFIG.rapidapi.amazon.host;

// Get prices from multiple shopping sites
export async function getPrices(productName, productUrl = null) {
  if (USE_REAL_API) {
    // Real API implementation
    return await fetchRealPrices(productName, productUrl);
  } else {
    // Mock data for development
    return getMockPrices(productName);
  }
}

// Real API implementation using RapidAPI
async function fetchRealPrices(productName, productUrl) {
  try {
    const prices = [];
    
    // Fetch from Amazon using RapidAPI
    if (productUrl && productUrl.includes('amazon')) {
      const amazonPrice = await fetchAmazonPrice(productUrl);
      if (amazonPrice) prices.push(amazonPrice);
    } else {
      // Search Amazon by product name
      const amazonResults = await searchAmazonProduct(productName);
      if (amazonResults && amazonResults.length > 0) {
        prices.push(amazonResults[0]);
      }
    }

    // For other sites, use mock data (or add more RapidAPI integrations)
    const otherSites = getMockPrices(productName).filter(p => p.site !== 'Amazon');
    prices.push(...otherSites);

    return prices.sort((a, b) => a.price - b.price);
  } catch (error) {
    console.error('Error fetching real prices:', error);
    // Fallback to mock data
    return getMockPrices(productName);
  }
}

// Fetch Amazon product details by URL using RapidAPI
async function fetchAmazonPrice(productUrl) {
  try {
    // Extract ASIN from URL
    const asinMatch = productUrl.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
    const asin = asinMatch ? (asinMatch[1] || asinMatch[2]) : null;

    if (!asin) {
      console.warn('Could not extract ASIN from URL');
      return null;
    }

    const response = await fetch(
      `https://${RAPIDAPI_AMAZON_HOST}/product-details?asin=${asin}&country=IN`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Host': RAPIDAPI_AMAZON_HOST,
          'X-RapidAPI-Key': RAPIDAPI_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`RapidAPI error: ${response.status}`);
    }

    const data = await response.json();

    if (data.data) {
      return {
        site: 'Amazon',
        price: parseFloat(data.data.product_price?.replace(/[₹,]/g, '') || 0),
        link: data.data.product_url || productUrl,
        availability: data.data.product_availability || 'Check Site',
        rating: parseFloat(data.data.product_star_rating || 0),
        imageUrl: data.data.product_photo
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching Amazon price:', error);
    return null;
  }
}

// Search Amazon products by name using RapidAPI
async function searchAmazonProduct(productName) {
  try {
    const response = await fetch(
      `https://${RAPIDAPI_AMAZON_HOST}/search?query=${encodeURIComponent(productName)}&page=1&country=IN&sort_by=RELEVANCE`,
      {
        method: 'GET',
        headers: {
          'X-RapidAPI-Host': RAPIDAPI_AMAZON_HOST,
          'X-RapidAPI-Key': RAPIDAPI_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`RapidAPI error: ${response.status}`);
    }

    const data = await response.json();

    if (data.data && data.data.products && data.data.products.length > 0) {
      return data.data.products.slice(0, 3).map(product => ({
        site: 'Amazon',
        price: parseFloat(product.product_price?.replace(/[₹,]/g, '') || 0),
        link: product.product_url,
        availability: product.product_availability || 'Check Site',
        rating: parseFloat(product.product_star_rating || 0),
        imageUrl: product.product_photo,
        title: product.product_title
      }));
    }

    return [];
  } catch (error) {
    console.error('Error searching Amazon:', error);
    return [];
  }
}

// Mock data generator for development/testing
function getMockPrices(productName) {
  // Generate slightly randomized prices for more realistic mock data
  const basePrice = 1400 + Math.floor(Math.random() * 200);
  
  const prices = [
    { 
      site: 'Amazon', 
      price: basePrice + 99, 
      link: `https://www.amazon.in/s?k=${encodeURIComponent(productName)}`,
      availability: 'In Stock',
      rating: 4.2
    },
    { 
      site: 'Flipkart', 
      price: basePrice + 20, 
      link: `https://www.flipkart.com/search?q=${encodeURIComponent(productName)}`,
      availability: 'In Stock',
      rating: 4.0
    },
    { 
      site: 'Myntra', 
      price: basePrice + 150, 
      link: `https://www.myntra.com/${encodeURIComponent(productName)}`,
      availability: 'Limited Stock',
      rating: 4.5
    },
    { 
      site: 'Meesho', 
      price: basePrice - 1, 
      link: `https://www.meesho.com/search?q=${encodeURIComponent(productName)}`,
      availability: 'In Stock',
      rating: 3.8
    }
  ];

  // Sort by price (lowest first)
  return prices.sort((a, b) => a.price - b.price);
}

// TODO: Real API - Fetch price history for a product
export async function fetchPriceHistory(productUrl) {
  if (USE_REAL_API) {
    try {
      const res = await fetch(`${SERVER_BASE}/api/price-history`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_API_KEY' // TODO: Add authentication
        },
        body: JSON.stringify({ url: productUrl })
      });
      return await res.json();
    } catch (err) {
      console.error('fetchPriceHistory error', err);
      return { ok: false, error: err.toString() };
    }
  } else {
    // Mock price history
    return {
      ok: true,
      history: generateMockHistory(30)
    };
  }
}

// TODO: Real API - Fetch price trends and predictions
export async function fetchTrend(url) {
  if (USE_REAL_API) {
    try {
      const res = await fetch(`${SERVER_BASE}/api/trend`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_API_KEY' // TODO: Add authentication
        },
        body: JSON.stringify({ url })
      });
      return await res.json();
    } catch (err) {
      console.error('fetchTrend error', err);
      return { ok: false, error: err.toString() };
    }
  } else {
    // Mock trend data
    const trends = ['Rising', 'Falling', 'Stable'];
    return {
      ok: true,
      trend: trends[Math.floor(Math.random() * trends.length)],
      confidence: Math.random()
    };
  }
}

// TODO: Real API - Track product for price alerts
export async function trackProduct(productData) {
  if (USE_REAL_API) {
    try {
      const res = await fetch(`${SERVER_BASE}/api/track`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_API_KEY' // TODO: Add authentication
        },
        body: JSON.stringify(productData)
      });
      return await res.json();
    } catch (err) {
      console.error('trackProduct error', err);
      return { ok: false, error: err.toString() };
    }
  } else {
    // Mock tracking
    return { ok: true, message: 'Product tracked locally' };
  }
}

// Helper: Generate mock price history
function generateMockHistory(days) {
  const history = [];
  let price = 1500;
  for (let i = 0; i < days; i++) {
    price += (Math.random() * 60 - 30);
    history.push({
      date: new Date(Date.now() - (days - i) * 86400000).toISOString(),
      price: Math.round(price)
    });
  }
  return history;
}
