;(function (global) {
  const VIEW_SETTINGS_STORAGE_KEY = 'blissful-pantry-view-settings';
  const APP_STATE_STORAGE_KEY = 'blissful-app-state';
  const USAGE_STORAGE_KEY = 'blissful-pantry-usage';
  const SHOPPING_SETTINGS_STORAGE_KEY = 'blissful-shopping-settings';
  const DEFAULT_SETTINGS = Object.freeze({
    cardFlow: 'vertical',
    tagDefault: 'collapsed',
    sortBy: 'alphabetical',
    stockFilter: 'all',
  });
  const MANAGED_BACKUP_KEYS = [VIEW_SETTINGS_STORAGE_KEY];
  const DAY_MS = 24 * 60 * 60 * 1000;
  const FREQUENT_WINDOW_DAYS = 90;

  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const toNumber = (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  const normalizeSettings = (value) => {
    const source = isRecord(value) ? value : {};
    return {
      cardFlow: source.cardFlow === 'horizontal' ? 'horizontal' : 'vertical',
      tagDefault: ['expanded', 'collapsed', 'hidden'].includes(source.tagDefault)
        ? source.tagDefault
        : DEFAULT_SETTINGS.tagDefault,
      sortBy: ['alphabetical', 'frequent', 'commonality'].includes(source.sortBy)
        ? source.sortBy
        : DEFAULT_SETTINGS.sortBy,
      stockFilter: ['all', 'in', 'low', 'out'].includes(source.stockFilter)
        ? source.stockFilter
        : DEFAULT_SETTINGS.stockFilter,
    };
  };

  const classifyStockState = ({ quantity, recommendedStock } = {}) => {
    const current = Math.max(0, toNumber(quantity));
    const target = Math.max(0, toNumber(recommendedStock));
    if (!(current > 0)) return 'out';
    if (target > current) return 'low';
    return 'in';
  };

  const getUsageFrequency = (entry, { now = Date.now(), windowDays = FREQUENT_WINDOW_DAYS } = {}) => {
    const events = Array.isArray(entry?.events) ? entry.events : [];
    const cutoff = Number(now) - Math.max(1, Number(windowDays) || FREQUENT_WINDOW_DAYS) * DAY_MS;
    let count = 0;
    let latest = 0;
    events.forEach((event) => {
      const timestamp = Date.parse(event?.at || '');
      if (!Number.isFinite(timestamp) || timestamp < cutoff) return;
      count += 1;
      latest = Math.max(latest, timestamp);
    });
    return { count, latest };
  };

  const buildTagPopularity = (ingredients) => {
    const counts = {};
    (Array.isArray(ingredients) ? ingredients : []).forEach((ingredient) => {
      const seen = new Set();
      (Array.isArray(ingredient?.tags) ? ingredient.tags : []).forEach((tag) => {
        const normalized = String(tag || '').trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        counts[normalized] = (counts[normalized] || 0) + 1;
      });
    });
    return counts;
  };

  const sortTagsByPopularity = (tags, popularity = {}) => (
    (Array.isArray(tags) ? tags : [])
      .map((tag) => String(tag || '').trim())
      .filter(Boolean)
      .sort((a, b) => (Number(popularity[b]) || 0) - (Number(popularity[a]) || 0) || a.localeCompare(b))
  );

  const buildCommonalityCounts = (recipeIngredientMatches) => {
    const counts = {};
    if (!(recipeIngredientMatches instanceof Map)) return counts;
    recipeIngredientMatches.forEach((matchedSlugs) => {
      if (!(matchedSlugs instanceof Set)) return;
      matchedSlugs.forEach((slug) => {
        const key = String(slug || '').trim();
        if (key) counts[key] = (counts[key] || 0) + 1;
      });
    });
    return counts;
  };

  const comparePantryItems = (a, b, sortBy = 'alphabetical') => {
    if (sortBy === 'frequent') {
      const frequency = (Number(b?.usageCount) || 0) - (Number(a?.usageCount) || 0);
      if (frequency) return frequency;
      const recent = (Number(b?.lastUsedAt) || 0) - (Number(a?.lastUsedAt) || 0);
      if (recent) return recent;
    }
    if (sortBy === 'commonality') {
      const commonality = (Number(b?.commonality) || 0) - (Number(a?.commonality) || 0);
      if (commonality) return commonality;
    }
    return String(a?.name || '').localeCompare(String(b?.name || ''));
  };

  const filterPantryItems = (items, stockFilter = 'all') => {
    const list = Array.isArray(items) ? items : [];
    if (stockFilter === 'all') return list.slice();
    return list.filter((item) => item?.stockState === stockFilter);
  };

  const api = {
    VIEW_SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
    normalizeSettings,
    classifyStockState,
    getUsageFrequency,
    buildTagPopularity,
    sortTagsByPopularity,
    buildCommonalityCounts,
    comparePantryItems,
    filterPantryItems,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulPantryView = Object.assign({}, global.BlissfulPantryView || {}, api);
  if (typeof document === 'undefined') return;

  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const recipes = Array.isArray(global.BLISSFUL_RECIPES) ? global.BLISSFUL_RECIPES : [];
  const ingredientByName = new Map(
    ingredients.filter((ingredient) => ingredient?.name).map((ingredient) => [String(ingredient.name).trim().toLowerCase(), ingredient]),
  );
  const ingredientBySlug = new Map(ingredients.filter((ingredient) => ingredient?.slug).map((ingredient) => [ingredient.slug, ingredient]));
  const tagPopularity = buildTagPopularity(ingredients);
  let commonalityCounts = {};
  let tagOverride = null;
  let scheduled = false;

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
  const getSettings = () => normalizeSettings(readJson(VIEW_SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS));
  const setSettings = (settings) => writeJson(VIEW_SETTINGS_STORAGE_KEY, normalizeSettings(settings));
  const getAppState = () => {
    const state = readJson(APP_STATE_STORAGE_KEY, {});
    return isRecord(state) ? state : {};
  };
  const getUsageHistory = () => {
    const raw = readJson(USAGE_STORAGE_KEY, {});
    const shopping = global.BlissfulShopping;
    return typeof shopping?.normalizeUsageHistory === 'function' ? shopping.normalizeUsageHistory(raw) : (isRecord(raw) ? raw : {});
  };
  const getShoppingSettings = () => {
    const raw = readJson(SHOPPING_SETTINGS_STORAGE_KEY, {});
    const shopping = global.BlissfulShopping;
    return typeof shopping?.normalizeSettings === 'function'
      ? shopping.normalizeSettings(raw)
      : { frequencyDays: Math.max(1, Number(raw?.frequencyDays) || 7) };
  };

  const calculateCommonality = () => {
    const matching = global.BlissfulMatching || {};
    if (typeof matching.createIngredientMatcherIndex !== 'function' || typeof matching.mapRecipesToIngredientMatches !== 'function') {
      commonalityCounts = {};
      return;
    }
    try {
      const index = matching.createIngredientMatcherIndex(ingredients);
      const mapped = matching.mapRecipesToIngredientMatches(recipes, index);
      commonalityCounts = buildCommonalityCounts(mapped?.recipeIngredientMatches);
    } catch (error) {
      commonalityCounts = {};
    }
  };

  const getIngredientForCard = (card) => {
    if (!(card instanceof HTMLElement)) return null;
    const existingSlug = String(card.dataset.pantrySlug || card.dataset.shoppingSlug || '').trim();
    if (existingSlug) {
      const direct = ingredientBySlug.get(existingSlug);
      if (direct) return direct;
    }
    const name = card.querySelector('.pantry-card__name')?.textContent?.trim().toLowerCase();
    const ingredient = name ? ingredientByName.get(name) : null;
    if (ingredient?.slug) card.dataset.pantrySlug = ingredient.slug;
    return ingredient || null;
  };

  const getLatestUsageUnit = (entry) => {
    const events = Array.isArray(entry?.events) ? entry.events : [];
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const unit = String(events[index]?.unit || '').trim();
      if (unit) return unit;
    }
    return 'each';
  };

  const getRecommendedStock = (slug, inventoryEntry, usageEntry) => {
    const shopping = global.BlissfulShopping || {};
    if (typeof shopping.getRecommendedStock !== 'function') return 0;
    const unit = String(inventoryEntry?.unit || getLatestUsageUnit(usageEntry) || 'each').trim() || 'each';
    const settings = getShoppingSettings();
    return shopping.getRecommendedStock({
      usageEntry,
      unit,
      frequencyDays: settings.frequencyDays,
    });
  };

  const getCardRecord = (card) => {
    const ingredient = getIngredientForCard(card);
    if (!ingredient?.slug) return null;
    const state = getAppState();
    const inventory = isRecord(state.pantryInventory) ? state.pantryInventory : {};
    const usage = getUsageHistory();
    const inventoryEntry = isRecord(inventory[ingredient.slug]) ? inventory[ingredient.slug] : null;
    const quantity = inventoryEntry?.quantity ?? card.querySelector('.pantry-card__inline-input--quantity')?.value ?? '';
    const recommendedStock = getRecommendedStock(ingredient.slug, inventoryEntry, usage[ingredient.slug]);
    const usageFrequency = getUsageFrequency(usage[ingredient.slug]);
    return {
      card,
      slug: ingredient.slug,
      name: String(ingredient.name || ingredient.slug),
      stockState: classifyStockState({ quantity, recommendedStock }),
      usageCount: usageFrequency.count,
      lastUsedAt: usageFrequency.latest,
      commonality: Number(commonalityCounts[ingredient.slug]) || 0,
    };
  };

  const ensurePageActionBar = () => {
    const row = document.querySelector('#recipes-page .topbar__row');
    if (!row) return null;
    let bar = document.getElementById('page-action-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'page-action-bar';
      bar.className = 'page-action-bar';
      bar.setAttribute('role', 'group');
      bar.setAttribute('aria-label', 'Page actions');
      const primaryNav = document.getElementById('primary-nav');
      if (primaryNav?.nextSibling) row.insertBefore(bar, primaryNav.nextSibling);
      else row.appendChild(bar);
    }
    let tagButton = document.getElementById('pantry-tags-action');
    if (!tagButton) {
      tagButton = document.createElement('button');
      tagButton.type = 'button';
      tagButton.id = 'pantry-tags-action';
      tagButton.className = 'page-action-bar__button page-action-bar__button--icon';
      tagButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13.2 13.2 20a2 2 0 0 1-2.8 0L4 13.6V4h9.6L20 10.4a2 2 0 0 1 0 2.8Z"></path><circle cx="8.5" cy="8.5" r="1.4"></circle></svg>';
      tagButton.addEventListener('click', () => {
        const settings = getSettings();
        const currentlyExpanded = tagOverride === 'expanded' || (tagOverride === null && settings.tagDefault === 'expanded');
        tagOverride = currentlyExpanded ? 'hidden' : 'expanded';
        applyPantryPresentation();
      });
      bar.appendChild(tagButton);
    }
    return bar;
  };

  const syncPageActionBar = () => {
    const bar = ensurePageActionBar();
    if (!bar) return;
    const pantry = document.getElementById('pantry-view');
    const pantryActive = pantry instanceof HTMLElement && !pantry.hidden;
    bar.hidden = !pantryActive;
    if (!pantryActive) return;

    const restock = document.getElementById('pantry-restock-button');
    if (restock instanceof HTMLButtonElement && restock.parentElement !== bar) {
      restock.classList.add('page-action-bar__button');
      restock.classList.remove('restock-launch--pantry');
      bar.insertBefore(restock, bar.firstChild || null);
    }
    const tagButton = document.getElementById('pantry-tags-action');
    if (tagButton instanceof HTMLButtonElement) {
      const settings = getSettings();
      const expanded = tagOverride === 'expanded' || (tagOverride === null && settings.tagDefault === 'expanded');
      tagButton.setAttribute('aria-pressed', expanded ? 'true' : 'false');
      tagButton.setAttribute('aria-label', expanded ? 'Hide pantry item tags' : 'Show pantry item tags');
      tagButton.title = expanded ? 'Hide pantry item tags' : 'Show pantry item tags';
    }
  };

  const ensureResultCount = () => {
    const searchGroup = document.querySelector('#filter-panel .input-group--search');
    if (!searchGroup) return null;
    let count = document.getElementById('pantry-result-count');
    if (!count) {
      count = document.createElement('p');
      count.id = 'pantry-result-count';
      count.className = 'pantry-result-count';
      count.setAttribute('aria-live', 'polite');
      searchGroup.insertAdjacentElement('afterend', count);
    }
    return count;
  };

  const ensureSortFilterControls = () => {
    const filterPanel = document.getElementById('filter-panel');
    const ingredientSection = document.getElementById('ingredient-section');
    if (!filterPanel || !ingredientSection) return null;
    let controls = document.getElementById('pantry-sort-filter');
    if (!controls) {
      controls = document.createElement('section');
      controls.id = 'pantry-sort-filter';
      controls.className = 'pantry-sort-filter';
      controls.setAttribute('aria-label', 'Pantry sort and stock filters');

      const sortLabel = document.createElement('label');
      sortLabel.className = 'pantry-sort-filter__sort';
      const sortText = document.createElement('span');
      sortText.textContent = 'Sort';
      const select = document.createElement('select');
      select.id = 'pantry-sort-select';
      select.innerHTML = '<option value="alphabetical">Alphabetical</option><option value="frequent">Frequently used</option><option value="commonality">Commonality</option>';
      select.addEventListener('change', () => {
        setSettings({ ...getSettings(), sortBy: select.value });
        applyPantryPresentation();
      });
      sortLabel.append(sortText, select);

      const stock = document.createElement('div');
      stock.className = 'pantry-stock-filters';
      stock.setAttribute('role', 'group');
      stock.setAttribute('aria-label', 'Filter pantry by stock state');
      [
        ['all', 'All'],
        ['in', 'In stock'],
        ['low', 'Low stock'],
        ['out', 'Out'],
      ].forEach(([value, label]) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pantry-stock-filters__button';
        button.dataset.stockFilter = value;
        button.textContent = label;
        button.addEventListener('click', () => {
          setSettings({ ...getSettings(), stockFilter: value });
          applyPantryPresentation();
        });
        stock.appendChild(button);
      });
      controls.append(sortLabel, stock);
      filterPanel.insertBefore(controls, ingredientSection);
    }
    return controls;
  };

  const syncFilterControls = () => {
    const settings = getSettings();
    const controls = ensureSortFilterControls();
    if (!controls) return;
    const select = controls.querySelector('#pantry-sort-select');
    if (select) select.value = settings.sortBy;
    controls.querySelectorAll('[data-stock-filter]').forEach((button) => {
      const active = button.dataset.stockFilter === settings.stockFilter;
      button.classList.toggle('pantry-stock-filters__button--active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  };

  const ensurePantrySettings = () => {
    const toolbar = document.getElementById('theme-toolbar');
    if (!toolbar) return false;
    let details = document.getElementById('productivity-settings-pantry');
    if (details) return true;
    details = document.createElement('details');
    details.id = 'productivity-settings-pantry';
    details.className = 'pantry-view-settings';
    const summary = document.createElement('summary');
    summary.className = 'pantry-view-settings__summary';
    summary.textContent = 'Pantry';
    const body = document.createElement('div');
    body.className = 'pantry-view-settings__body';

    const flowLabel = document.createElement('label');
    flowLabel.className = 'pantry-view-settings__field';
    flowLabel.innerHTML = '<span>Category card scrolling</span>';
    const flow = document.createElement('select');
    flow.innerHTML = '<option value="vertical">Vertical</option><option value="horizontal">Horizontal</option>';
    flowLabel.appendChild(flow);

    const tagsLabel = document.createElement('label');
    tagsLabel.className = 'pantry-view-settings__field';
    tagsLabel.innerHTML = '<span>Tags by default</span>';
    const tags = document.createElement('select');
    tags.innerHTML = '<option value="expanded">Expanded</option><option value="collapsed">Collapsed</option><option value="hidden">Hidden</option>';
    tagsLabel.appendChild(tags);

    const note = document.createElement('p');
    note.className = 'pantry-view-settings__note';
    note.textContent = 'Horizontal mode scrolls category cards sideways while items within each card continue to scroll vertically.';
    body.append(flowLabel, tagsLabel, note);
    details.append(summary, body);
    const shopping = document.getElementById('productivity-settings-shopping');
    toolbar.insertBefore(details, shopping || null);

    const load = () => {
      const settings = getSettings();
      flow.value = settings.cardFlow;
      tags.value = settings.tagDefault;
    };
    flow.addEventListener('change', () => {
      setSettings({ ...getSettings(), cardFlow: flow.value });
      load();
      applyPantryPresentation();
    });
    tags.addEventListener('change', () => {
      tagOverride = null;
      setSettings({ ...getSettings(), tagDefault: tags.value });
      load();
      applyPantryPresentation();
    });
    load();
    return true;
  };

  const prepareTags = (card) => {
    let rowTags = card.querySelector('.pantry-row-tags');
    let tags = card.querySelector('.pantry-card__tags');
    if (!tags && !rowTags) return null;
    if (!rowTags && tags) {
      rowTags = document.createElement('details');
      rowTags.className = 'pantry-row-tags';
      const summary = document.createElement('summary');
      summary.className = 'pantry-row-tags__summary';
      summary.innerHTML = '<span aria-hidden="true">↳</span> Tags';
      tags.classList.add('pantry-row-tags__list');
      tags.parentElement?.insertBefore(rowTags, tags);
      rowTags.append(summary, tags);
    }
    tags = rowTags?.querySelector('.pantry-card__tags');
    if (tags) {
      const spans = Array.from(tags.children).filter((node) => node instanceof HTMLElement);
      spans.sort((a, b) => {
        const left = a.textContent?.trim() || '';
        const right = b.textContent?.trim() || '';
        return (Number(tagPopularity[right]) || 0) - (Number(tagPopularity[left]) || 0) || left.localeCompare(right);
      });
      spans.forEach((span) => tags.appendChild(span));
    }
    return rowTags;
  };

  const applyTagState = (card) => {
    const rowTags = prepareTags(card);
    if (!rowTags) return;
    const settings = getSettings();
    const mode = tagOverride || settings.tagDefault;
    rowTags.hidden = mode === 'hidden';
    rowTags.open = mode === 'expanded';
  };

  const enhanceCard = (card) => {
    if (!(card instanceof HTMLElement)) return;
    card.classList.add('pantry-card--compact');
    const ingredient = getIngredientForCard(card);
    if (ingredient?.slug) card.dataset.pantrySlug = ingredient.slug;
    const shoppingSummary = card.querySelector('.shopping-item-profile__summary');
    if (shoppingSummary && shoppingSummary.textContent !== 'Shop') shoppingSummary.textContent = 'Shop';
    applyTagState(card);
  };

  const applyLayoutAndSorting = () => {
    const grid = document.getElementById('pantry-grid');
    if (!grid) return;
    const settings = getSettings();
    grid.dataset.cardFlow = settings.cardFlow;
    let visibleCount = 0;

    grid.querySelectorAll('.pantry-category').forEach((section) => {
      section.classList.add('pantry-category--card');
      const list = section.querySelector('.pantry-category__list');
      if (!list) return;
      const records = Array.from(list.querySelectorAll('.pantry-card')).map((card) => {
        enhanceCard(card);
        return getCardRecord(card);
      }).filter(Boolean);
      const visible = filterPantryItems(records, settings.stockFilter).sort((a, b) => comparePantryItems(a, b, settings.sortBy));
      const visibleCards = new Set(visible.map((record) => record.card));
      records.forEach((record) => {
        record.card.hidden = !visibleCards.has(record.card);
        record.card.dataset.stockState = record.stockState;
      });
      const hiddenRecords = records.filter((record) => !visibleCards.has(record.card));
      const desiredOrder = [...visible, ...hiddenRecords].map((record) => record.card);
      const currentOrder = Array.from(list.children).filter((node) => node.classList?.contains('pantry-card'));
      const orderChanged = desiredOrder.length === currentOrder.length
        && desiredOrder.some((card, index) => currentOrder[index] !== card);
      if (orderChanged) list.append(...desiredOrder);
      visibleCount += visible.length;
      section.hidden = visible.length === 0;
    });

    const count = ensureResultCount();
    if (count) count.textContent = `${visibleCount.toLocaleString()} ${visibleCount === 1 ? 'Item' : 'Items'}`;
  };

  const syncPantryChrome = () => {
    const pantry = document.getElementById('pantry-view');
    const active = pantry instanceof HTMLElement && !pantry.hidden;
    const controls = ensureSortFilterControls();
    const count = ensureResultCount();
    if (controls) controls.hidden = !active;
    if (count) count.hidden = !active;
    syncPageActionBar();
  };

  const applyPantryPresentation = () => {
    syncPantryChrome();
    syncFilterControls();
    ensurePantrySettings();
    const pantry = document.getElementById('pantry-view');
    if (!(pantry instanceof HTMLElement) || pantry.hidden) return;
    applyLayoutAndSorting();
    syncPageActionBar();
  };

  const scheduleApply = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      applyPantryPresentation();
    });
  };

  const extendBackupTools = () => {
    const registry = global.BlissfulPersistenceRegistry?.registry;
    return MANAGED_BACKUP_KEYS.every((key) => registry?.has?.(key));
  };

  const bindEvents = () => {
    if (document.documentElement.dataset.pantryRedesignBound === 'true') return;
    document.documentElement.dataset.pantryRedesignBound = 'true';
    document.addEventListener('input', (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.closest('#pantry-view')) scheduleApply();
    });
    document.addEventListener('change', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('#pantry-view')) scheduleApply();
    });
    global.addEventListener('storage', (event) => {
      if ([VIEW_SETTINGS_STORAGE_KEY, APP_STATE_STORAGE_KEY, USAGE_STORAGE_KEY, SHOPPING_SETTINGS_STORAGE_KEY].includes(event.key)) scheduleApply();
    });
  };

  const start = () => {
    calculateCommonality();
    ensurePageActionBar();
    ensurePantrySettings();
    extendBackupTools();
    bindEvents();
    applyPantryPresentation();
    const observer = new MutationObserver(() => scheduleApply());
    observer.observe(document.body, { childList: true, subtree: true });
    let retries = 0;
    const retry = () => {
      retries += 1;
      ensurePantrySettings();
      extendBackupTools();
      applyPantryPresentation();
      if ((!document.getElementById('theme-toolbar') || !document.getElementById('pantry-grid')) && retries < 40) {
        global.requestAnimationFrame(retry);
      }
    };
    global.requestAnimationFrame(retry);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
