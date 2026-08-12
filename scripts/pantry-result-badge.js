;(function (global) {
  if (typeof document === 'undefined') return;

  let scheduled = false;

  const isPantryActive = () => {
    const pantry = document.getElementById('pantry-view');
    return pantry instanceof HTMLElement && !pantry.hidden;
  };

  const countVisibleItems = () => Array.from(document.querySelectorAll('#pantry-grid .pantry-card'))
    .filter((card) => card instanceof HTMLElement && !card.hidden && !card.closest('.pantry-category[hidden]'))
    .length;

  const sync = () => {
    const chrome = document.getElementById('pantry-topbar-search');
    if (!(chrome instanceof HTMLElement)) return;

    const legacy = chrome.querySelector('#pantry-result-badge');
    if (legacy) legacy.remove();

    let badge = document.getElementById('pantry-result-badge-live');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'pantry-result-badge-live';
      badge.className = 'pantry-result-badge';
      badge.setAttribute('aria-live', 'polite');
      chrome.insertBefore(badge, chrome.firstChild || null);
    }

    badge.hidden = !isPantryActive();
    if (badge.hidden) return;

    const text = countVisibleItems().toLocaleString();
    if (badge.textContent !== text) badge.textContent = text;
    const label = `${text} pantry results`;
    if (badge.getAttribute('aria-label') !== label) badge.setAttribute('aria-label', label);
    if (badge.title !== label) badge.title = label;
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      sync();
    });
  };

  const start = () => {
    sync();
    const observer = new MutationObserver(() => schedule());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'data-stock-state'],
    });
    global.addEventListener('storage', schedule);
    let retries = 0;
    const retry = () => {
      retries += 1;
      sync();
      if (!document.getElementById('pantry-topbar-search') && retries < 50) {
        global.requestAnimationFrame(retry);
      }
    };
    global.requestAnimationFrame(retry);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
