;(function (global) {
  const APP_STATE_STORAGE_KEY = 'blissful-app-state';
  const SETTINGS_STORAGE_KEY = 'blissful-shopping-settings';
  const PROFILE_STORAGE_KEY = 'blissful-shopping-item-profiles';
  const USAGE_STORAGE_KEY = 'blissful-pantry-usage';
  const USAGE_WINDOW_DAYS = 30;
  const MAX_USAGE_AGE_DAYS = 365;
  const DEFAULT_SETTINGS = Object.freeze({
    frequencyDays: 7,
    groupBy: 'category',
    automaticRestock: true,
  });
  const MANAGED_BACKUP_KEYS = [SETTINGS_STORAGE_KEY, PROFILE_STORAGE_KEY, USAGE_STORAGE_KEY];
  const DAY_MS = 24 * 60 * 60 * 1000;
  const DISCRETE_UNITS = new Set([
    'each', 'ea', 'count', 'ct', 'can', 'cans', 'jar', 'jars', 'bottle', 'bottles',
    'box', 'boxes', 'bag', 'bags', 'pack', 'packs', 'package', 'packages', 'piece', 'pieces',
  ]);

  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const toNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const positiveNumber = (value, fallback = 0) => {
    const number = toNumber(value);
    return number !== null && number > 0 ? number : fallback;
  };
  const normalizeUnit = (value) => String(value || '').trim().toLowerCase();
  const formatNumber = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    if (Math.abs(number - Math.round(number)) < 0.00001) return String(Math.round(number));
    return String(Math.round(number * 100) / 100);
  };
  const pluralizeUnit = (unit, quantity) => {
    const text = String(unit || 'unit').trim() || 'unit';
    if (Math.abs(Number(quantity) - 1) < 0.00001) return text;
    if (/s$/i.test(text)) return text;
    return `${text}s`;
  };

  const normalizeSettings = (value) => {
    const source = isRecord(value) ? value : {};
    const frequency = Math.round(positiveNumber(source.frequencyDays, DEFAULT_SETTINGS.frequencyDays));
    return {
      frequencyDays: Math.max(1, Math.min(365, frequency)),
      groupBy: source.groupBy === 'store' ? 'store' : 'category',
      automaticRestock: source.automaticRestock !== false,
    };
  };

  const normalizeProfiles = (value) => {
    if (!isRecord(value)) return {};
    const result = {};
    Object.entries(value).forEach(([slug, entry]) => {
      if (!slug || !isRecord(entry)) return;
      result[slug] = {
        store: String(entry.store || '').trim(),
        purchaseMode: entry.purchaseMode === 'package' ? 'package' : 'unit',
        packageSize: positiveNumber(entry.packageSize, 1),
      };
    });
    return result;
  };

  const normalizeUsageHistory = (value) => {
    if (!isRecord(value)) return {};
    const result = {};
    Object.entries(value).forEach(([slug, entry]) => {
      if (!slug || !isRecord(entry) || !Array.isArray(entry.events)) return;
      const events = entry.events
        .map((event) => {
          if (!isRecord(event)) return null;
          const amount = positiveNumber(event.amount, 0);
          const at = String(event.at || '').trim();
          const unit = String(event.unit || '').trim();
          if (!amount || !at || Number.isNaN(Date.parse(at))) return null;
          return { at, amount, unit };
        })
        .filter(Boolean)
        .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      if (events.length) result[slug] = { events };
    });
    return result;
  };

  const appendUsageEvent = (
    history,
    { slug, before, after, unit, at = new Date().toISOString(), now = Date.now() } = {},
  ) => {
    const normalized = normalizeUsageHistory(history);
    const beforeNumber = toNumber(before);
    const afterNumber = after === '' || after === null || after === undefined ? 0 : toNumber(after);
    if (!slug || beforeNumber === null || afterNumber === null || beforeNumber <= afterNumber || afterNumber < 0) {
      return normalized;
    }
    const amount = beforeNumber - afterNumber;
    const cutoff = Number(now) - MAX_USAGE_AGE_DAYS * DAY_MS;
    const events = Array.isArray(normalized[slug]?.events) ? normalized[slug].events.slice() : [];
    events.push({ at, amount, unit: String(unit || '').trim() });
    normalized[slug] = {
      events: events.filter((event) => Date.parse(event.at) >= cutoff).slice(-240),
    };
    return normalized;
  };

  const getRecentUsage = (entry, unit, { now = Date.now(), windowDays = USAGE_WINDOW_DAYS } = {}) => {
    if (!entry || !Array.isArray(entry.events)) return 0;
    const normalizedUnit = normalizeUnit(unit);
    const cutoff = Number(now) - Math.max(1, Number(windowDays) || USAGE_WINDOW_DAYS) * DAY_MS;
    return entry.events.reduce((total, event) => {
      if (Date.parse(event.at) < cutoff) return total;
      if (normalizedUnit && normalizeUnit(event.unit) !== normalizedUnit) return total;
      return total + positiveNumber(event.amount, 0);
    }, 0);
  };

  const roundStockTarget = (value, unit) => {
    if (!(value > 0)) return 0;
    if (DISCRETE_UNITS.has(normalizeUnit(unit))) return Math.ceil(value - 1e-9);
    return Math.ceil((value - 1e-9) * 100) / 100;
  };

  const getRecommendedStock = ({ usageEntry, unit, frequencyDays, now = Date.now() } = {}) => {
    const usedInWindow = getRecentUsage(usageEntry, unit, { now, windowDays: USAGE_WINDOW_DAYS });
    if (!(usedInWindow > 0)) return 0;
    const projected = usedInWindow * (Math.max(1, Number(frequencyDays) || 1) / USAGE_WINDOW_DAYS);
    return roundStockTarget(projected, unit);
  };

  const getLatestUsageUnit = (entry) => {
    const events = Array.isArray(entry?.events) ? entry.events : [];
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const unit = String(events[index]?.unit || '').trim();
      if (unit) return unit;
    }
    return 'each';
  };

  const buildRestockRecommendations = ({
    ingredients,
    inventory,
    profiles,
    usageHistory,
    settings,
    now = Date.now(),
  } = {}) => {
    const sourceIngredients = Array.isArray(ingredients) ? ingredients : [];
    const sourceInventory = isRecord(inventory) ? inventory : {};
    const sourceProfiles = normalizeProfiles(profiles);
    const sourceUsage = normalizeUsageHistory(usageHistory);
    const sourceSettings = normalizeSettings(settings);
    if (!sourceSettings.automaticRestock) return [];

    const recommendations = [];
    sourceIngredients.forEach((ingredient) => {
      const slug = String(ingredient?.slug || '').trim();
      if (!slug || !sourceUsage[slug]) return;
      const currentEntry = isRecord(sourceInventory[slug]) ? sourceInventory[slug] : null;
      const unit = String(currentEntry?.unit || getLatestUsageUnit(sourceUsage[slug]) || 'each').trim() || 'each';
      const currentQuantity = Math.max(0, toNumber(currentEntry?.quantity) ?? 0);
      const recommendedQuantity = getRecommendedStock({
        usageEntry: sourceUsage[slug],
        unit,
        frequencyDays: sourceSettings.frequencyDays,
        now,
      });
      if (!(recommendedQuantity > currentQuantity)) return;

      const deficitQuantity = recommendedQuantity - currentQuantity;
      const profile = sourceProfiles[slug] || { store: '', purchaseMode: 'unit', packageSize: 1 };
      let purchaseQuantity = deficitQuantity;
      let purchasePackages = 0;
      if (profile.purchaseMode === 'package') {
        const packageSize = positiveNumber(profile.packageSize, 1);
        purchasePackages = Math.max(1, Math.ceil((deficitQuantity - 1e-9) / packageSize));
        purchaseQuantity = purchasePackages * packageSize;
      } else {
        purchaseQuantity = roundStockTarget(deficitQuantity, unit);
      }

      recommendations.push({
        slug,
        name: String(ingredient?.name || slug),
        category: String(ingredient?.category || 'Other'),
        store: profile.store,
        purchaseMode: profile.purchaseMode,
        packageSize: positiveNumber(profile.packageSize, 1),
        unit,
        currentQuantity,
        recommendedQuantity,
        deficitQuantity,
        purchaseQuantity,
        purchasePackages,
        recipes: [],
        automaticRestock: true,
      });
    });

    return recommendations.sort((a, b) => {
      const storeCompare = String(a.store).localeCompare(String(b.store));
      const categoryCompare = String(a.category).localeCompare(String(b.category));
      return storeCompare || categoryCompare || String(a.name).localeCompare(String(b.name));
    });
  };

  const mergeShoppingItems = (baseItems, recommendations, profiles) => {
    const result = new Map();
    const sourceProfiles = normalizeProfiles(profiles);
    const keyFor = (item) => String(item?.slug || item?.name || '').trim().toLowerCase();
    (Array.isArray(baseItems) ? baseItems : []).forEach((item) => {
      const key = keyFor(item);
      if (!key) return;
      const profile = item.slug ? sourceProfiles[item.slug] : null;
      result.set(key, {
        ...item,
        recipes: Array.isArray(item.recipes) ? item.recipes.slice() : [],
        store: String(item.store || profile?.store || '').trim(),
      });
    });
    (Array.isArray(recommendations) ? recommendations : []).forEach((item) => {
      const key = keyFor(item);
      if (!key) return;
      if (!result.has(key)) {
        result.set(key, { ...item, recipes: [] });
        return;
      }
      const existing = result.get(key);
      result.set(key, {
        ...existing,
        ...item,
        recipes: Array.from(new Set([...(existing.recipes || []), ...(item.recipes || [])])),
      });
    });
    return Array.from(result.values());
  };

  const groupManagedShoppingItems = (items, groupBy = 'category') => {
    const byStore = groupBy === 'store';
    const groups = new Map();
    (Array.isArray(items) ? items : []).forEach((item) => {
      const label = byStore
        ? (String(item?.store || '').trim() || 'Unassigned store')
        : (String(item?.category || '').trim() || 'Other');
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(item);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        if (byStore && a === 'Unassigned store') return 1;
        if (byStore && b === 'Unassigned store') return -1;
        return a.localeCompare(b);
      })
      .map(([label, groupItems]) => ({
        label,
        items: groupItems.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
      }));
  };

  const getPurchaseLabel = (item) => {
    if (!item?.automaticRestock) return '';
    if (item.purchaseMode === 'package') {
      const packages = Math.max(1, Number(item.purchasePackages) || 1);
      const packageSize = positiveNumber(item.packageSize, 1);
      const total = positiveNumber(item.purchaseQuantity, packages * packageSize);
      return `${formatNumber(packages)} × ${formatNumber(packageSize)}-${String(item.unit || 'unit').trim()} pack (${formatNumber(total)} ${pluralizeUnit(item.unit, total)})`;
    }
    const amount = positiveNumber(item.purchaseQuantity, 0);
    return `${formatNumber(amount)} ${pluralizeUnit(item.unit, amount)}`;
  };

  const buildManagedShoppingText = (groups, showReferences = true) => {
    const normalizedGroups = Array.isArray(groups) ? groups : [];
    const itemCount = normalizedGroups.reduce((count, group) => count + (group?.items?.length || 0), 0);
    if (!itemCount) return 'No shopping items right now.';
    const lines = ['Blissful Reverie shopping list'];
    normalizedGroups.forEach((group) => {
      if (!Array.isArray(group?.items) || !group.items.length) return;
      lines.push('', String(group.label || 'Other'));
      group.items.forEach((item) => {
        const parts = [`- ${String(item?.name || '').trim()}`];
        const purchase = getPurchaseLabel(item);
        if (purchase) parts.push(`buy ${purchase}`);
        if (item?.automaticRestock) {
          parts.push(`have ${formatNumber(item.currentQuantity)} / target ${formatNumber(item.recommendedQuantity)} ${pluralizeUnit(item.unit, item.recommendedQuantity)}`);
        }
        const store = String(item?.store || '').trim();
        if (store && String(group.label || '') !== store) parts.push(store);
        const recipes = Array.isArray(item?.recipes) ? item.recipes.filter(Boolean) : [];
        if (showReferences && recipes.length) parts.push(`for ${recipes.slice(0, 3).join(', ')}`);
        lines.push(parts.join(' — '));
      });
    });
    return lines.join('\n');
  };

  const api = {
    SETTINGS_STORAGE_KEY,
    PROFILE_STORAGE_KEY,
    USAGE_STORAGE_KEY,
    USAGE_WINDOW_DAYS,
    normalizeSettings,
    normalizeProfiles,
    normalizeUsageHistory,
    appendUsageEvent,
    getRecentUsage,
    getRecommendedStock,
    buildRestockRecommendations,
    mergeShoppingItems,
    groupManagedShoppingItems,
    getPurchaseLabel,
    buildManagedShoppingText,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.BlissfulShopping = Object.assign({}, global.BlissfulShopping || {}, api);
  if (typeof document === 'undefined') return;

  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const ingredientBySlug = new Map(ingredients.filter(Boolean).map((ingredient) => [ingredient.slug, ingredient]));
  const ingredientByName = new Map(
    ingredients
      .filter((ingredient) => ingredient?.name)
      .map((ingredient) => [String(ingredient.name).trim().toLowerCase(), ingredient]),
  );
  const baseItemsByPanel = new WeakMap();
  const copyTimers = new WeakMap();

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
  const getAppState = () => {
    const value = readJson(APP_STATE_STORAGE_KEY, {});
    return isRecord(value) ? value : {};
  };
  const getInventory = () => {
    const inventory = getAppState().pantryInventory;
    return isRecord(inventory) ? inventory : {};
  };
  const getSettings = () => normalizeSettings(readJson(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS));
  const setSettings = (settings) => writeJson(SETTINGS_STORAGE_KEY, normalizeSettings(settings));
  const getProfiles = () => normalizeProfiles(readJson(PROFILE_STORAGE_KEY, {}));
  const setProfiles = (profiles) => writeJson(PROFILE_STORAGE_KEY, normalizeProfiles(profiles));
  const getUsageHistory = () => normalizeUsageHistory(readJson(USAGE_STORAGE_KEY, {}));
  const setUsageHistory = (history) => writeJson(USAGE_STORAGE_KEY, normalizeUsageHistory(history));

  const getRecommendations = () => buildRestockRecommendations({
    ingredients,
    inventory: getInventory(),
    profiles: getProfiles(),
    usageHistory: getUsageHistory(),
    settings: getSettings(),
  });

  const getIngredientForCard = (card) => {
    if (!(card instanceof HTMLElement)) return null;
    const slug = String(card.dataset.shoppingSlug || '').trim();
    if (slug && ingredientBySlug.has(slug)) return ingredientBySlug.get(slug);
    const name = card.querySelector('.pantry-card__name')?.textContent?.trim().toLowerCase();
    const ingredient = name ? ingredientByName.get(name) : null;
    if (ingredient?.slug) card.dataset.shoppingSlug = ingredient.slug;
    return ingredient || null;
  };

  const renderShoppingSettings = () => {
    const toolbar = document.getElementById('theme-toolbar');
    if (!toolbar) return false;
    let details = document.getElementById('productivity-settings-shopping');
    if (details) return true;

    details = document.createElement('details');
    details.className = 'shopping-management-settings';
    details.id = 'productivity-settings-shopping';
    const summary = document.createElement('summary');
    summary.className = 'shopping-management-settings__summary';
    summary.textContent = 'Shopping';
    details.appendChild(summary);
    const body = document.createElement('div');
    body.className = 'shopping-management-settings__body';

    const cadenceLabel = document.createElement('label');
    cadenceLabel.className = 'shopping-management-settings__field';
    const cadenceText = document.createElement('span');
    cadenceText.textContent = 'Shopping frequency';
    const cadence = document.createElement('select');
    cadence.className = 'shopping-management-settings__select';
    cadence.innerHTML = '<option value="7">Weekly</option><option value="14">Every 2 weeks</option><option value="30">Monthly</option><option value="custom">Custom</option>';
    cadenceLabel.append(cadenceText, cadence);

    const customLabel = document.createElement('label');
    customLabel.className = 'shopping-management-settings__field shopping-management-settings__custom';
    const customText = document.createElement('span');
    customText.textContent = 'Custom cycle (days)';
    const custom = document.createElement('input');
    custom.type = 'number';
    custom.min = '1';
    custom.max = '365';
    custom.step = '1';
    custom.className = 'shopping-management-settings__input';
    customLabel.append(customText, custom);

    const groupingLabel = document.createElement('label');
    groupingLabel.className = 'shopping-management-settings__field';
    const groupingText = document.createElement('span');
    groupingText.textContent = 'Group shopping list by';
    const grouping = document.createElement('select');
    grouping.className = 'shopping-management-settings__select';
    grouping.innerHTML = '<option value="category">Category</option><option value="store">Store</option>';
    groupingLabel.append(groupingText, grouping);

    const automaticLabel = document.createElement('label');
    automaticLabel.className = 'shopping-management-settings__check';
    const automatic = document.createElement('input');
    automatic.type = 'checkbox';
    const automaticText = document.createElement('span');
    automaticText.textContent = 'Automatically add items below recommended stock';
    automaticLabel.append(automatic, automaticText);

    const note = document.createElement('p');
    note.className = 'shopping-management-settings__note';
    note.textContent = `Recommended stock uses the last ${USAGE_WINDOW_DAYS} days of recorded pantry usage and projects it to your shopping cycle.`;
    body.append(cadenceLabel, customLabel, groupingLabel, automaticLabel, note);
    details.appendChild(body);

    const backup = document.getElementById('productivity-settings-backup');
    toolbar.insertBefore(details, backup || null);

    const applyValues = () => {
      const settings = getSettings();
      const preset = [7, 14, 30].includes(settings.frequencyDays) ? String(settings.frequencyDays) : 'custom';
      cadence.value = preset;
      custom.value = String(settings.frequencyDays);
      customLabel.hidden = preset !== 'custom';
      grouping.value = settings.groupBy;
      automatic.checked = settings.automaticRestock;
    };
    const save = () => {
      const current = getSettings();
      const frequencyDays = cadence.value === 'custom'
        ? Math.max(1, Math.min(365, Math.round(positiveNumber(custom.value, current.frequencyDays))))
        : Number(cadence.value);
      setSettings({ ...current, frequencyDays, groupBy: grouping.value, automaticRestock: automatic.checked });
      applyValues();
      refreshAll();
    };
    cadence.addEventListener('change', save);
    custom.addEventListener('change', save);
    grouping.addEventListener('change', save);
    automatic.addEventListener('change', save);
    applyValues();
    return true;
  };

  const getRecommendationForSlug = (slug) => getRecommendations().find((item) => item.slug === slug) || null;

  const updateProfileRecommendation = (card, slug) => {
    const status = card.querySelector('.shopping-item-profile__recommendation');
    if (!status) return;
    const settings = getSettings();
    const usage = getUsageHistory()[slug];
    const inventory = getInventory()[slug];
    const unit = String(inventory?.unit || getLatestUsageUnit(usage) || 'each').trim() || 'each';
    const target = getRecommendedStock({ usageEntry: usage, unit, frequencyDays: settings.frequencyDays });
    const recommendation = getRecommendationForSlug(slug);
    if (!(target > 0)) {
      status.textContent = 'Recommended stock starts after you record pantry usage.';
      return;
    }
    if (recommendation) {
      status.textContent = `Recommended ${formatNumber(target)} ${pluralizeUnit(unit, target)} per ${settings.frequencyDays}-day cycle · buy ${getPurchaseLabel(recommendation)} now.`;
      return;
    }
    status.textContent = `Recommended ${formatNumber(target)} ${pluralizeUnit(unit, target)} per ${settings.frequencyDays}-day cycle · currently covered.`;
  };

  const enhancePantryCard = (card) => {
    if (!(card instanceof HTMLElement) || card.dataset.shoppingProfileBound === 'true') return;
    const ingredient = getIngredientForCard(card);
    if (!ingredient?.slug) return;
    card.dataset.shoppingProfileBound = 'true';

    const details = document.createElement('details');
    details.className = 'shopping-item-profile';
    const summary = document.createElement('summary');
    summary.className = 'shopping-item-profile__summary';
    summary.textContent = 'Shopping';
    details.appendChild(summary);
    const body = document.createElement('div');
    body.className = 'shopping-item-profile__body';

    const storeLabel = document.createElement('label');
    storeLabel.className = 'shopping-item-profile__field';
    storeLabel.innerHTML = '<span>Store</span>';
    const store = document.createElement('input');
    store.type = 'text';
    store.placeholder = 'e.g. Costco';
    store.autocomplete = 'off';
    store.className = 'shopping-item-profile__input';
    storeLabel.appendChild(store);

    const recommendation = document.createElement('p');
    recommendation.className = 'shopping-item-profile__recommendation';
    body.append(storeLabel, recommendation);
    details.appendChild(body);
    card.appendChild(details);

    const load = () => {
      const profile = getProfiles()[ingredient.slug] || { store: '', purchaseMode: 'unit', packageSize: 1 };
      store.value = profile.store;
      updateProfileRecommendation(card, ingredient.slug);
    };
    const save = () => {
      const profiles = getProfiles();
      profiles[ingredient.slug] = {
        ...(isRecord(profiles[ingredient.slug]) ? profiles[ingredient.slug] : {}),
        store: store.value.trim(),
      };
      setProfiles(profiles);
      load();
      refreshShoppingPanels();
    };
    store.addEventListener('change', save);
    load();
  };

  const getRecipesFromNote = (note) => {
    const title = String(note?.getAttribute?.('title') || '').trim();
    if (title) return title.split(',').map((name) => name.trim()).filter(Boolean);
    const text = String(note?.textContent || '').replace(/^For\s+/i, '').replace(/\s+\+\d+$/, '').trim();
    return text ? text.split(',').map((name) => name.trim()).filter(Boolean) : [];
  };

  const extractBaseItems = (panel) => {
    const profiles = getProfiles();
    const items = [];
    panel.querySelectorAll('.productivity-shopping__category').forEach((category) => {
      const categoryLabel = category.querySelector('.productivity-shopping__category-title')?.textContent?.trim() || 'Other';
      category.querySelectorAll('.productivity-shopping__item').forEach((row) => {
        if (row.dataset.shoppingRestockOnly === 'true') return;
        const name = row.querySelector('.productivity-shopping__item-name')?.textContent?.trim() || '';
        if (!name) return;
        const ingredient = ingredientByName.get(name.toLowerCase()) || null;
        const profile = ingredient?.slug ? profiles[ingredient.slug] : null;
        items.push({
          slug: ingredient?.slug || '',
          name,
          category: ingredient?.category || categoryLabel,
          store: profile?.store || '',
          recipes: getRecipesFromNote(row.querySelector('.productivity-shopping__item-note')),
          automaticRestock: false,
        });
      });
    });
    return items;
  };

  const ensureGroupingControl = (panel) => {
    let fieldset = panel.querySelector('.shopping-management__grouping');
    if (!fieldset) {
      fieldset = document.createElement('fieldset');
      fieldset.className = 'productivity-shopping__source-control shopping-management__grouping';
      const legend = document.createElement('legend');
      legend.className = 'productivity-shopping__source-legend';
      legend.textContent = 'Group list';
      fieldset.appendChild(legend);
      const groupName = `shopping-group-${Math.random().toString(36).slice(2)}`;
      [
        { value: 'category', label: 'Category' },
        { value: 'store', label: 'Store' },
      ].forEach((option) => {
        const label = document.createElement('label');
        label.className = 'productivity-shopping__source-option shopping-management__group-option';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = groupName;
        input.value = option.value;
        const text = document.createElement('span');
        text.className = 'productivity-shopping__source-text';
        const name = document.createElement('span');
        name.className = 'productivity-shopping__source-name';
        name.textContent = option.label;
        text.appendChild(name);
        label.append(input, text);
        input.addEventListener('change', () => {
          if (!input.checked) return;
          setSettings({ ...getSettings(), groupBy: option.value });
          refreshAll();
        });
        fieldset.appendChild(label);
      });
      const reference = panel.querySelector('.productivity-shopping__reference-control');
      const source = panel.querySelector('.productivity-shopping__source-control:not(.productivity-shopping__reference-control):not(.shopping-management__grouping)');
      if (reference) reference.insertAdjacentElement('afterend', fieldset);
      else if (source) source.insertAdjacentElement('afterend', fieldset);
      else panel.appendChild(fieldset);
    }
    const settings = getSettings();
    fieldset.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.checked = input.value === settings.groupBy;
      input.closest('.productivity-shopping__source-option')?.classList.toggle('productivity-shopping__source-option--active', input.checked);
    });
    return fieldset;
  };

  const renderManagedList = (panel, items) => {
    const settings = getSettings();
    const groups = groupManagedShoppingItems(items, settings.groupBy);
    panel.querySelector('.productivity-shopping__empty')?.remove();
    let grid = panel.querySelector('.productivity-shopping__categories');
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'productivity-shopping__categories';
      panel.appendChild(grid);
    }
    grid.innerHTML = '';
    if (!groups.length) {
      const empty = document.createElement('p');
      empty.className = 'productivity-shopping__empty';
      empty.textContent = 'No shopping items right now.';
      panel.appendChild(empty);
      return;
    }

    groups.forEach((group) => {
      const category = document.createElement('section');
      category.className = 'productivity-shopping__category';
      const title = document.createElement('h4');
      title.className = 'productivity-shopping__category-title';
      title.textContent = group.label;
      category.appendChild(title);
      const list = document.createElement('ul');
      list.className = 'productivity-shopping__list';
      group.items.forEach((item) => {
        const row = document.createElement('li');
        row.className = 'productivity-shopping__item shopping-management__item';
        if (item.slug) row.dataset.shoppingSlug = item.slug;
        row.dataset.shoppingRestockOnly = item.automaticRestock && !(item.recipes?.length) ? 'true' : 'false';
        const name = document.createElement('span');
        name.className = 'productivity-shopping__item-name';
        name.textContent = item.name;
        row.appendChild(name);
        const recipes = Array.isArray(item.recipes) ? item.recipes : [];
        const note = document.createElement('span');
        note.className = 'productivity-shopping__item-note';
        if (recipes.length) {
          note.textContent = `For ${recipes.slice(0, 2).join(', ')}${recipes.length > 2 ? ` +${recipes.length - 2}` : ''}`;
          note.title = recipes.join(', ');
        }
        note.hidden = panel.dataset.recipeReferences === 'hidden';
        row.appendChild(note);
        if (item.automaticRestock) {
          const purchase = document.createElement('span');
          purchase.className = 'shopping-management__purchase';
          purchase.textContent = `Buy ${getPurchaseLabel(item)} · have ${formatNumber(item.currentQuantity)} · target ${formatNumber(item.recommendedQuantity)} ${pluralizeUnit(item.unit, item.recommendedQuantity)}`;
          row.appendChild(purchase);
        }
        const store = String(item.store || '').trim();
        if (store && settings.groupBy !== 'store') {
          const storeNote = document.createElement('span');
          storeNote.className = 'shopping-management__store';
          storeNote.textContent = store;
          row.appendChild(storeNote);
        }
        list.appendChild(row);
      });
      category.appendChild(list);
      grid.appendChild(category);
    });
  };

  const getManagedItems = (panel) => {
    if (!baseItemsByPanel.has(panel)) baseItemsByPanel.set(panel, extractBaseItems(panel));
    return mergeShoppingItems(baseItemsByPanel.get(panel), getRecommendations(), getProfiles());
  };

  const copyText = async (text) => {
    try {
      if (!global.navigator?.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await global.navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      let copied = false;
      try { copied = Boolean(document.execCommand('copy')); } catch (fallbackError) { copied = false; }
      textarea.remove();
      return copied;
    }
  };

  const setCopyFeedback = (button, status, success) => {
    button.textContent = success ? 'Copied' : 'Copy failed';
    if (status) {
      status.textContent = success ? 'Shopping list copied.' : 'Copy failed. Select the list manually.';
      status.dataset.state = success ? 'success' : 'error';
    }
    const existing = copyTimers.get(button);
    if (existing) global.clearTimeout(existing);
    copyTimers.set(button, global.setTimeout(() => {
      button.textContent = 'Copy list';
      if (status) {
        status.textContent = '';
        status.dataset.state = 'idle';
      }
      copyTimers.delete(button);
    }, 2200));
  };

  const bindManagedCopy = (panel) => {
    if (panel.dataset.shoppingManagedCopyBound === 'true') return;
    panel.dataset.shoppingManagedCopyBound = 'true';
    panel.addEventListener('click', async (event) => {
      const button = event.target instanceof Element ? event.target.closest('.productivity-shopping__copy') : null;
      if (!(button instanceof HTMLButtonElement) || !panel.contains(button)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const items = getManagedItems(panel);
      if (!items.length) return;
      const groups = groupManagedShoppingItems(items, getSettings().groupBy);
      const showReferences = panel.dataset.recipeReferences !== 'hidden';
      const copied = await copyText(buildManagedShoppingText(groups, showReferences));
      setCopyFeedback(button, panel.querySelector('.productivity-shopping__copy-status'), copied);
    }, true);
  };

  const enhanceShoppingPanel = (panel) => {
    if (!(panel instanceof HTMLElement)) return;
    const items = getManagedItems(panel);
    const recommendations = items.filter((item) => item.automaticRestock);
    ensureGroupingControl(panel);
    renderManagedList(panel, items);
    bindManagedCopy(panel);
    const copyButton = panel.querySelector('.productivity-shopping__copy');
    if (copyButton instanceof HTMLButtonElement) copyButton.disabled = !items.length;
    let summary = panel.querySelector('.shopping-management__summary');
    if (!summary) {
      summary = document.createElement('p');
      summary.className = 'shopping-management__summary';
      const modeNote = panel.querySelector('.productivity-shopping__mode-note');
      if (modeNote) modeNote.insertAdjacentElement('afterend', summary);
      else panel.querySelector('.productivity-shopping__header-text')?.appendChild(summary);
    }
    const settings = getSettings();
    summary.textContent = recommendations.length
      ? `${recommendations.length} automatic restock recommendation${recommendations.length === 1 ? '' : 's'} for a ${settings.frequencyDays}-day shopping cycle.`
      : `No usage-based restocks due for the ${settings.frequencyDays}-day shopping cycle.`;
  };

  function refreshShoppingPanels() {
    document.querySelectorAll('.productivity-shopping').forEach(enhanceShoppingPanel);
  }

  const refreshProfileRecommendations = () => {
    document.querySelectorAll('.pantry-card[data-shopping-slug]').forEach((card) => {
      updateProfileRecommendation(card, card.dataset.shoppingSlug);
    });
  };

  function refreshAll() {
    renderShoppingSettings();
    document.querySelectorAll('.pantry-card').forEach(enhancePantryCard);
    refreshProfileRecommendations();
    refreshShoppingPanels();
  }

  const getQuantityContext = (input) => {
    if (!(input instanceof HTMLInputElement)) return null;
    if (input.classList.contains('pantry-card__inline-input--quantity')) {
      const card = input.closest('.pantry-card');
      const ingredient = getIngredientForCard(card);
      if (!ingredient?.slug) return null;
      const unit = card?.querySelector('.pantry-card__inline-input--unit')?.value
        || getInventory()[ingredient.slug]?.unit
        || 'each';
      return { slug: ingredient.slug, unit: String(unit || 'each').trim() || 'each' };
    }
    if (input.classList.contains('restock-wizard__quantity')) {
      const row = input.closest('.restock-wizard__item');
      const slug = String(row?.dataset.slug || '').trim();
      if (!slug) return null;
      const unit = row?.querySelector('.restock-wizard__unit')?.value || getInventory()[slug]?.unit || 'each';
      return { slug, unit: String(unit || 'each').trim() || 'each' };
    }
    return null;
  };

  const bindUsageCapture = () => {
    if (document.documentElement.dataset.shoppingUsageBound === 'true') return;
    document.documentElement.dataset.shoppingUsageBound = 'true';
    document.addEventListener('focusin', (event) => {
      const input = event.target;
      const context = getQuantityContext(input);
      if (!context) return;
      input.dataset.shoppingUsageBefore = input.value;
      input.dataset.shoppingUsageUnit = context.unit;
    });
    document.addEventListener('change', (event) => {
      const input = event.target;
      const context = getQuantityContext(input);
      if (!context) return;
      const before = input.dataset.shoppingUsageBefore;
      const beforeUnit = String(input.dataset.shoppingUsageUnit || context.unit).trim();
      if (normalizeUnit(beforeUnit) !== normalizeUnit(context.unit)) {
        input.dataset.shoppingUsageBefore = input.value;
        input.dataset.shoppingUsageUnit = context.unit;
        return;
      }
      const currentHistory = getUsageHistory();
      const updated = appendUsageEvent(currentHistory, {
        slug: context.slug,
        before,
        after: input.value,
        unit: context.unit,
      });
      if (JSON.stringify(updated) !== JSON.stringify(currentHistory)) {
        setUsageHistory(updated);
        global.setTimeout(refreshAll, 0);
      }
      input.dataset.shoppingUsageBefore = input.value;
      input.dataset.shoppingUsageUnit = context.unit;
    });
  };

  const extendBackupTools = () => {
    const registry = global.BlissfulPersistenceRegistry?.registry;
    return MANAGED_BACKUP_KEYS.every((key) => registry?.has?.(key));
  };

  const enhanceWithin = (root) => {
    if (root instanceof Element) {
      if (root.matches('.pantry-card')) enhancePantryCard(root);
      if (root.matches('.productivity-shopping')) enhanceShoppingPanel(root);
    }
    root.querySelectorAll?.('.pantry-card').forEach(enhancePantryCard);
    root.querySelectorAll?.('.productivity-shopping').forEach(enhanceShoppingPanel);
  };

  const start = () => {
    renderShoppingSettings();
    extendBackupTools();
    bindUsageCapture();
    enhanceWithin(document);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) enhanceWithin(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    global.addEventListener('storage', (event) => {
      if ([SETTINGS_STORAGE_KEY, PROFILE_STORAGE_KEY, USAGE_STORAGE_KEY, APP_STATE_STORAGE_KEY].includes(event.key)) {
        refreshAll();
      }
    });
    let retries = 0;
    const retry = () => {
      retries += 1;
      renderShoppingSettings();
      extendBackupTools();
      refreshAll();
      if ((!document.getElementById('theme-toolbar') || !global.BlissfulProductivityUI) && retries < 30) {
        global.requestAnimationFrame(retry);
      }
    };
    global.requestAnimationFrame(retry);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
