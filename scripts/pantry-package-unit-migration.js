;(function (global) {
  if (typeof document === 'undefined') return;
  const core = global.BlissfulPantryPackageDefaults || {};
  const key = core.UNIT_PREFERENCE_STORAGE_KEY || 'blissful-pantry-unit-preferences';
  const appStateKey = 'blissful-app-state';
  let scheduled = false;

  const clean = (value) => String(value || '').trim();
  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const readJson = (storageKey, fallback) => {
    try {
      const raw = global.localStorage?.getItem?.(storageKey);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  };
  const writeJson = (storageKey, value) => {
    try { global.localStorage?.setItem?.(storageKey, JSON.stringify(value)); } catch (error) {}
  };

  const migrateCard = (card) => {
    if (!(card instanceof HTMLElement)) return false;
    const slug = clean(card.dataset.pantrySlug || card.dataset.shoppingSlug);
    if (!slug) return false;
    const appState = readJson(appStateKey, {});
    const inventory = isRecord(appState?.pantryInventory) ? appState.pantryInventory : {};
    const entry = isRecord(inventory[slug]) ? inventory[slug] : null;
    const unit = clean(entry?.unit);
    const quantity = clean(entry?.quantity);
    if (!unit || unit === 'each' || quantity) return false;

    const preferences = typeof core.normalizePreferenceMap === 'function'
      ? core.normalizePreferenceMap(readJson(key, {}))
      : readJson(key, {});
    if (!clean(preferences[slug])) {
      preferences[slug] = unit;
      writeJson(key, preferences);
    }

    const input = card.querySelector('.pantry-card__inline-input--unit');
    if (!(input instanceof HTMLInputElement)) return true;
    input.dataset.packageUnitSync = 'true';
    input.value = 'each';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    delete input.dataset.packageUnitSync;
    input.value = unit;
    return true;
  };

  const migrate = () => {
    let changed = false;
    document.querySelectorAll('#pantry-grid .pantry-card').forEach((card) => {
      changed = migrateCard(card) || changed;
    });
    return changed;
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      migrate();
    });
  };

  const start = () => {
    migrate();
    const grid = document.getElementById('pantry-grid');
    if (grid) new MutationObserver(schedule).observe(grid, { childList: true, subtree: true });
    else global.requestAnimationFrame(schedule);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
