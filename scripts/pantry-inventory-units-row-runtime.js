;(function (global) {
  const core = global.BlissfulInventoryUnits || (typeof require === 'function' ? require('./inventory-units-core.js') : {});
  const APP_STATE_KEY = 'blissful-app-state';
  const PROFILE_KEY = core.PROFILE_STORAGE_KEY || 'blissful-inventory-unit-profiles';
  const MIGRATION_KEY = 'blissful-inventory-unit-schema-v1';
  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const bySlug = new Map(ingredients.filter((item) => item?.slug).map((item) => [String(item.slug), item]));

  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const clean = (value) => String(value || '').trim();
  const formatNumber = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    if (Math.abs(number - Math.round(number)) < 1e-8) return String(Math.round(number));
    return String(Math.round(number * 1000) / 1000);
  };
  const readJson = (key, fallback) => {
    try {
      const raw = global.localStorage?.getItem?.(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  };
  const writeJson = (key, value) => {
    try {
      global.localStorage?.setItem?.(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  };
  const getState = () => {
    const state = readJson(APP_STATE_KEY, {});
    return isRecord(state) ? state : {};
  };
  const getInventory = () => {
    const inventory = getState().pantryInventory;
    return isRecord(inventory) ? inventory : {};
  };
  const getCustomProfiles = () => typeof core.normalizeProfiles === 'function'
    ? core.normalizeProfiles(readJson(PROFILE_KEY, {}))
    : {};
  const setCustomProfiles = (profiles) => writeJson(PROFILE_KEY, profiles);
  const hasCustomProfile = (slug) => Boolean(getCustomProfiles()[slug]);
  const hasSeededProfile = (slug) => Boolean(core.DEFAULT_PROFILES && core.DEFAULT_PROFILES[slug]);

  const profileFor = (slug) => {
    const custom = getCustomProfiles();
    if (hasSeededProfile(slug) || custom[slug]) return core.resolveProfile(slug, custom);
    const entry = getInventory()[slug];
    const ingredient = bySlug.get(slug) || {};
    const currentUnit = core.normalizeUnit?.(entry?.unit) || '';
    const packageCore = global.BlissfulPantryPackageDefaults || {};
    const packageUnit = core.normalizeUnit?.(ingredient.packageUnit)
      || core.normalizeUnit?.(typeof packageCore.getDefaultPackageUnit === 'function'
        ? packageCore.getDefaultPackageUnit(ingredient)
        : '')
      || '';
    return core.normalizeProfile({
      stockUnit: currentUnit || 'each',
      purchaseUnit: packageUnit && core.getUnit?.(packageUnit)?.group === 'package' ? packageUnit : '',
      unitsPerPurchase: 1,
    });
  };

  const buildProfileSummary = (profile) => {
    const normalized = core.normalizeProfile(profile);
    const purchase = normalized.purchaseUnit || 'purchase unit';
    return `1 ${purchase} = ${formatNumber(normalized.unitsPerPurchase)} ${normalized.stockUnit}`;
  };

  const commitInventory = (inventory) => {
    const state = getState();
    state.pantryInventory = isRecord(inventory) ? inventory : {};
    writeJson(APP_STATE_KEY, state);
    if (typeof global.BlissfulApp?.applyStarterState === 'function') {
      try { global.BlissfulApp.applyStarterState(state); } catch (error) {}
    }
    global.dispatchEvent?.(new CustomEvent('blissful-inventory-change', {
      detail: { inventory: state.pantryInventory },
    }));
    return state.pantryInventory;
  };

  const migrateKnownProfiles = () => {
    try {
      if (global.localStorage?.getItem?.(MIGRATION_KEY) === 'done') return { changed: false, warnings: [] };
    } catch (error) {}
    const state = getState();
    const inventory = isRecord(state.pantryInventory) ? { ...state.pantryInventory } : {};
    const custom = getCustomProfiles();
    const warnings = [];
    let changed = false;
    Object.keys(inventory).forEach((slug) => {
      if (!hasSeededProfile(slug) && !custom[slug]) return;
      const profile = core.resolveProfile(slug, custom);
      let normalized = core.normalizeInventoryEntry(inventory[slug], profile);
      if (normalized && !normalized.convertible) {
        const legacyUnit = core.getUnit?.(inventory[slug]?.unit);
        const quantity = Number(inventory[slug]?.quantity);
        if (legacyUnit?.group === 'package' && profile.purchaseUnit && Number.isFinite(quantity) && quantity >= 0) {
          const migrated = core.addPurchase({ inventory: {}, slug, purchaseQuantity: quantity, profile });
          normalized = migrated.ok ? { ...migrated.inventory[slug], convertible: true } : normalized;
        }
      }
      if (!normalized) return;
      if (!normalized.convertible) {
        warnings.push({ slug, unit: clean(inventory[slug]?.unit) });
        return;
      }
      const currentUnit = core.normalizeUnit(inventory[slug]?.unit);
      const currentQuantity = Number(inventory[slug]?.quantity);
      if (currentUnit !== normalized.unit || Math.abs(currentQuantity - normalized.quantity) > 1e-8) {
        inventory[slug] = { quantity: normalized.quantity, unit: normalized.unit };
        changed = true;
      }
    });
    if (changed) {
      state.pantryInventory = inventory;
      writeJson(APP_STATE_KEY, state);
    }
    try { global.localStorage?.setItem?.(MIGRATION_KEY, 'done'); } catch (error) {}
    if (changed && typeof global.BlissfulApp?.applyStarterState === 'function') {
      try { global.BlissfulApp.applyStarterState(state); } catch (error) {}
    }
    return { changed, warnings };
  };

  const getStockUnitOptions = (slug, profile) => {
    const configured = hasSeededProfile(slug) || hasCustomProfile(slug);
    const source = configured && typeof core.getSelectableUnits === 'function'
      ? core.getSelectableUnits(profile)
      : (core.UNIT_REGISTRY || []);
    return source.filter((unit) => unit?.group !== 'package');
  };

  const appendStockOptions = (select, slug, profile, currentValue = '') => {
    if (!(select instanceof HTMLSelectElement)) return;
    select.textContent = '';
    const entries = getStockUnitOptions(slug, profile);
    const labels = { count: 'Count', volume: 'Volume', mass: 'Mass' };
    ['count', 'volume', 'mass'].forEach((groupName) => {
      const groupEntries = entries.filter((unit) => unit.group === groupName);
      if (!groupEntries.length) return;
      const group = document.createElement('optgroup');
      group.label = labels[groupName] || groupName;
      groupEntries.forEach((unit) => {
        const option = document.createElement('option');
        option.value = unit.id;
        option.textContent = unit.label;
        group.appendChild(option);
      });
      select.appendChild(group);
    });
    const normalized = core.normalizeUnit?.(currentValue);
    const valid = normalized && entries.some((unit) => unit.id === normalized);
    select.value = valid ? normalized : (profile?.stockUnit || entries[0]?.id || '');
  };

  const changeStockUnit = (slug, targetUnit) => {
    const target = core.normalizeUnit?.(targetUnit);
    const targetDefinition = core.getUnit?.(target);
    if (!target || !targetDefinition || targetDefinition.group === 'package') {
      return { ok: false, reason: 'invalid-stock-unit' };
    }
    const currentProfile = profileFor(slug);
    if (target === currentProfile.stockUnit) return { ok: true, profile: currentProfile };
    let nextProfile = core.rebaseProfile?.(currentProfile, target) || null;
    const inventory = { ...getInventory() };
    const entry = isRecord(inventory[slug]) ? inventory[slug] : null;
    if (!nextProfile) {
      if (entry && Number(entry.quantity) > 0) return { ok: false, reason: 'incompatible-stock-unit' };
      nextProfile = core.normalizeProfile({ ...currentProfile, stockUnit: target, equivalentsToStock: {} });
    }
    if (entry) {
      const oldStockQuantity = core.toStockQuantity?.(entry.quantity, entry.unit, currentProfile);
      const nextQuantity = oldStockQuantity === null
        ? null
        : core.fromStockQuantity?.(oldStockQuantity, target, currentProfile);
      if (nextQuantity === null || !Number.isFinite(Number(nextQuantity))) {
        return { ok: false, reason: 'incompatible-stock-unit' };
      }
      inventory[slug] = { quantity: Number(formatNumber(nextQuantity)), unit: target };
    }
    const profiles = getCustomProfiles();
    profiles[slug] = nextProfile;
    setCustomProfiles(profiles);
    if (entry) commitInventory(inventory);
    else global.dispatchEvent?.(new CustomEvent('blissful-inventory-unit-profile-change', {
      detail: { slug, profile: nextProfile },
    }));
    return { ok: true, profile: nextProfile, inventory };
  };

  const enhanceCard = (card) => {
    if (!(card instanceof HTMLElement)) return;
    const slug = clean(card.dataset.pantrySlug || card.dataset.shoppingSlug);
    const original = card.querySelector('input.pantry-card__inline-input--unit');
    if (!slug || !(original instanceof HTMLInputElement)) return;
    let select = card.querySelector('.pantry-card__unit-select');
    if (!(select instanceof HTMLSelectElement)) {
      select = document.createElement('select');
      select.className = 'pantry-card__inline-input pantry-card__unit-select';
      select.setAttribute('aria-label', original.getAttribute('aria-label') || `Stock unit for ${slug}`);
      original.insertAdjacentElement('beforebegin', select);
      original.hidden = true;
      original.setAttribute('aria-hidden', 'true');
      original.tabIndex = -1;
      select.addEventListener('change', () => {
        const result = changeStockUnit(slug, select.value);
        if (!result.ok) {
          const fallback = profileFor(slug);
          appendStockOptions(select, slug, fallback, fallback.stockUnit);
        }
      });
    }
    const inventoryEntry = getInventory()[slug];
    const profile = profileFor(slug);
    const current = core.normalizeUnit(inventoryEntry?.unit) || profile.stockUnit || 'each';
    if (document.activeElement !== select) appendStockOptions(select, slug, profile, current);
    original.value = current;
    select.title = 'Validated Pantry inventory unit.';
  };

  const enhanceAll = () => document.querySelectorAll('#pantry-grid .pantry-card').forEach(enhanceCard);

  const extendBackupTools = () => {
    const registry = global.BlissfulPersistenceRegistry?.registry;
    return Boolean(registry?.has?.(PROFILE_KEY) && registry?.has?.(MIGRATION_KEY));
  };

  const api = {
    buildProfileSummary,
    profileFor,
    migrateKnownProfiles,
    changeStockUnit,
    getStockUnitOptions,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulPantryInventoryUnits = Object.assign({}, global.BlissfulPantryInventoryUnits || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      extendBackupTools();
      enhanceAll();
    });
  };

  const start = () => {
    migrateKnownProfiles();
    extendBackupTools();
    enhanceAll();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    global.addEventListener('storage', schedule);
    global.addEventListener('blissful-inventory-change', schedule);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
