;(function (global) {
  const core = global.BlissfulInventoryUnits || (typeof require === 'function' ? require('./inventory-units-core.js') : {});
  const LEGACY_KEY = 'blissful-pantry-unit-preferences';
  const PROFILE_KEY = core.PROFILE_STORAGE_KEY || 'blissful-inventory-unit-profiles';
  const MIGRATION_KEY = 'blissful-inventory-legacy-unit-preferences-v1';

  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const readJson = (key, fallback) => {
    try { const raw = global.localStorage?.getItem?.(key); return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  };
  const writeJson = (key, value) => {
    try { global.localStorage?.setItem?.(key, JSON.stringify(value)); return true; } catch (error) { return false; }
  };

  const inferPurchaseUnit = (ingredient, packageCore) => {
    const explicit = core.normalizeUnit?.(ingredient?.packageUnit);
    if (explicit && core.getUnit?.(explicit)?.group === 'package') return explicit;
    const inferred = core.normalizeUnit?.(
      typeof packageCore?.getDefaultPackageUnit === 'function'
        ? packageCore.getDefaultPackageUnit(ingredient || {})
        : '',
    );
    return inferred && core.getUnit?.(inferred)?.group === 'package' ? inferred : '';
  };

  const migratePreferenceMap = ({ preferences, profiles, ingredients, packageCore } = {}) => {
    const legacy = isRecord(preferences) ? preferences : {};
    const currentProfiles = core.normalizeProfiles?.(profiles) || {};
    const ingredientList = Array.isArray(ingredients) ? ingredients : [];
    const ingredientBySlug = new Map(ingredientList.filter((item) => item?.slug).map((item) => [String(item.slug), item]));
    const result = { ...currentProfiles };
    const migrated = [];
    const skipped = [];

    Object.entries(legacy).forEach(([slug, rawUnit]) => {
      if (!slug || result[slug]) return;
      const unit = core.normalizeUnit?.(rawUnit);
      const definition = core.getUnit?.(unit);
      if (!unit || !definition || definition.group === 'package') {
        skipped.push({ slug, unit: String(rawUnit || '') });
        return;
      }

      if (core.DEFAULT_PROFILES?.[slug]) {
        const base = core.resolveProfile(slug, {});
        const rebased = unit === base.stockUnit
          ? base
          : core.rebaseProfile?.(base, unit);
        if (!rebased) {
          skipped.push({ slug, unit });
          return;
        }
        result[slug] = rebased;
        migrated.push({ slug, unit: rebased.stockUnit });
        return;
      }

      const ingredient = ingredientBySlug.get(slug) || { slug, name: slug, category: '' };
      result[slug] = core.normalizeProfile({
        stockUnit: unit,
        purchaseUnit: inferPurchaseUnit(ingredient, packageCore),
        unitsPerPurchase: 1,
      });
      migrated.push({ slug, unit });
    });

    return { profiles: result, migrated, skipped };
  };

  const migrate = () => {
    try {
      if (global.localStorage?.getItem?.(MIGRATION_KEY) === 'done') return { changed: false, migrated: [], skipped: [] };
    } catch (error) {}
    const preferences = readJson(LEGACY_KEY, {});
    const profiles = readJson(PROFILE_KEY, {});
    const result = migratePreferenceMap({
      preferences,
      profiles,
      ingredients: Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [],
      packageCore: global.BlissfulPantryPackageDefaults || {},
    });
    const before = JSON.stringify(core.normalizeProfiles?.(profiles) || {});
    const after = JSON.stringify(result.profiles);
    if (before !== after) writeJson(PROFILE_KEY, result.profiles);
    try { global.localStorage?.setItem?.(MIGRATION_KEY, 'done'); } catch (error) {}
    if (before !== after) {
      global.dispatchEvent?.(new CustomEvent('blissful-inventory-unit-profile-change', {
        detail: { source: 'legacy-preferences', migrated: result.migrated },
      }));
    }
    return { changed: before !== after, migrated: result.migrated, skipped: result.skipped };
  };

  const api = { LEGACY_KEY, MIGRATION_KEY, inferPurchaseUnit, migratePreferenceMap, migrate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulInventoryLegacyPreferences = Object.assign({}, global.BlissfulInventoryLegacyPreferences || {}, api);
  if (typeof document === 'undefined') return;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', migrate, { once: true });
  else migrate();
})(typeof window !== 'undefined' ? window : globalThis);
