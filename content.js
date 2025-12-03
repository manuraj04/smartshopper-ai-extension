// content.js - runs in page context via content script

(function () {
  // Listen for messages from the extension (popup or background)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return;
    if (message.type === 'SHOW_OVERLAY') {
      injectOverlay(message.payload || {});
    }
  });

  function injectOverlay(payload) {
    if (document.getElementById('smartshopper-overlay-root')) return;

    fetch(chrome.runtime.getURL('overlay/overlay.html'))
      .then(r => r.text())
      .then(html => {
        const wrapper = document.createElement('div');
        wrapper.id = 'smartshopper-overlay-root';
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper);

        // Allow the overlay script to initialize
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('overlay/overlay.js');
        document.body.appendChild(script);
      })
      .catch(err => console.error('Failed to load overlay', err));
  }

  // Auto-detect product pages (simple heuristic) and inject overlay button
  function tryAutoInject() {
    const selectors = [
      '[data-product-id]',
      '[itemtype*="Product"]',
      'meta[property="og:type"][content="product"]'
    ];

    if (selectors.some(sel => document.querySelector(sel))) {
      // found product markers; show a small floating button
      createFloatingButton();
    }
  }

  function createFloatingButton() {
    if (document.getElementById('smartshopper-floating-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'smartshopper-floating-btn';
    btn.textContent = 'SmartShopper';
    Object.assign(btn.style, {
      position: 'fixed',
      right: '12px',
      bottom: '12px',
      zIndex: 2147483647,
      background: '#0b74de',
      color: 'white',
      border: 'none',
      padding: '8px 12px',
      borderRadius: '6px',
      cursor: 'pointer'
    });
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_OVERLAY' });
      // Also inject overlay directly
      injectOverlay();
    });
    document.body.appendChild(btn);
  }

  // Run heuristics after page load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    tryAutoInject();
  } else {
    window.addEventListener('DOMContentLoaded', tryAutoInject);
  }
})();
