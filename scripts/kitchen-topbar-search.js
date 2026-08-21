;(function (global) {
  const isKitchenTabSelected = ({ active = false, ariaCurrent = '' } = {}) => (
    Boolean(active) || String(ariaCurrent || '') === 'page'
  );

  const api = { isKitchenTabSelected };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulKitchenTopbarSearch = Object.assign({}, global.BlissfulKitchenTopbarSearch || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;
  let retries = 0;

  const getKitchenTab = () => document.querySelector('#primary-nav [data-view-target="kitchen"]');
  const kitchenSelected = () => {
    const tab = getKitchenTab();
    return tab instanceof HTMLElement && isKitchenTabSelected({
      active: tab.classList.contains('view-toggle__button--active'),
      ariaCurrent: tab.getAttribute('aria-current') || '',
    });
  };

  const ensureChrome = () => {
    const row = document.querySelector('#recipes-page .topbar__row');
    const source = document.getElementById('filter-search');
    if (!(row instanceof HTMLElement) || !(source instanceof HTMLInputElement)) return null;

    let chrome = document.getElementById('kitchen-topbar-search');
    if (!(chrome instanceof HTMLElement)) {
      chrome = document.createElement('div');
      chrome.id = 'kitchen-topbar-search';
      chrome.className = 'kitchen-topbar-search';
      chrome.hidden = true;

      const input = document.createElement('input');
      input.type = 'search';
      input.id = 'kitchen-topbar-search-input';
      input.placeholder = 'Search equipment';
      input.autocomplete = 'off';
      input.setAttribute('aria-label', 'Search kitchen equipment');
      input.addEventListener('input', () => {
        if (source.value === input.value) return;
        source.value = input.value;
        source.dispatchEvent(new Event('input', { bubbles: true }));
      });
      chrome.appendChild(input);
    }

    if (chrome.parentElement !== row) row.appendChild(chrome);

    const input = chrome.querySelector('#kitchen-topbar-search-input');
    if (input instanceof HTMLInputElement && input.value !== source.value) input.value = source.value;

    if (source.dataset.kitchenTopbarBound !== 'true') {
      source.dataset.kitchenTopbarBound = 'true';
      source.addEventListener('input', () => {
        const mirror = document.getElementById('kitchen-topbar-search-input');
        if (mirror instanceof HTMLInputElement && mirror.value !== source.value) mirror.value = source.value;
      });
    }

    return chrome;
  };

  const sync = () => {
    scheduled = false;
    const chrome = ensureChrome();
    if (!(chrome instanceof HTMLElement)) return false;
    chrome.hidden = !kitchenSelected();
    chrome.setAttribute('aria-hidden', chrome.hidden ? 'true' : 'false');
    return true;
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => sync());
  };

  const retry = () => {
    retries += 1;
    if (sync() || retries >= 60) return;
    global.requestAnimationFrame(retry);
  };

  const start = () => {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('#primary-nav .view-toggle__button')) schedule();
    }, true);

    const observer = new MutationObserver((records) => {
      const relevant = records.some((record) => {
        if (record.type === 'childList') return record.addedNodes.length > 0;
        const target = record.target;
        return target instanceof HTMLElement && target.closest('#primary-nav') !== null;
      });
      if (relevant) schedule();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-current'],
    });

    retry();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
