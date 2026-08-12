;(function (global) {
  const APP_STATE_STORAGE_KEY = 'blissful-app-state';
  const KITCHEN_VIEW = 'kitchen';

  const buildKitchenState = (state) => ({
    ...(state && typeof state === 'object' && !Array.isArray(state) ? state : {}),
    activeView: KITCHEN_VIEW,
  });

  const shouldReplaceTopbarButton = ({ restockBound, restockTrigger, label } = {}) => (
    restockBound === 'true'
    || restockTrigger === 'topbar'
    || String(label || '').trim().toLowerCase() === 'restock'
  );

  const api = { buildKitchenState, shouldReplaceTopbarButton };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  let correcting = false;

  const readState = () => {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem?.(APP_STATE_STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  };

  const getKitchenButton = () => document.querySelector(
    'button[data-view-target="kitchen"], button[data-restock-trigger="topbar"]',
  );

  const applyKitchenState = () => {
    const next = buildKitchenState(readState());
    const app = global.BlissfulApp;
    if (app && typeof app.applyStarterState === 'function') {
      app.applyStarterState(next);
    } else {
      try { global.localStorage?.setItem?.(APP_STATE_STORAGE_KEY, JSON.stringify(next)); } catch (error) {}
    }
    const kitchen = document.getElementById('kitchen-view');
    if (kitchen instanceof HTMLElement) {
      kitchen.hidden = false;
      kitchen.removeAttribute('aria-hidden');
    }
  };

  const bindCorrectedKitchenButton = (button) => {
    if (!(button instanceof HTMLButtonElement)) return null;
    let target = button;
    if (shouldReplaceTopbarButton({
      restockBound: button.dataset.restockBound,
      restockTrigger: button.dataset.restockTrigger,
      label: button.textContent,
    })) {
      target = button.cloneNode(true);
      button.replaceWith(target);
    }
    target.textContent = 'Kitchen';
    target.dataset.viewTarget = KITCHEN_VIEW;
    delete target.dataset.restockTrigger;
    delete target.dataset.restockBound;
    target.removeAttribute('aria-haspopup');
    target.removeAttribute('aria-controls');
    if (target.dataset.kitchenNavCorrectionBound !== 'true') {
      target.dataset.kitchenNavCorrectionBound = 'true';
      target.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        applyKitchenState();
      }, true);
    }
    return target;
  };

  const sync = () => {
    if (correcting) return;
    correcting = true;
    try {
      const button = bindCorrectedKitchenButton(getKitchenButton());
      const active = readState().activeView === KITCHEN_VIEW;
      if (button instanceof HTMLButtonElement) {
        button.classList.toggle('view-toggle__button--active', active);
        if (active) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      }
      if (active) {
        const kitchen = document.getElementById('kitchen-view');
        if (kitchen instanceof HTMLElement) {
          kitchen.hidden = false;
          kitchen.removeAttribute('aria-hidden');
        }
      }
    } finally {
      correcting = false;
    }
  };

  const start = () => {
    sync();
    const observer = new MutationObserver(() => global.requestAnimationFrame(sync));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-restock-trigger', 'data-restock-bound', 'data-view-target', 'aria-hidden'],
    });
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('button[data-view-target]') : null;
      if (!(target instanceof HTMLButtonElement) || target.dataset.viewTarget === KITCHEN_VIEW) return;
      global.requestAnimationFrame(sync);
    }, true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
