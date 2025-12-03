// popup/watchlist.js - Watchlist page functionality
import { getWatchlist, removeFromWatchlist, getWatchlistStats, clearWatchlist } from '../scripts/storage.js';

// Load and display watchlist on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadWatchlist();
  setupEventListeners();
});

async function loadWatchlist() {
  try {
    const watchlist = await getWatchlist();
    const stats = await getWatchlistStats();

    // Update stats
    document.getElementById('total-count').textContent = stats.totalProducts;
    document.getElementById('total-savings').textContent = `₹${stats.totalSavings.toFixed(0)}`;
    document.getElementById('drops-count').textContent = stats.productsWithDrops;
    document.getElementById('active-count').textContent = stats.activeProducts;

    // Render watchlist items
    const container = document.getElementById('watchlist-container');
    const emptyState = document.getElementById('empty-state');

    if (watchlist.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      container.innerHTML = watchlist.map(product => createProductCard(product)).join('');
      
      // Attach event listeners to remove buttons
      document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleRemove(e.target.dataset.productId));
      });

      // Attach event listeners to view buttons
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          chrome.tabs.create({ url: e.target.dataset.url });
        });
      });
    }
  } catch (error) {
    console.error('Error loading watchlist:', error);
  }
}

function createProductCard(product) {
  const priceDiff = product.initialPrice - product.currentPrice;
  const percentChange = product.initialPrice > 0 
    ? ((priceDiff / product.initialPrice) * 100).toFixed(1) 
    : 0;
  const isDropped = priceDiff > 0;
  const isRisen = priceDiff < 0;

  const addedDate = new Date(product.addedAt).toLocaleDateString();
  const checkedDate = new Date(product.lastChecked).toLocaleDateString();

  return `
    <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div class="flex gap-6">
        <!-- Product Info -->
        <div class="flex-1">
          <h3 class="text-lg font-bold text-gray-800 mb-2 line-clamp-2">${product.name}</h3>
          <div class="text-xs text-gray-500 mb-4">${product.site}</div>
          
          <!-- Price Info -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div class="text-xs text-gray-500">Current Price</div>
              <div class="text-xl font-bold text-gray-800">₹${product.currentPrice}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Initial Price</div>
              <div class="text-sm text-gray-600">₹${product.initialPrice}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Lowest Price</div>
              <div class="text-sm font-semibold text-green-600">₹${product.lowestPrice}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500">Change</div>
              <div class="text-sm font-bold ${isDropped ? 'text-green-600' : isRisen ? 'text-red-600' : 'text-gray-600'}">
                ${isDropped ? '↓' : isRisen ? '↑' : '−'} ₹${Math.abs(priceDiff)} (${percentChange}%)
              </div>
            </div>
          </div>

          <!-- Meta Info -->
          <div class="flex gap-4 text-xs text-gray-500 mb-4">
            <span>📅 Added: ${addedDate}</span>
            <span>🔄 Last checked: ${checkedDate}</span>
            ${product.targetPrice ? `<span>🎯 Target: ₹${product.targetPrice}</span>` : ''}
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button class="view-btn bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded transition" 
                    data-url="${product.url}">
              View Product
            </button>
            <button class="remove-btn bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-4 rounded transition" 
                    data-product-id="${product.id}">
              Remove
            </button>
          </div>
        </div>

        <!-- Price Trend Badge -->
        <div class="flex items-start">
          ${isDropped 
            ? `<div class="bg-green-100 text-green-800 text-xs font-bold px-3 py-2 rounded-full">
                 💰 Price Drop!
               </div>`
            : isRisen
            ? `<div class="bg-red-100 text-red-800 text-xs font-bold px-3 py-2 rounded-full">
                 📈 Price Up
               </div>`
            : `<div class="bg-gray-100 text-gray-800 text-xs font-bold px-3 py-2 rounded-full">
                 − Stable
               </div>`
          }
        </div>
      </div>
    </div>
  `;
}

async function handleRemove(productId) {
  if (!confirm('Remove this product from your watchlist?')) return;

  const success = await removeFromWatchlist(productId);
  if (success) {
    await loadWatchlist();
    showStatus('Product removed', 'success');
  } else {
    showStatus('Failed to remove product', 'error');
  }
}

function setupEventListeners() {
  // Check prices now button
  document.getElementById('check-now').addEventListener('click', async () => {
    showStatus('Checking prices...', 'info');
    
    chrome.runtime.sendMessage({ type: 'CHECK_PRICES_NOW' }, (response) => {
      if (response && response.ok) {
        setTimeout(async () => {
          await loadWatchlist();
          showStatus('Prices updated!', 'success');
        }, 2000);
      } else {
        showStatus('Failed to check prices', 'error');
      }
    });
  });

  // Clear all button
  document.getElementById('clear-all').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear your entire watchlist? This cannot be undone.')) return;

    const success = await clearWatchlist();
    if (success) {
      await loadWatchlist();
      showStatus('Watchlist cleared', 'success');
    } else {
      showStatus('Failed to clear watchlist', 'error');
    }
  });
}

function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('action-status');
  const colors = {
    info: 'text-blue-600',
    success: 'text-green-600',
    error: 'text-red-600'
  };
  
  statusEl.textContent = message;
  statusEl.className = `flex items-center text-sm ${colors[type] || colors.info}`;
  
  setTimeout(() => {
    statusEl.textContent = '';
  }, 3000);
}
