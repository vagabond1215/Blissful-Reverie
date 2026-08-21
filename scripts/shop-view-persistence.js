;(function (global) {
  const STORAGE_KEY = 'blissful-shop-active';
  const parseShopActive = (value) => String(value || '') === 'true';
  const writeShopActive = (storage, active) => {
    try {
      storage?.setItem?.(STORAGE_KEY, active ? 'true' : 'false');
      return true;
    } catch (error) {
      return false;
    }
  };

  const api = { STORAGE_KEY, parseShopActive, writeShopActive };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulShopViewPersistence = Object.assign({}, global.BlissfulShopViewPersistence || {}, api);
  if (typeof document === 'undefined') return;

  let attempts = 0;
  const restore = () => {
    let active = false;
    try { active = parseShopActive(global.localStorage?.getItem?.(STORAGE_KEY)); } catch (error) {}
    if (!active) return;
    const button = document.querySelector('#primary-nav [data-shop-tab="true"]');
    if (button instanceof HTMLButtonElement) {
      button.click();
      return;
    }
    if (attempts >= 60) return;
    attempts += 1;
    global.requestAnimationFrame(restore);
  };

  const start = () => {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest('#primary-nav [data-shop-tab="true"]')) {
        writeShopActive(global.localStorage, true);
        return;
      }
      if (target.closest('#primary-nav .view-toggle__button:not([data-shop-tab="true"])')) {
        writeShopActive(global.localStorage, false);
      }
    }, true);
    global.requestAnimationFrame(restore);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
