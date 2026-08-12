;(function (global) {
  const APP_STATE_STORAGE_KEY = 'blissful-app-state';
  const PANTRY_FAVORITES_STORAGE_KEY = 'blissful-pantry-favorites';
  const RESTOCK_HISTORY_STORAGE_KEY = 'blissful-pantry-stock-history';
  const DEFAULT_UNIT = 'each';
  const DIALOG_ID = 'pantry-restock-wizard';

  const CATEGORY_ICONS = new Map([
    ['meat', '🥩'],
    ['meat & poultry', '🥩'],
    ['seafood', '🐟'],
    ['vegetable', '🥕'],
    ['fruit', '🍎'],
    ['dairy', '🥛'],
    ['dairy alternative', '🥛'],
    ['cheese', '🧀'],
    ['pasta', '🍝'],
    ['grain', '🌾'],
    ['grains & cereals', '🌾'],
    ['legume', '🫘'],
    ['legumes & pulses', '🫘'],
    ['plant protein', '🌱'],
    ['nut/seed', '🥜'],
    ['nuts & seeds', '🥜'],
    ['herb', '🌿'],
    ['herbs & aromatics', '🌿'],
    ['spice', '🧂'],
    ['baking', '🧁'],
    ['baking alternative', '🧁'],
    ['baked goods & doughs', '🥖'],
    ['sweetener', '🍯'],
    ['beverage', '🥤'],
    ['beverages & mixers', '🥤'],
    ['condiment/sauce', '🫙'],
    ['condiments & spreads', '🫙'],
    ['fermented & pickled', '🫙'],
    ['oil/fat', '🫒'],
    ['oils & fats', '🫒'],
  ]);

  const normalizeStockHistory = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result = {};
    Object.entries(value).forEach(([slug, entry]) => {
      if (typeof slug !== 'string' || !slug.trim()) return;
      const source = typeof entry === 'number' ? { count: entry } : entry;
      if (!source || typeof source !== 'object') return;
      const count = Math.max(0, Math.floor(Number(source.count) || 0));
      if (!count) return;
      const lastStockedAt = typeof source.lastStockedAt === 'string' ? source.lastStockedAt : '';
      result[slug] = { count, lastStockedAt };
    });
    return result;
  };

  const normalizeFavorites = (value) => {
    if (value instanceof Set) return new Set(Array.from(value).filter(Boolean));
    if (!Array.isArray(value)) return new Set();
    return new Set(value.filter((slug) => typeof slug === 'string' && slug));
  };

  const isPositiveQuantity = (value) => {
    if (value === null || value === undefined || value === '') return false;
    const number = Number(value);
    return Number.isFinite(number) && number > 0;
  };

  const getCategoryIcon = (category) => {
    const normalized = String(category || '').trim().toLowerCase();
    if (CATEGORY_ICONS.has(normalized)) return CATEGORY_ICONS.get(normalized);
    for (const [key, icon] of CATEGORY_ICONS.entries()) {
      if (normalized.includes(key) || key.includes(normalized)) return icon;
    }
    return '📦';
  };

  const buildRestockCategories = ({ ingredients, inventory, favorites, history } = {}) => {
    const sourceIngredients = Array.isArray(ingredients) ? ingredients : [];
    const sourceInventory = inventory && typeof inventory === 'object' ? inventory : {};
    const favoriteSet = normalizeFavorites(favorites);
    const stockHistory = normalizeStockHistory(history);
    const groups = new Map();

    sourceIngredients.forEach((ingredient, ingredientIndex) => {
      if (!ingredient || typeof ingredient !== 'object') return;
      const slug = typeof ingredient.slug === 'string' ? ingredient.slug : '';
      if (!slug) return;
      const inventoryEntry = sourceInventory[slug];
      const historyEntry = stockHistory[slug];
      const favorite = favoriteSet.has(slug);
      if (!inventoryEntry && !favorite && !historyEntry) return;

      const category = String(ingredient.category || 'Other').trim() || 'Other';
      if (!groups.has(category)) {
        groups.set(category, { category, firstIndex: ingredientIndex, items: [] });
      }
      groups.get(category).items.push({
        slug,
        name: String(ingredient.name || slug),
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
        items: group.items.sort((a, b) => {
          if (a.historyCount !== b.historyCount) return b.historyCount - a.historyCount;
          if (a.currentlyStocked !== b.currentlyStocked) return a.currentlyStocked ? -1 : 1;
          if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
      }));
  };

  const sanitizeDraftEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return null;
    const quantityText = String(entry.quantity ?? '').trim();
    if (!isPositiveQuantity(quantityText)) return null;
    const unitText = String(entry.unit || '').trim() || DEFAULT_UNIT;
    return { quantity: quantityText, unit: unitText };
  };

  const api = {
    normalizeStockHistory,
    buildRestockCategories,
    getCategoryIcon,
    sanitizeDraftEntry,
    isPositiveQuantity,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document === 'undefined') return;

  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const ingredientByName = new Map(
    ingredients
      .filter((ingredient) => ingredient && ingredient.slug && ingredient.name)
      .map((ingredient) => [String(ingredient.name).trim().toLowerCase(), ingredient]),
  );

  const wizard = {
    root: null,
    panel: null,
    rail: null,
    stage: null,
    progress: null,
    title: null,
    subtitle: null,
    nextButton: null,
    finishButton: null,
    closeButton: null,
    categories: [],
    categoryIndex: 0,
    drafts: new Map(),
    previousFocus: null,
    isOpen: false,
  };

  const readJson = (key, fallback) => {
    try {
      const raw = global.localStorage?.getItem?.(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
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
    const state = readJson(APP_STATE_STORAGE_KEY, {});
    return state && typeof state === 'object' && !Array.isArray(state) ? state : {};
  };

  const getInventory = (state = getAppState()) => {
    const inventory = state.pantryInventory;
    return inventory && typeof inventory === 'object' && !Array.isArray(inventory) ? inventory : {};
  };

  const getFavorites = () => normalizeFavorites(readJson(PANTRY_FAVORITES_STORAGE_KEY, []));
  const getHistory = () => normalizeStockHistory(readJson(RESTOCK_HISTORY_STORAGE_KEY, {}));

  const seedHistoryFromCurrentInventory = () => {
    const state = getAppState();
    const inventory = getInventory(state);
    const history = getHistory();
    let changed = false;
    Object.entries(inventory).forEach(([slug, entry]) => {
      if (!isPositiveQuantity(entry?.quantity) || history[slug]) return;
      history[slug] = { count: 1, lastStockedAt: '' };
      changed = true;
    });
    if (changed) writeJson(RESTOCK_HISTORY_STORAGE_KEY, history);
    return history;
  };

  const bumpHistory = (slug, history = getHistory()) => {
    if (!slug) return history;
    const current = history[slug] || { count: 0, lastStockedAt: '' };
    history[slug] = {
      count: Math.max(0, Number(current.count) || 0) + 1,
      lastStockedAt: new Date().toISOString(),
    };
    return history;
  };

  const syncAppFromStorage = (state) => {
    const app = global.BlissfulApp;
    if (app && typeof app.applyStarterState === 'function') {
      app.applyStarterState(state);
    }
  };

  const redirectLegacyKitchenView = () => {
    const state = getAppState();
    if (state.activeView !== 'kitchen') return;
    state.activeView = 'pantry';
    writeJson(APP_STATE_STORAGE_KEY, state);
    syncAppFromStorage(state);
  };

  const getCategoryDraft = (category) => {
    if (!category) return new Map();
    if (wizard.drafts.has(category.category)) return wizard.drafts.get(category.category);
    const draft = new Map();
    category.items.forEach((item) => {
      draft.set(item.slug, { quantity: item.quantity ?? '', unit: item.unit || DEFAULT_UNIT });
    });
    wizard.drafts.set(category.category, draft);
    return draft;
  };

  const getItemStatus = (item) => {
    const labels = [];
    if (item.historyCount >= 2) labels.push(`Frequent · ${item.historyCount} restocks`);
    else if (item.historyCount === 1) labels.push('Previously stocked');
    if (item.favorite) labels.push('Favorite');
    if (item.currentlyStocked) labels.push('On hand');
    return labels.join(' · ');
  };

  const createItemRow = (item, draft) => {
    const row = document.createElement('div');
    row.className = 'restock-wizard__item';
    row.dataset.slug = item.slug;

    const info = document.createElement('div');
    info.className = 'restock-wizard__item-info';
    const name = document.createElement('span');
    name.className = 'restock-wizard__item-name';
    name.textContent = item.name;
    info.appendChild(name);
    const statusText = getItemStatus(item);
    if (statusText) {
      const status = document.createElement('span');
      status.className = 'restock-wizard__item-status';
      status.textContent = statusText;
      info.appendChild(status);
    }
    row.appendChild(info);

    const controls = document.createElement('div');
    controls.className = 'restock-wizard__item-controls';
    const quantity = document.createElement('input');
    quantity.type = 'number';
    quantity.min = '0';
    quantity.step = '0.25';
    quantity.inputMode = 'decimal';
    quantity.autocomplete = 'off';
    quantity.className = 'restock-wizard__quantity';
    quantity.value = draft.quantity ?? '';
    quantity.placeholder = '0';
    quantity.setAttribute('aria-label', `Quantity for ${item.name}`);
    quantity.addEventListener('input', () => {
      draft.quantity = quantity.value;
    });

    const unit = document.createElement('input');
    unit.type = 'text';
    unit.className = 'restock-wizard__unit';
    unit.setAttribute('list', 'pantry-unit-options');
    unit.autocomplete = 'off';
    unit.spellcheck = false;
    unit.value = draft.unit || DEFAULT_UNIT;
    unit.setAttribute('aria-label', `Unit for ${item.name}`);
    unit.addEventListener('input', () => {
      draft.unit = unit.value;
    });

    controls.appendChild(quantity);
    controls.appendChild(unit);
    row.appendChild(controls);
    return row;
  };

  const renderRail = () => {
    if (!wizard.rail) return;
    wizard.rail.innerHTML = '';
    wizard.categories.forEach((category, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'restock-wizard__category-button';
      button.dataset.categoryIndex = String(index);
      button.textContent = category.icon || getCategoryIcon(category.category);
      button.title = category.category;
      button.setAttribute('aria-label', `Go to ${category.category}`);
      if (index === wizard.categoryIndex) {
        button.classList.add('restock-wizard__category-button--active');
        button.setAttribute('aria-current', 'step');
      }
      button.addEventListener('click', () => {
        if (index === wizard.categoryIndex) return;
        commitCurrentCategory();
        wizard.categoryIndex = index;
        renderWizardStep();
      });
      wizard.rail.appendChild(button);
    });
  };

  const renderWizardStep = () => {
    if (!wizard.stage || !wizard.title || !wizard.subtitle || !wizard.progress) return;
    wizard.stage.innerHTML = '';
    const total = wizard.categories.length;
    const category = wizard.categories[wizard.categoryIndex];

    if (!category) {
      wizard.progress.textContent = 'No saved restock categories yet';
      wizard.title.textContent = 'Nothing to restock yet';
      wizard.subtitle.textContent = 'Add quantities or favorite items on the Pantry page. They will appear here for faster restocking next time.';
      const empty = document.createElement('div');
      empty.className = 'restock-wizard__empty';
      empty.textContent = 'Your guided restock list is built from items you keep, favorite, or have stocked before.';
      wizard.stage.appendChild(empty);
      if (wizard.nextButton) wizard.nextButton.disabled = true;
      renderRail();
      return;
    }

    wizard.progress.textContent = `Category ${wizard.categoryIndex + 1} of ${total}`;
    wizard.title.textContent = category.category;
    wizard.subtitle.textContent = 'Adjust what you have now. Leave an item blank to remove it from current pantry stock.';
    const list = document.createElement('div');
    list.className = 'restock-wizard__items';
    const draft = getCategoryDraft(category);
    category.items.forEach((item) => {
      const itemDraft = draft.get(item.slug) || { quantity: '', unit: DEFAULT_UNIT };
      draft.set(item.slug, itemDraft);
      list.appendChild(createItemRow(item, itemDraft));
    });
    wizard.stage.appendChild(list);
    if (wizard.nextButton) wizard.nextButton.disabled = wizard.categoryIndex >= total - 1;
    renderRail();
    wizard.stage.scrollTop = 0;
  };

  const commitCurrentCategory = () => {
    const category = wizard.categories[wizard.categoryIndex];
    if (!category) return false;
    const draft = getCategoryDraft(category);
    const state = getAppState();
    const inventory = { ...getInventory(state) };
    const history = getHistory();
    let changed = false;

    category.items.forEach((item) => {
      const before = inventory[item.slug] || null;
      const after = sanitizeDraftEntry(draft.get(item.slug));
      const beforeSerialized = before ? JSON.stringify(before) : '';
      const afterSerialized = after ? JSON.stringify(after) : '';
      if (beforeSerialized === afterSerialized) return;
      changed = true;
      if (after) {
        inventory[item.slug] = after;
        bumpHistory(item.slug, history);
      } else {
        delete inventory[item.slug];
      }
    });

    if (!changed) return false;
    state.pantryInventory = inventory;
    if (state.activeView === 'kitchen') state.activeView = 'pantry';
    writeJson(APP_STATE_STORAGE_KEY, state);
    writeJson(RESTOCK_HISTORY_STORAGE_KEY, history);
    syncAppFromStorage(state);
    return true;
  };

  const closeWizard = ({ restoreFocus = true } = {}) => {
    if (!wizard.root) return;
    wizard.root.hidden = true;
    wizard.root.removeAttribute('data-open');
    wizard.isOpen = false;
    document.body.classList.remove('restock-wizard-open');
    document.removeEventListener('keydown', handleWizardKeydown);
    if (restoreFocus && wizard.previousFocus instanceof HTMLElement) {
      wizard.previousFocus.focus();
    }
    wizard.previousFocus = null;
  };

  const finishWizard = () => {
    commitCurrentCategory();
    closeWizard();
  };

  const goNext = () => {
    if (!wizard.categories.length) return;
    commitCurrentCategory();
    if (wizard.categoryIndex < wizard.categories.length - 1) {
      wizard.categoryIndex += 1;
      renderWizardStep();
      const heading = wizard.title;
      if (heading instanceof HTMLElement) heading.focus();
    }
  };

  const getFocusableElements = () => {
    if (!wizard.panel) return [];
    return Array.from(
      wizard.panel.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    ).filter((element) => element instanceof HTMLElement && !element.hidden);
  };

  const handleWizardKeydown = (event) => {
    if (!wizard.isOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeWizard();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements();
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const ensureWizard = () => {
    if (wizard.root) return wizard;
    const root = document.createElement('div');
    root.className = 'restock-wizard';
    root.id = DIALOG_ID;
    root.hidden = true;

    const backdrop = document.createElement('div');
    backdrop.className = 'restock-wizard__backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    const panel = document.createElement('section');
    panel.className = 'restock-wizard__panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'restock-wizard-title');
    panel.setAttribute('aria-describedby', 'restock-wizard-subtitle');

    const header = document.createElement('header');
    header.className = 'restock-wizard__header';
    const headerText = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'restock-wizard__eyebrow';
    eyebrow.textContent = 'Restock pantry';
    const progress = document.createElement('p');
    progress.className = 'restock-wizard__progress';
    const title = document.createElement('h2');
    title.className = 'restock-wizard__title';
    title.id = 'restock-wizard-title';
    title.tabIndex = -1;
    const subtitle = document.createElement('p');
    subtitle.className = 'restock-wizard__subtitle';
    subtitle.id = 'restock-wizard-subtitle';
    headerText.appendChild(eyebrow);
    headerText.appendChild(progress);
    headerText.appendChild(title);
    headerText.appendChild(subtitle);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'restock-wizard__close';
    closeButton.setAttribute('aria-label', 'Close restock');
    closeButton.title = 'Close restock';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => closeWizard());
    header.appendChild(headerText);
    header.appendChild(closeButton);

    const body = document.createElement('div');
    body.className = 'restock-wizard__body';
    const rail = document.createElement('nav');
    rail.className = 'restock-wizard__rail';
    rail.setAttribute('aria-label', 'Restock categories');
    const stage = document.createElement('div');
    stage.className = 'restock-wizard__stage';
    body.appendChild(rail);
    body.appendChild(stage);

    const footer = document.createElement('footer');
    footer.className = 'restock-wizard__footer';
    const hint = document.createElement('p');
    hint.className = 'restock-wizard__footer-hint';
    hint.textContent = 'Finish saves this category and closes the guide.';
    const actions = document.createElement('div');
    actions.className = 'restock-wizard__actions';
    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'restock-wizard__button';
    nextButton.textContent = 'Next';
    nextButton.addEventListener('click', goNext);
    const finishButton = document.createElement('button');
    finishButton.type = 'button';
    finishButton.className = 'restock-wizard__button restock-wizard__button--primary';
    finishButton.textContent = 'Finish';
    finishButton.addEventListener('click', finishWizard);
    actions.appendChild(nextButton);
    actions.appendChild(finishButton);
    footer.appendChild(hint);
    footer.appendChild(actions);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);
    root.appendChild(backdrop);
    root.appendChild(panel);
    document.body.appendChild(root);

    backdrop.addEventListener('click', () => closeWizard());

    wizard.root = root;
    wizard.panel = panel;
    wizard.rail = rail;
    wizard.stage = stage;
    wizard.progress = progress;
    wizard.title = title;
    wizard.subtitle = subtitle;
    wizard.nextButton = nextButton;
    wizard.finishButton = finishButton;
    wizard.closeButton = closeButton;
    return wizard;
  };

  const openWizard = (trigger) => {
    const state = getAppState();
    const inventory = getInventory(state);
    const history = seedHistoryFromCurrentInventory();
    wizard.categories = buildRestockCategories({
      ingredients,
      inventory,
      favorites: getFavorites(),
      history,
    });
    wizard.categoryIndex = 0;
    wizard.drafts = new Map();
    wizard.previousFocus = trigger instanceof HTMLElement
      ? trigger
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    ensureWizard();
    wizard.root.hidden = false;
    wizard.root.dataset.open = 'true';
    wizard.isOpen = true;
    document.body.classList.add('restock-wizard-open');
    renderWizardStep();
    document.addEventListener('keydown', handleWizardKeydown);
    global.requestAnimationFrame(() => {
      if (wizard.categories.length && wizard.title instanceof HTMLElement) wizard.title.focus();
      else wizard.finishButton?.focus();
    });
  };

  const bindTrigger = (button) => {
    if (!(button instanceof HTMLButtonElement) || button.dataset.restockBound === 'true') return;
    button.dataset.restockBound = 'true';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', DIALOG_ID);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      openWizard(button);
    });
  };

  const configureTopbarTrigger = () => {
    const button = document.querySelector(
      'button[data-restock-trigger="topbar"], button[data-view-target="kitchen"]',
    );
    if (!(button instanceof HTMLButtonElement)) return false;
    button.removeAttribute('data-view-target');
    button.dataset.restockTrigger = 'topbar';
    button.textContent = 'Restock';
    button.removeAttribute('aria-current');
    button.classList.remove('view-toggle__button--active');
    bindTrigger(button);
    return true;
  };

  const configurePantryTrigger = () => {
    const header = document.querySelector('#pantry-view .pantry-view__header');
    if (!(header instanceof HTMLElement)) return false;
    let button = document.getElementById('pantry-restock-button');
    if (!(button instanceof HTMLButtonElement)) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = 'pantry-restock-button';
      button.className = 'restock-launch restock-launch--pantry';
      button.textContent = 'Restock';
      const summary = header.querySelector('.pantry-view__summary');
      header.insertBefore(button, summary || null);
    }
    bindTrigger(button);
    return true;
  };

  const hideLegacyKitchenView = () => {
    const kitchen = document.getElementById('kitchen-view');
    if (!(kitchen instanceof HTMLElement)) return false;
    kitchen.hidden = true;
    kitchen.setAttribute('aria-hidden', 'true');
    return true;
  };

  const recordPantryPageStockChange = (input) => {
    if (!(input instanceof HTMLInputElement)) return;
    if (!input.closest('#pantry-view')) return;
    if (!input.classList.contains('pantry-card__inline-input--quantity')) return;
    const original = input.dataset.restockOriginalValue ?? '';
    if (original === input.value || !isPositiveQuantity(input.value)) return;
    const card = input.closest('.pantry-card');
    const name = card?.querySelector('.pantry-card__name')?.textContent?.trim().toLowerCase();
    const ingredient = name ? ingredientByName.get(name) : null;
    if (!ingredient?.slug) return;
    const history = bumpHistory(ingredient.slug, getHistory());
    writeJson(RESTOCK_HISTORY_STORAGE_KEY, history);
    input.dataset.restockOriginalValue = input.value;
  };

  const bindPantryHistoryCapture = () => {
    if (document.documentElement.dataset.restockHistoryBound === 'true') return;
    document.documentElement.dataset.restockHistoryBound = 'true';
    document.addEventListener('focusin', (event) => {
      const input = event.target;
      if (
        input instanceof HTMLInputElement
        && input.classList.contains('pantry-card__inline-input--quantity')
        && input.closest('#pantry-view')
      ) {
        input.dataset.restockOriginalValue = input.value;
      }
    });
    document.addEventListener('change', (event) => {
      recordPantryPageStockChange(event.target);
    });
  };

  const start = () => {
    redirectLegacyKitchenView();
    configureTopbarTrigger();
    configurePantryTrigger();
    hideLegacyKitchenView();
    bindPantryHistoryCapture();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  let retries = 0;
  const retrySetup = () => {
    retries += 1;
    const topbarReady = configureTopbarTrigger();
    const pantryReady = configurePantryTrigger();
    hideLegacyKitchenView();
    redirectLegacyKitchenView();
    if ((!topbarReady || !pantryReady || !global.BlissfulApp) && retries < 30) {
      global.requestAnimationFrame(retrySetup);
    }
  };
  global.requestAnimationFrame(retrySetup);
})(typeof window !== 'undefined' ? window : globalThis);
