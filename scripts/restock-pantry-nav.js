;(function (global) {
  const APP_STATE_STORAGE_KEY = 'blissful-app-state';
  const KITCHEN_VIEW = 'kitchen';
  const CORRECTION_FRAMES = 60;

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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document === 'undefined') return;

  let desiredKitchen = false;
  let observer = null;

  const readState = () => {
    try {
      const raw = global.localStorage?.getItem?.(APP_STATE_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  };

  const writeState = (state) => {
    try {
      global.localStorage?.setItem?.(APP_STATE_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Keep navigation functional for this page session if storage is unavailable.
    }
  };

  const getKitchenButton = () => document.querySelector(
    'button[data-restock-trigger="topbar"], button[data-view-target="kitchen"]',
  );

  const syncKitchenButtonActiveState = (button = getKitchenButton()) => {
    if (!(button instanceof HTMLButtonElement)) return;
    const active = readState().activeView === KITCHEN_VIEW;
    button.classList.toggle('view-toggle__button--active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  };

  const restoreKitchenView = () => {
    const kitchen = document.getElementById('kitchen-view');
    if (!(kitchen instanceof HTMLElement)) return false;
    kitchen.removeAttribute('aria-hidden');
    if (desiredKitchen || readState().activeView === KITCHEN_VIEW) {
      kitchen.hidden = false;
    }
    return true;
  };

  const openKitchen = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    desiredKitchen = true;
    const state = buildKitchenState(readState());
    writeState(state);
    const app = global.BlissfulApp;
    if (app && typeof app.applyStarterState === 'function') {
      app.applyStarterState(state);
    }
    restoreKitchenView();
    syncKitchenButtonActiveState();
  };

  const configureKitchenButton = () => {
    let button = getKitchenButton();
    if (!(button instanceof HTMLButtonElement)) return false;

    if (shouldReplaceTopbarButton({
      restockBound: button.dataset.restockBound,
      restockTrigger: button.dataset.restockTrigger,
      label: button.textContent,
    })) {
      const replacement = button.cloneNode(true);
      button.replaceWith(replacement);
      button = replacement;
    }

    if (button.textContent?.trim() !== 'Kitchen') button.textContent = 'Kitchen';
    if (button.dataset.viewTarget !== KITCHEN_VIEW) button.dataset.viewTarget = KITCHEN_VIEW;
    delete button.dataset.restockTrigger;
    delete button.dataset.restockBound;
    button.removeAttribute('aria-haspopup');
    button.removeAttribute('aria-controls');

    if (button.dataset.kitchenNavCorrectionBound !== 'true') {
      button.dataset.kitchenNavCorrectionBound = 'true';
      button.addEventListener('click', openKitchen, true);
    }

    syncKitchenButtonActiveState(button);
    return true;
  };

  const correctNavigation = () => {
    configureKitchenButton();
    restoreKitchenView();
    if (desiredKitchen && readState().activeView !== KITCHEN_VIEW) {
      const state = buildKitchenState(readState());
      writeState(state);
      const app = global.BlissfulApp;
      if (app && typeof app.applyStarterState === 'function') {
        app.applyStarterState(state);
      }
    }
  };

  const start = () => {
    correctNavigation();

    observer = new MutationObserver(() => correctNavigation());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'data-restock-trigger',
        'data-restock-bound',
        'data-view-target',
        'hidden',
        'aria-hidden',
      ],
    });

    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element
        ? event.target.closest('button[data-view-target]')
        : null;
      if (!(target instanceof HTMLButtonElement) || target.dataset.viewTarget === KITCHEN_VIEW) return;
      desiredKitchen = false;
      global.requestAnimationFrame(() => syncKitchenButtonActiveState());
    }, true);

    let frame = 0;
    const settle = () => {
      frame += 1;
      correctNavigation();
      if (frame < CORRECTION_FRAMES) {
        global.requestAnimationFrame(settle);
      } else {
        global.setTimeout(() => observer?.disconnect(), 750);
      }
    };
    global.requestAnimationFrame(settle);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
