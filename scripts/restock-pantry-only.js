;(function (global) {
  const APP_STATE_STORAGE_KEY = 'blissful-app-state';
  const PANTRY_FAVORITES_STORAGE_KEY = 'blissful-pantry-favorites';
  const RESTOCK_HISTORY_STORAGE_KEY = 'blissful-pantry-stock-history';
  const DEFAULT_UNIT = 'each';
  const DIALOG_ID = 'pantry-restock-wizard';

  const CATEGORY_ICONS = new Map([
    ['meat', '🥩'], ['seafood', '🐟'], ['vegetable', '🥕'], ['fruit', '🍎'],
    ['dairy', '🥛'], ['cheese', '🧀'], ['pasta', '🍝'], ['grain', '🌾'],
    ['legume', '🫘'], ['plant protein', '🌱'], ['nut/seed', '🥜'], ['herb', '🌿'],
    ['spice', '🧂'], ['baking', '🧁'], ['sweetener', '🍯'], ['beverage', '🥤'],
    ['condiment/sauce', '🫙'], ['oil/fat', '🫒'],
  ]);

  const isPositiveQuantity = (value) => {
    if (value === null || value === undefined || value === '') return false;
    const number = Number(value);
    return Number.isFinite(number) && number > 0;
  };

  const normalizeStockHistory = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result = {};
    Object.entries(value).forEach(([slug, entry]) => {
      if (!String(slug || '').trim()) return;
      const source = typeof entry === 'number' ? { count: entry } : entry;
      if (!source || typeof source !== 'object') return;
      const count = Math.max(0, Math.floor(Number(source.count) || 0));
      if (!count) return;
      result[slug] = {
        count,
        lastStockedAt: typeof source.lastStockedAt === 'string' ? source.lastStockedAt : '',
      };
    });
    return result;
  };

  const getCategoryIcon = (category) => {
    const normalized = String(category || '').trim().toLowerCase();
    if (CATEGORY_ICONS.has(normalized)) return CATEGORY_ICONS.get(normalized);
    for (const [key, icon] of CATEGORY_ICONS.entries()) {
      if (normalized.includes(key) || key.includes(normalized)) return icon;
    }
    return '📦';
  };

  const sanitizeDraftEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return null;
    const quantity = String(entry.quantity ?? '').trim();
    if (!isPositiveQuantity(quantity)) return null;
    return { quantity, unit: String(entry.unit || '').trim() || DEFAULT_UNIT };
  };

  const normalizeFavorites = (value) => new Set(
    (Array.isArray(value) ? value : []).filter((slug) => typeof slug === 'string' && slug),
  );

  const buildRestockCategories = ({ ingredients, inventory, favorites, history } = {}) => {
    const sourceIngredients = Array.isArray(ingredients) ? ingredients : [];
    const sourceInventory = inventory && typeof inventory === 'object' ? inventory : {};
    const favoriteSet = normalizeFavorites(favorites);
    const stockHistory = normalizeStockHistory(history);
    const groups = new Map();

    sourceIngredients.forEach((ingredient, index) => {
      const slug = String(ingredient?.slug || '').trim();
      if (!slug) return;
      const inventoryEntry = sourceInventory[slug];
      const historyEntry = stockHistory[slug];
      const favorite = favoriteSet.has(slug);
      if (!inventoryEntry && !historyEntry && !favorite) return;
      const category = String(ingredient?.category || 'Other').trim() || 'Other';
      if (!groups.has(category)) groups.set(category, { category, firstIndex: index, items: [] });
      groups.get(category).items.push({
        slug,
        name: String(ingredient?.name || slug),
        category,
        favorite,
        currentlyStocked: Boolean(inventoryEntry && isPositiveQuantity(inventoryEntry.quantity)),
        historyCount: Math.max(0, Number(historyEntry?.count) || 0),
        quantity: inventoryEntry?.quantity ?? '',
        unit: String(inventoryEntry?.unit || DEFAULT_UNIT),
      });
    });

    return Array.from(groups.values())
      .sort((a, b) => a.firstIndex - b.firstIndex)
      .map((group) => ({
        category: group.category,
        icon: getCategoryIcon(group.category),
        items: group.items.sort((a, b) => (
          b.historyCount - a.historyCount
          || Number(b.currentlyStocked) - Number(a.currentlyStocked)
          || Number(b.favorite) - Number(a.favorite)
          || a.name.localeCompare(b.name)
        )),
      }));
  };

  const api = { normalizeStockHistory, getCategoryIcon, isPositiveQuantity, sanitizeDraftEntry, buildRestockCategories };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulRestock = Object.assign({}, global.BlissfulRestock || {}, api);
  if (typeof document === 'undefined') return;

  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const ingredientByName = new Map(
    ingredients.filter((item) => item?.name && item?.slug).map((item) => [String(item.name).trim().toLowerCase(), item]),
  );

  const readJson = (key, fallback) => {
    try { const raw = global.localStorage?.getItem?.(key); return raw ? JSON.parse(raw) : fallback; }
    catch (error) { return fallback; }
  };
  const writeJson = (key, value) => {
    try { global.localStorage?.setItem?.(key, JSON.stringify(value)); return true; }
    catch (error) { return false; }
  };
  const getAppState = () => {
    const state = readJson(APP_STATE_STORAGE_KEY, {});
    return state && typeof state === 'object' && !Array.isArray(state) ? state : {};
  };
  const getInventory = (state = getAppState()) => (
    state.pantryInventory && typeof state.pantryInventory === 'object' && !Array.isArray(state.pantryInventory)
      ? state.pantryInventory
      : {}
  );
  const getHistory = () => normalizeStockHistory(readJson(RESTOCK_HISTORY_STORAGE_KEY, {}));
  const getFavorites = () => readJson(PANTRY_FAVORITES_STORAGE_KEY, []);
  const bumpHistory = (slug, history) => {
    const current = history[slug] || { count: 0, lastStockedAt: '' };
    history[slug] = { count: Number(current.count || 0) + 1, lastStockedAt: new Date().toISOString() };
  };
  const syncApp = (state) => {
    if (typeof global.BlissfulApp?.applyStarterState === 'function') global.BlissfulApp.applyStarterState(state);
    else writeJson(APP_STATE_STORAGE_KEY, state);
  };

  const wizard = { root: null, panel: null, rail: null, stage: null, title: null, subtitle: null, progress: null, next: null, finish: null, categories: [], index: 0, drafts: new Map(), previousFocus: null };

  const getDraft = (category) => {
    if (wizard.drafts.has(category.category)) return wizard.drafts.get(category.category);
    const draft = new Map(category.items.map((item) => [item.slug, { quantity: item.quantity, unit: item.unit }]));
    wizard.drafts.set(category.category, draft);
    return draft;
  };

  const commitCategory = () => {
    const category = wizard.categories[wizard.index];
    if (!category) return;
    const state = getAppState();
    const inventory = { ...getInventory(state) };
    const history = getHistory();
    const draft = getDraft(category);
    let changed = false;
    category.items.forEach((item) => {
      const before = inventory[item.slug] || null;
      const after = sanitizeDraftEntry(draft.get(item.slug));
      if (JSON.stringify(before) === JSON.stringify(after)) return;
      changed = true;
      if (after) {
        inventory[item.slug] = after;
        bumpHistory(item.slug, history);
      } else delete inventory[item.slug];
    });
    if (!changed) return;
    writeJson(RESTOCK_HISTORY_STORAGE_KEY, history);
    syncApp({ ...state, pantryInventory: inventory });
  };

  const renderRail = () => {
    wizard.rail.innerHTML = '';
    wizard.categories.forEach((category, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'restock-wizard__category-button';
      button.textContent = category.icon;
      button.title = category.category;
      button.setAttribute('aria-label', `Go to ${category.category}`);
      if (index === wizard.index) {
        button.classList.add('restock-wizard__category-button--active');
        button.setAttribute('aria-current', 'step');
      }
      button.addEventListener('click', () => {
        if (index === wizard.index) return;
        commitCategory();
        wizard.index = index;
        renderStep();
      });
      wizard.rail.appendChild(button);
    });
  };

  const renderStep = () => {
    const category = wizard.categories[wizard.index];
    wizard.stage.innerHTML = '';
    if (!category) {
      wizard.progress.textContent = 'No saved restock categories yet';
      wizard.title.textContent = 'Nothing to restock yet';
      wizard.subtitle.textContent = 'Stock or favorite Pantry items and they will appear here.';
      wizard.next.disabled = true;
      renderRail();
      return;
    }
    wizard.progress.textContent = `Category ${wizard.index + 1} of ${wizard.categories.length}`;
    wizard.title.textContent = category.category;
    wizard.subtitle.textContent = 'Adjust what you have now. Blank or zero removes the item from current stock.';
    const list = document.createElement('div');
    list.className = 'restock-wizard__items';
    const draft = getDraft(category);
    category.items.forEach((item) => {
      const itemDraft = draft.get(item.slug);
      const row = document.createElement('div');
      row.className = 'restock-wizard__item';
      const info = document.createElement('div');
      info.className = 'restock-wizard__item-info';
      const name = document.createElement('span');
      name.className = 'restock-wizard__item-name';
      name.textContent = item.name;
      info.appendChild(name);
      const status = [];
      if (item.historyCount >= 2) status.push(`Frequent · ${item.historyCount} restocks`);
      else if (item.historyCount === 1) status.push('Previously stocked');
      if (item.favorite) status.push('Favorite');
      if (item.currentlyStocked) status.push('On hand');
      if (status.length) {
        const note = document.createElement('span');
        note.className = 'restock-wizard__item-status';
        note.textContent = status.join(' · ');
        info.appendChild(note);
      }
      const controls = document.createElement('div');
      controls.className = 'restock-wizard__item-controls';
      const quantity = document.createElement('input');
      quantity.type = 'number'; quantity.min = '0'; quantity.step = '0.25'; quantity.inputMode = 'decimal';
      quantity.className = 'restock-wizard__quantity'; quantity.value = itemDraft.quantity ?? ''; quantity.placeholder = '0';
      quantity.setAttribute('aria-label', `Quantity for ${item.name}`);
      quantity.addEventListener('input', () => { itemDraft.quantity = quantity.value; });
      const unit = document.createElement('input');
      unit.type = 'text'; unit.className = 'restock-wizard__unit'; unit.setAttribute('list', 'pantry-unit-options');
      unit.value = itemDraft.unit || DEFAULT_UNIT; unit.setAttribute('aria-label', `Unit for ${item.name}`);
      unit.addEventListener('input', () => { itemDraft.unit = unit.value; });
      controls.append(quantity, unit); row.append(info, controls); list.appendChild(row);
    });
    wizard.stage.appendChild(list);
    wizard.next.disabled = wizard.index >= wizard.categories.length - 1;
    renderRail();
  };

  const closeWizard = () => {
    if (!wizard.root) return;
    wizard.root.hidden = true;
    delete wizard.root.dataset.open;
    document.body.classList.remove('restock-wizard-open');
    wizard.previousFocus?.focus?.();
  };

  const ensureWizard = () => {
    if (wizard.root) return wizard.root;
    const root = document.createElement('div');
    root.className = 'restock-wizard'; root.id = DIALOG_ID; root.hidden = true;
    root.innerHTML = `<div class="restock-wizard__backdrop" aria-hidden="true"></div><section class="restock-wizard__panel" role="dialog" aria-modal="true" aria-labelledby="restock-wizard-title"><header class="restock-wizard__header"><div><p class="restock-wizard__eyebrow">Restock pantry</p><p class="restock-wizard__progress"></p><h2 class="restock-wizard__title" id="restock-wizard-title" tabindex="-1"></h2><p class="restock-wizard__subtitle"></p></div><button type="button" class="restock-wizard__close" aria-label="Close restock">×</button></header><div class="restock-wizard__body"><nav class="restock-wizard__rail" aria-label="Restock categories"></nav><div class="restock-wizard__stage"></div></div><footer class="restock-wizard__footer"><p class="restock-wizard__footer-hint">Finish saves this category and closes the guide.</p><div class="restock-wizard__actions"><button type="button" class="restock-wizard__button" data-restock-next>Next</button><button type="button" class="restock-wizard__button restock-wizard__button--primary" data-restock-finish>Finish</button></div></footer></section>`;
    document.body.appendChild(root);
    wizard.root = root; wizard.panel = root.querySelector('.restock-wizard__panel'); wizard.rail = root.querySelector('.restock-wizard__rail'); wizard.stage = root.querySelector('.restock-wizard__stage'); wizard.title = root.querySelector('.restock-wizard__title'); wizard.subtitle = root.querySelector('.restock-wizard__subtitle'); wizard.progress = root.querySelector('.restock-wizard__progress'); wizard.next = root.querySelector('[data-restock-next]'); wizard.finish = root.querySelector('[data-restock-finish]');
    root.querySelector('.restock-wizard__backdrop').addEventListener('click', closeWizard);
    root.querySelector('.restock-wizard__close').addEventListener('click', closeWizard);
    wizard.next.addEventListener('click', () => { commitCategory(); if (wizard.index < wizard.categories.length - 1) { wizard.index += 1; renderStep(); wizard.title.focus(); } });
    wizard.finish.addEventListener('click', () => { commitCategory(); closeWizard(); });
    return root;
  };

  const openWizard = (trigger) => {
    const state = getAppState();
    const history = getHistory();
    Object.entries(getInventory(state)).forEach(([slug, entry]) => {
      if (isPositiveQuantity(entry?.quantity) && !history[slug]) history[slug] = { count: 1, lastStockedAt: '' };
    });
    writeJson(RESTOCK_HISTORY_STORAGE_KEY, history);
    wizard.categories = buildRestockCategories({ ingredients, inventory: getInventory(state), favorites: getFavorites(), history });
    wizard.index = 0; wizard.drafts = new Map(); wizard.previousFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
    ensureWizard(); wizard.root.hidden = false; wizard.root.dataset.open = 'true'; document.body.classList.add('restock-wizard-open'); renderStep();
    global.requestAnimationFrame(() => wizard.title?.focus());
  };

  const bindTrigger = (button) => {
    if (!(button instanceof HTMLButtonElement) || button.dataset.restockBound === 'true') return;
    button.dataset.restockBound = 'true'; button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', DIALOG_ID);
    button.addEventListener('click', (event) => { event.preventDefault(); openWizard(button); });
  };

  const ensurePantryTrigger = () => {
    let button = document.getElementById('pantry-restock-button');
    if (!(button instanceof HTMLButtonElement)) {
      const header = document.querySelector('#pantry-view .pantry-view__header');
      if (!(header instanceof HTMLElement)) return false;
      button = document.createElement('button'); button.type = 'button'; button.id = 'pantry-restock-button';
      button.className = 'restock-launch restock-launch--pantry'; button.textContent = 'Restock';
      const summary = header.querySelector('.pantry-view__summary'); header.insertBefore(button, summary || null);
    }
    bindTrigger(button); return true;
  };

  const recordPantryChange = (input) => {
    if (!(input instanceof HTMLInputElement) || !input.closest('#pantry-view') || !input.classList.contains('pantry-card__inline-input--quantity')) return;
    const before = input.dataset.restockOriginalValue ?? '';
    if (before === input.value || !isPositiveQuantity(input.value)) return;
    const name = input.closest('.pantry-card')?.querySelector('.pantry-card__name')?.textContent?.trim().toLowerCase();
    const ingredient = name ? ingredientByName.get(name) : null;
    if (!ingredient?.slug) return;
    const history = getHistory(); bumpHistory(ingredient.slug, history); writeJson(RESTOCK_HISTORY_STORAGE_KEY, history); input.dataset.restockOriginalValue = input.value;
  };

  const start = () => {
    ensureWizard(); ensurePantryTrigger();
    document.addEventListener('focusin', (event) => { const input = event.target; if (input instanceof HTMLInputElement && input.classList.contains('pantry-card__inline-input--quantity') && input.closest('#pantry-view')) input.dataset.restockOriginalValue = input.value; });
    document.addEventListener('change', (event) => recordPantryChange(event.target));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && wizard.root && !wizard.root.hidden) closeWizard(); });
    const observer = new MutationObserver(() => global.requestAnimationFrame(ensurePantryTrigger));
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
