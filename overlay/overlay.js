(function(){
  const root = document.getElementById('smartshopper-overlay');
  if (!root) return;

  const closeBtn = root.querySelector('#ss-close');
  const loading = root.querySelector('#ss-loading');
  const content = root.querySelector('#ss-content');
  const priceVal = root.querySelector('#ss-price-val');
  const trendVal = root.querySelector('#ss-trend-val');
  const titleEl = root.querySelector('#ss-title');

  closeBtn.addEventListener('click', () => {
    root.remove();
    const floating = document.getElementById('smartshopper-floating-btn');
    if (floating) floating.style.display = '';
  });

  // simple extraction of title and price from page
  const pageTitle = document.title || '';
  titleEl.textContent = pageTitle;

  // hide floating button while overlay is open
  const floating = document.getElementById('smartshopper-floating-btn');
  if (floating) floating.style.display = 'none';

  // simulate fetching price/trend via extension's server API
  function fetchInsights() {
    loading.style.display = '';
    content.style.display = 'none';

    const payload = { url: location.href, title: pageTitle };

    fetch(chrome.runtime.getURL('../scripts/api.js'))
      .then(() => {
        // placeholder: in real app we'd call extension's server or background
        setTimeout(() => {
          loading.style.display = 'none';
          content.style.display = '';
          priceVal.textContent = '$' + (Math.random() * 200).toFixed(2);
          trendVal.textContent = (Math.random() > 0.5) ? 'Rising' : 'Falling';
        }, 700);
      })
      .catch(err => {
        loading.textContent = 'Error loading insights';
      });
  }

  fetchInsights();
})();
