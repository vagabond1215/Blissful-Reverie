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

  const canonicalizeKitchenEquipmentLabels = (workspace) => {
    const groups = workspace?.GROUP_DEFINITIONS;
    if (!Array.isArray(groups)) return null;
    const bakingSheet = groups.find((group) => group?.key === 'baking-sheets');
    if (!bakingSheet) return null;
    bakingSheet.label = 'Baking Sheet';
    return bakingSheet;
  };

  const api = { STORAGE_KEY, parseShopActive, writeShopActive, canonicalizeKitchenEquipmentLabels };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulShopViewPersistence = Object.assign({}, global.BlissfulShopViewPersistence || {}, api);
  if (typeof document === 'undefined') return;

  let attempts = 0;
  let kitchenLabelAttempts = 0;
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

  const syncCanonicalKitchenLabels = () => {
    const group = canonicalizeKitchenEquipmentLabels(global.BlissfulShopKitchenWorkspace);
    if (!group) {
      if (kitchenLabelAttempts >= 60) return;
      kitchenLabelAttempts += 1;
      global.requestAnimationFrame(syncCanonicalKitchenLabels);
      return;
    }
    const row = document.querySelector('[data-kitchen-group="baking-sheets"]');
    if (!(row instanceof HTMLElement)) return;
    const name = row.querySelector('.kitchen-equipment-group__name');
    if (name instanceof HTMLElement) name.textContent = group.label;
    const checkbox = row.querySelector('.kitchen-equipment-group__checkbox');
    if (checkbox instanceof HTMLInputElement) {
      checkbox.setAttribute('aria-label', `${checkbox.checked ? 'Deselect' : 'Select'} all ${group.label}`);
    }
    const toggle = row.querySelector('.kitchen-equipment-group__toggle');
    if (toggle instanceof HTMLButtonElement) {
      toggle.setAttribute('aria-label', `${toggle.getAttribute('aria-expanded') === 'true' ? 'Collapse' : 'Expand'} ${group.label}`);
    }
  };

  const start = () => {
    syncCanonicalKitchenLabels();
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
    global.addEventListener('blissful-kitchen-inventory-change', syncCanonicalKitchenLabels);
    global.requestAnimationFrame(restore);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
