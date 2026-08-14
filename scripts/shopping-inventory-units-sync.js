;(function (global) {
  const core = global.BlissfulInventoryUnits || (typeof require === 'function' ? require('./inventory-units-core.js') : {});
  const UNIT_PROFILE_KEY = core.PROFILE_STORAGE_KEY || 'blissful-inventory-unit-profiles';
  const SHOPPING_PROFILE_KEY = 'blissful-shopping-item-profiles';
  const USAGE_KEY = 'blissful-pantry-usage';

  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const readJson = (key, fallback) => {
    try { const raw = global.localStorage?.getItem?.(key); return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  };
  const writeJson = (key, value) => {
    try { global.localStorage?.setItem?.(key, JSON.stringify(value)); return true; } catch (error) { return false; }
  };
  const round = (value) => Math.round((Number(value) + Number.EPSILON) * 1e6) / 1e6;

  const effectiveProfiles = (customProfiles = {}) => {
    const normalizedCustom = core.normalizeProfiles?.(customProfiles) || {};
    const result = { ...normalizedCustom };
    Object.keys(core.DEFAULT_PROFILES || {}).forEach((slug) => {
      result[slug] = core.resolveProfile(slug, normalizedCustom);
    });
    return result;
  };

  const syncShoppingProfiles = (shoppingProfiles) => {
    const source = isRecord(shoppingProfiles) ? shoppingProfiles : {};
    const result = {};
    Object.entries(source).forEach(([slug, profile]) => {
      result[slug] = isRecord(profile) ? { ...profile } : {};
    });
    return result;
  };

  const normalizeUsageToStock = (history, unitProfiles) => {
    const source = isRecord(history) ? history : {};
    const profiles = effectiveProfiles(unitProfiles);
    const result = {};
    Object.entries(source).forEach(([slug, bucket]) => {
      if (!isRecord(bucket) || !Array.isArray(bucket.events)) return;
      const profile = profiles[slug];
      const events = bucket.events.map((event) => {
        if (!profile || !isRecord(event)) return event;
        const converted = core.toStockQuantity?.(event.amount, event.unit, profile);
        if (converted === null || !Number.isFinite(Number(converted))) return event;
        return { ...event, amount: round(converted), unit: profile.stockUnit };
      });
      result[slug] = { ...bucket, events };
    });
    return result;
  };

  const dispatchStorageRefresh = (key) => {
    try {
      global.dispatchEvent?.(new StorageEvent('storage', { key }));
    } catch (error) {
      try { global.dispatchEvent?.(new Event('storage')); } catch (innerError) {}
    }
  };

  const sync = () => {
    const unitProfiles = readJson(UNIT_PROFILE_KEY, {});
    const shoppingBefore = readJson(SHOPPING_PROFILE_KEY, {});
    const shoppingAfter = syncShoppingProfiles(shoppingBefore, unitProfiles);
    const usageBefore = readJson(USAGE_KEY, {});
    const usageAfter = normalizeUsageToStock(usageBefore, unitProfiles);
    let changed = false;
    if (JSON.stringify(shoppingBefore) !== JSON.stringify(shoppingAfter)) {
      writeJson(SHOPPING_PROFILE_KEY, shoppingAfter);
      dispatchStorageRefresh(SHOPPING_PROFILE_KEY);
      changed = true;
    }
    if (JSON.stringify(usageBefore) !== JSON.stringify(usageAfter)) {
      writeJson(USAGE_KEY, usageAfter);
      dispatchStorageRefresh(USAGE_KEY);
      changed = true;
    }
    return changed;
  };

  const api = { effectiveProfiles, syncShoppingProfiles, normalizeUsageToStock, sync };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulShoppingInventoryUnits = Object.assign({}, global.BlissfulShoppingInventoryUnits || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;
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
    global.addEventListener('blissful-inventory-unit-profile-change', schedule);
    global.addEventListener('blissful-inventory-change', schedule);
    global.addEventListener('storage', (event) => {
      if ([UNIT_PROFILE_KEY, USAGE_KEY].includes(event?.key)) schedule();
    });
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
