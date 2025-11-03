// Comparify - AI Shopping Assistant
console.log('🛒 Comparify popup loaded');

// Import functions from modules
let getPrices, getAISuggestion;

// Load the modules
(async () => {
  const apiModule = await import(chrome.runtime.getURL('scripts/api.js'));
  getPrices = apiModule.getPrices;
  
  const aiModule = await import(chrome.runtime.getURL('scripts/aiEngine.js'));
  getAISuggestion = aiModule.getAISuggestion;
})();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  loadCurrentProduct();
  setupEventListeners();
});

// Load current product URL
async function loadCurrentProduct() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      document.getElementById('product-url').value = tab.url;
    }
  } catch (error) {
    console.error('Error loading product:', error);
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Paste button
  document.getElementById('paste-btn').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('product-url').value = text;
      showStatus('✅ Link pasted!', 'success');
    } catch (error) {
      showStatus('❌ Failed to paste', 'error');
    }
  });

  // Summarize Products button
  document.getElementById('summarize-btn').addEventListener('click', async () => {
    const url = document.getElementById('product-url').value.trim();
    if (!url) {
      showStatus('⚠️ Please enter a product link', 'warning');
      return;
    }
    
    await summarizeProduct(url);
  });

  // Price Compare button
  document.getElementById('compare-prices').addEventListener('click', async () => {
    const url = document.getElementById('product-url').value.trim();
    if (!url) {
      showStatus('⚠️ Please enter a product link', 'warning');
      return;
    }
    
    await comparePrices(url);
  });

  // Generate AI Insights button
  document.getElementById('generate-btn').addEventListener('click', async () => {
    const query = document.getElementById('ai-input').value.trim();
    if (!query) {
      showStatus('⚠️ Please describe what you need', 'warning');
      return;
    }
    
    await generateAIInsights(query);
  });

  // Track Product button
  document.getElementById('track-product').addEventListener('click', async () => {
    const url = document.getElementById('product-url').value.trim();
    if (!url) {
      showStatus('⚠️ Please enter a product link', 'warning');
      return;
    }
    
    await trackProduct(url);
  });

  // Header buttons
  document.getElementById('history-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('watchlist.html') });
  });

  document.getElementById('chart-btn').addEventListener('click', () => {
    showStatus('📊 Price trends coming soon!', 'info');
  });

  document.getElementById('close-btn').addEventListener('click', () => {
    window.close();
  });
}

// Summarize Product
async function summarizeProduct(url) {
  showStatus('🔍 Analyzing product...', 'info');
  
  try {
    // Mock summarization (replace with actual API call)
    setTimeout(() => {
      showStatus('✅ Product analyzed successfully!', 'success');
      document.getElementById('track-product').classList.remove('hidden');
    }, 1500);
  } catch (error) {
    showStatus('❌ Failed to analyze product', 'error');
    console.error('Summarize error:', error);
  }
}

// Compare Prices
async function comparePrices(url) {
  showStatus('🔍 Comparing prices...', 'info');
  
  try {
    const priceData = await getPrices(url);
    displayPriceComparison(priceData);
    showStatus('✅ Price comparison complete!', 'success');
  } catch (error) {
    showStatus('❌ Failed to compare prices', 'error');
    console.error('Price comparison error:', error);
  }
}

// Display Price Comparison
function displayPriceComparison(priceData) {
  const comparisonDiv = document.getElementById('price-comparison');
  const priceTable = document.getElementById('price-table');
  
  if (!priceData || priceData.length === 0) {
    priceTable.innerHTML = '<p class="text-sm text-gray-500 text-center py-2">No price data available</p>';
    return;
  }
  
  // Sort by price (lowest first)
  priceData.sort((a, b) => a.price - b.price);
  
  let html = '';
  priceData.forEach((item, index) => {
    const isBest = index === 0;
    html += `
      <div class="flex items-center justify-between p-3 rounded-lg ${isBest ? 'bg-green-100 border-2 border-green-500' : 'bg-white border border-gray-200'}">
        <div class="flex items-center gap-3">
          ${isBest ? '<span class="text-green-600 font-bold text-xs">BEST</span>' : ''}
          <div>
            <div class="font-semibold text-sm text-gray-800">${item.seller}</div>
            <div class="text-xs text-gray-500">${item.delivery || 'Standard delivery'}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="font-bold text-lg ${isBest ? 'text-green-600' : 'text-gray-800'}">₹${item.price.toFixed(2)}</div>
          ${item.originalPrice ? `<div class="text-xs text-gray-400 line-through">₹${item.originalPrice.toFixed(2)}</div>` : ''}
        </div>
      </div>
    `;
  });
  
  priceTable.innerHTML = html;
  comparisonDiv.classList.remove('hidden');
}

// Generate AI Insights
async function generateAIInsights(query) {
  showStatus('🤖 AI is thinking...', 'info');
  
  try {
    const suggestion = await getAISuggestion(query, []);
    
    // Display AI response in a nice format
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-800">AI Assistant</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="text-sm text-gray-700 leading-relaxed">
          ${suggestion.action ? `
            <div class="mb-3 p-3 rounded-lg ${
              suggestion.action === 'BUY' ? 'bg-green-100 text-green-800' :
              suggestion.action === 'WAIT' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }">
              <strong>${suggestion.action}</strong> - ${suggestion.reason}
            </div>
          ` : ''}
          <p>${suggestion.message || 'Here are my recommendations based on your query...'}</p>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    showStatus('✅ AI insights generated!', 'success');
  } catch (error) {
    showStatus('❌ AI generation failed', 'error');
    console.error('AI generation error:', error);
  }
}

// Track Product
async function trackProduct(url) {
  showStatus('📊 Adding to watchlist...', 'info');
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const productName = tab?.title || 'Product';
    
    // Get current price (mock for now)
    const currentPrice = 999.99; // Replace with actual price extraction
    
    const product = {
      id: Date.now().toString(),
      name: productName,
      url: url,
      currentPrice: currentPrice,
      targetPrice: null,
      active: true,
      dateAdded: new Date().toISOString()
    };
    
    // Save to storage
    chrome.storage.local.get(['watchlist'], (result) => {
      const watchlist = result.watchlist || [];
      watchlist.push(product);
      chrome.storage.local.set({ watchlist }, () => {
        showStatus('✅ Product added to watchlist!', 'success');
        
        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '../assets/icon48.png',
          title: 'Comparify',
          message: `${product.name} added to watchlist!`
        });
      });
    });
  } catch (error) {
    showStatus('❌ Failed to track product', 'error');
    console.error('Track product error:', error);
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `text-xs text-center mt-3 ${
    type === 'success' ? 'text-green-600' :
    type === 'error' ? 'text-red-600' :
    type === 'warning' ? 'text-yellow-600' :
    'text-gray-500'
  }`;
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusDiv.textContent = '';
  }, 3000);
}
