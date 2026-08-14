;(function (global) {
  if (typeof document === 'undefined') return;
  const core = global.BlissfulPantryPackageDefaults || {};
  const KEY = core.UNIT_PREFERENCE_STORAGE_KEY || 'blissful-pantry-unit-preferences';
  const APP_STATE_KEY = 'blissful-app-state';
  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const bySlug = new Map(ingredients.filter((item) => item?.slug).map((item) => [String(item.slug), item]));
  let scheduled = false;

  const clean = (value) => String(value || '').trim();
  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const readJson = (key, fallback) => { try { const raw = global.localStorage?.getItem?.(key); return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; } };
  const writeJson = (key, value) => { try { global.localStorage?.setItem?.(key, JSON.stringify(value)); return true; } catch (error) { return false; } };
  const normalizePreferences = (value) => typeof core.normalizePreferenceMap === 'function' ? core.normalizePreferenceMap(value) : (isRecord(value) ? value : {});
  const getPreferences = () => normalizePreferences(readJson(KEY, {}));
  const setPreference = (slug, unit) => {
    const preferences = getPreferences();
    const key = clean(slug);
    const value = clean(unit);
    if (!key) return preferences;
    if (value) preferences[key] = value;
    else delete preferences[key];
    writeJson(KEY, preferences);
    return preferences;
  };
  const getAppState = () => { const value = readJson(APP_STATE_KEY, {}); return isRecord(value) ? value : {}; };
  const getInventoryEntry = (slug) => {
    const inventory = getAppState().pantryInventory;
    return isRecord(inventory) && isRecord(inventory[slug]) ? inventory[slug] : null;
  };
  const getSlug = (card) => clean(card?.dataset?.pantrySlug || card?.dataset?.shoppingSlug);
  const ingredientFor = (slug) => bySlug.get(slug) || { slug, name: slug, category: '' };
  const defaultFor = (ingredient) => typeof core.getDefaultPackageUnit === 'function' ? core.getDefaultPackageUnit(ingredient) : 'each';
  const resolvedFor = (ingredient, inventoryEntry = null) => typeof core.resolvePantryUnit === 'function'
    ? core.resolvePantryUnit({ ingredient, inventoryEntry, preferences: getPreferences() })
    : clean(getPreferences()[ingredient?.slug]) || clean(inventoryEntry?.unit) || defaultFor(ingredient);

  const ensureSuggestions = () => {
    const list = document.getElementById('pantry-unit-options');
    if (!(list instanceof HTMLDataListElement)) return false;
    const current = new Set(Array.from(list.querySelectorAll('option')).map((option) => clean(option.value)));
    (Array.isArray(core.PACKAGE_UNITS) ? core.PACKAGE_UNITS : []).forEach((unit) => {
      if (current.has(unit)) return;
      const option = document.createElement('option');
      option.value = unit;
      list.appendChild(option);
      current.add(unit);
    });
    return true;
  };

  const enhanceCard = (card) => {
    if (!(card instanceof HTMLElement)) return;
    const slug = getSlug(card);
    const input = card.querySelector('.pantry-card__inline-input--unit');
    if (!slug || !(input instanceof HTMLInputElement)) return;
    const ingredient = ingredientFor(slug);
    const common = defaultFor(ingredient);
    const resolved = resolvedFor(ingredient, getInventoryEntry(slug));
    input.dataset.packageDefaultUnit = common;
    input.placeholder = common;
    input.title = `Unit for ${ingredient.name || slug}. Common package: ${common}. Your last choice is remembered.`;
    if (document.activeElement !== input && clean(input.value) !== resolved) input.value = resolved;
  };
  const enhanceAll = () => {
    ensureSuggestions();
    document.querySelectorAll('#pantry-grid .pantry-card').forEach(enhanceCard);
  };

  const syncThroughCoreInput = (input, unit) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.dataset.packageUnitSync = 'true';
    input.value = clean(unit) || 'each';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    delete input.dataset.packageUnitSync;
  };

  const handleUnitChange = (input) => {
    if (input.dataset.packageUnitSync === 'true') return;
    const card = input.closest('.pantry-card');
    const slug = getSlug(card);
    if (!slug) return;
    const ingredient = ingredientFor(slug);
    const value = clean(input.value);
    const quantity = clean(card?.querySelector?.('.pantry-card__inline-input--quantity')?.value);

    if (value) {
      setPreference(slug, value);
      if (!quantity) {
        syncThroughCoreInput(input, 'each');
        input.value = value;
      }
      schedule();
      return;
    }

    setPreference(slug, '');
    if (quantity) syncThroughCoreInput(input, defaultFor(ingredient));
    schedule();
  };

  const handleQuantityInput = (input) => {
    const card = input.closest('.pantry-card');
    const slug = getSlug(card);
    if (!slug) return;
    const ingredient = ingredientFor(slug);
    const unitInput = card?.querySelector?.('.pantry-card__inline-input--unit');
    const visibleUnit = clean(unitInput?.value) || resolvedFor(ingredient, getInventoryEntry(slug));
    const quantity = clean(input.value);

    if (quantity) {
      if (unitInput instanceof HTMLInputElement) syncThroughCoreInput(unitInput, visibleUnit);
      setPreference(slug, visibleUnit);
    } else if (unitInput instanceof HTMLInputElement) {
      const remembered = clean(getPreferences()[slug]) || visibleUnit || defaultFor(ingredient);
      syncThroughCoreInput(unitInput, 'each');
      unitInput.value = remembered;
    }
    schedule();
  };

  const extendBackupTools = () => {
    const tools = global.BlissfulProductivity;
    if (!tools || tools.__pantryPackageUnitsBackupExtended) return Boolean(tools?.__pantryPackageUnitsBackupExtended);
    if (typeof tools.createBackup !== 'function' || typeof tools.restoreBackup !== 'function') return false;
    const originalCreate = tools.createBackup.bind(tools);
    const originalRestore = tools.restoreBackup.bind(tools);
    tools.createBackup = (storage = global.localStorage) => {
      const backup = originalCreate(storage);
      backup.data = isRecord(backup.data) ? backup.data : {};
      const raw = storage?.getItem?.(KEY);
      if (raw !== null && raw !== undefined) backup.data[KEY] = raw;
      return backup;
    };
    tools.restoreBackup = (backup, storage = global.localStorage) => {
      const raw = backup?.data?.[KEY];
      if (raw !== undefined) {
        if (typeof raw !== 'string') throw new Error(`Backup data for ${KEY} is invalid.`);
        try { normalizePreferences(JSON.parse(raw)); } catch (error) { throw new Error(`Backup data for ${KEY} is invalid.`); }
      }
      const result = originalRestore(backup, storage);
      if (raw !== undefined) storage?.setItem?.(KEY, raw);
      return result;
    };
    tools.__pantryPackageUnitsBackupExtended = true;
    return true;
  };

  const sync = () => { extendBackupTools(); enhanceAll(); };
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => { scheduled = false; sync(); });
  }
  const start = () => {
    sync();
    document.addEventListener('change', (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.classList.contains('pantry-card__inline-input--unit')) handleUnitChange(target);
    });
    document.addEventListener('input', (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.classList.contains('pantry-card__inline-input--quantity')) handleQuantityInput(target);
    });
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    global.addEventListener('storage', (event) => { if ([KEY, APP_STATE_KEY].includes(event.key)) schedule(); });
    let retries = 0;
    const retry = () => {
      retries += 1;
      sync();
      if ((!document.getElementById('pantry-grid') || !document.getElementById('pantry-unit-options')) && retries < 60) global.requestAnimationFrame(retry);
    };
    global.requestAnimationFrame(retry);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
