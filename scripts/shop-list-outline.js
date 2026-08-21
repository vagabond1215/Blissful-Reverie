;(function (global) {
  const APP_STATE_STORAGE_KEY = 'blissful-app-state';
  const MEAL_PLAN_STORAGE_KEY = 'blissful-meal-plan';
  const SHOPPING_SETTINGS_STORAGE_KEY = 'blissful-shopping-settings';
  const PANEL_SELECTOR = '#shop-shopping-host .productivity-shopping[data-shopping-recommendation-scope="meal-plan"]';

  const UNIT_ALIASES = new Map([
    ['cup', 'cup'], ['cups', 'cup'],
    ['tablespoon', 'tbsp'], ['tablespoons', 'tbsp'], ['tbsp', 'tbsp'], ['tbsps', 'tbsp'],
    ['teaspoon', 'tsp'], ['teaspoons', 'tsp'], ['tsp', 'tsp'], ['tsps', 'tsp'],
    ['fluid ounce', 'fl oz'], ['fluid ounces', 'fl oz'], ['fl oz', 'fl oz'],
    ['ounce', 'oz'], ['ounces', 'oz'], ['oz', 'oz'],
    ['pound', 'lb'], ['pounds', 'lb'], ['lb', 'lb'], ['lbs', 'lb'],
    ['gram', 'g'], ['grams', 'g'], ['g', 'g'],
    ['kilogram', 'kg'], ['kilograms', 'kg'], ['kg', 'kg'],
    ['milliliter', 'ml'], ['milliliters', 'ml'], ['millilitre', 'ml'], ['millilitres', 'ml'], ['ml', 'ml'],
    ['liter', 'L'], ['liters', 'L'], ['litre', 'L'], ['litres', 'L'], ['l', 'L'],
    ['clove', 'clove'], ['cloves', 'clove'],
    ['can', 'can'], ['cans', 'can'],
    ['jar', 'jar'], ['jars', 'jar'],
    ['bottle', 'bottle'], ['bottles', 'bottle'],
    ['package', 'package'], ['packages', 'package'], ['pack', 'pack'], ['packs', 'pack'],
    ['each', 'each'], ['item', 'each'], ['items', 'each'],
  ]);

  const CONVERTIBLE_UNITS = Object.freeze({
    tsp: { dimension: 'volume', factor: 1 },
    tbsp: { dimension: 'volume', factor: 3 },
    cup: { dimension: 'volume', factor: 48 },
    'fl oz': { dimension: 'volume', factor: 6 },
    ml: { dimension: 'volume', factor: 0.202884 },
    L: { dimension: 'volume', factor: 202.884 },
    g: { dimension: 'mass', factor: 1 },
    kg: { dimension: 'mass', factor: 1000 },
    oz: { dimension: 'mass', factor: 28.349523125 },
    lb: { dimension: 'mass', factor: 453.59237 },
  });

  const FRACTIONS = Object.freeze([
    [0.125, '⅛'],
    [1 / 3, '⅓'],
    [0.25, '¼'],
    [0.375, '⅜'],
    [0.5, '½'],
    [0.625, '⅝'],
    [2 / 3, '⅔'],
    [0.75, '¾'],
    [0.875, '⅞'],
  ]);

  const CATEGORY_ICONS = Object.freeze({
    fruit: '🍎',
    herb: '🌿',
    legume: '🫘',
    'oil/fat': '🫒',
    spice: '✦',
    vegetable: '🥕',
    grain: '🌾',
    pasta: '🍝',
    dairy: '🥛',
    meat: '🍗',
    seafood: '🐟',
    baking: '🥣',
    sweetener: '🍯',
    beverage: '🥤',
    'condiment/sauce': '🫙',
    'nut/seed': '🌰',
    'plant protein': '🫘',
    'baked goods & doughs': '🥖',
    store: '🏬',
    other: '🛒',
  });

  const normalizeMeasureUnit = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const key = raw.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
    return UNIT_ALIASES.get(key) || raw;
  };

  const formatQuantity = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return '';
    const roundedWhole = Math.round(number);
    if (Math.abs(number - roundedWhole) < 0.001) return String(roundedWhole);

    const whole = Math.floor(number);
    const remainder = number - whole;
    const fraction = FRACTIONS.find(([decimal]) => Math.abs(remainder - decimal) < 0.02);
    if (fraction) return `${whole > 0 ? whole : ''}${fraction[1]}`;

    return String(Math.round(number * 100) / 100);
  };

  const formatUnitLabel = (unit, quantity) => {
    const normalized = normalizeMeasureUnit(unit);
    const singular = Math.abs(Number(quantity) - 1) < 0.001;
    const pluralizable = new Map([
      ['cup', 'cups'],
      ['clove', 'cloves'],
      ['can', 'cans'],
      ['jar', 'jars'],
      ['bottle', 'bottles'],
      ['package', 'packages'],
      ['pack', 'packs'],
    ]);
    if (pluralizable.has(normalized)) return singular ? normalized : pluralizable.get(normalized);
    return normalized;
  };

  const aggregateMeasures = (entries) => {
    const groups = new Map();
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
      const quantity = Number(entry?.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return;
      const unit = normalizeMeasureUnit(entry?.unit);
      if (!unit) return;
      const convertible = CONVERTIBLE_UNITS[unit] || null;
      const key = convertible ? `dimension:${convertible.dimension}` : `unit:${unit.toLowerCase()}`;
      if (!groups.has(key)) {
        groups.set(key, {
          preferredUnit: unit,
          preferredFactor: convertible?.factor || 1,
          totalBase: 0,
        });
      }
      const group = groups.get(key);
      group.totalBase += quantity * (convertible?.factor || 1);
    });

    return Array.from(groups.values()).map((group) => {
      const quantity = group.totalBase / group.preferredFactor;
      return {
        quantity,
        unit: group.preferredUnit,
        quantityLabel: formatQuantity(quantity),
        unitLabel: formatUnitLabel(group.preferredUnit, quantity),
      };
    });
  };

  const getCategoryIcon = (value, grouping = 'category') => {
    if (grouping === 'store') return CATEGORY_ICONS.store;
    const normalized = String(value || '').trim().toLowerCase();
    if (CATEGORY_ICONS[normalized]) return CATEGORY_ICONS[normalized];
    const match = Object.keys(CATEGORY_ICONS).find((key) => key !== 'other' && key !== 'store' && normalized.includes(key));
    return CATEGORY_ICONS[match] || CATEGORY_ICONS.other;
  };

  const parsePurchaseMeasure = (value) => {
    const text = String(value || '').trim();
    if (!text) return null;
    const buy = text.replace(/^Buy\s+/i, '').split('·')[0].trim();
    if (!buy) return null;
    const match = buy.match(/^([0-9]+(?:\.[0-9]+)?|[⅛⅓¼⅜½⅝⅔¾⅞]+)\s+(.+)$/);
    if (!match) return { quantityLabel: '', unitLabel: buy };
    return { quantityLabel: match[1], unitLabel: match[2].trim() };
  };

  const api = {
    normalizeMeasureUnit,
    formatQuantity,
    formatUnitLabel,
    aggregateMeasures,
    getCategoryIcon,
    parsePurchaseMeasure,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulShopListOutline = Object.assign({}, global.BlissfulShopListOutline || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;
  let matcherIndex = null;
  let matcherIngredients = null;

  const readJson = (key, fallback) => {
    try {
      const raw = global.localStorage?.getItem?.(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const getGroupingMode = () => {
    const settings = readJson(SHOPPING_SETTINGS_STORAGE_KEY, {});
    return settings?.groupBy === 'store' ? 'store' : 'category';
  };

  const getPlannedRecipes = () => {
    const mealPlan = readJson(MEAL_PLAN_STORAGE_KEY, {});
    const recipeById = new Map(
      (Array.isArray(global.BLISSFUL_RECIPES) ? global.BLISSFUL_RECIPES : [])
        .filter((recipe) => recipe?.id)
        .map((recipe) => [recipe.id, recipe]),
    );
    const ids = [];
    const seen = new Set();
    Object.values(mealPlan && typeof mealPlan === 'object' && !Array.isArray(mealPlan) ? mealPlan : {}).forEach((entries) => {
      if (!Array.isArray(entries)) return;
      entries.forEach((entry) => {
        const recipeId = String(entry?.recipeId || '').trim();
        if (!recipeId || seen.has(recipeId) || !recipeById.has(recipeId)) return;
        seen.add(recipeId);
        ids.push(recipeId);
      });
    });
    return ids.map((id) => recipeById.get(id)).filter(Boolean);
  };

  const getServingOverrides = () => {
    const state = readJson(APP_STATE_STORAGE_KEY, {});
    return state?.servingOverrides && typeof state.servingOverrides === 'object' && !Array.isArray(state.servingOverrides)
      ? state.servingOverrides
      : {};
  };

  const getMatcherIndex = () => {
    const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
    const matching = global.BlissfulMatching || {};
    if (typeof matching.createIngredientMatcherIndex !== 'function') return null;
    if (matcherIndex && matcherIngredients === ingredients) return matcherIndex;
    matcherIngredients = ingredients;
    matcherIndex = matching.createIngredientMatcherIndex(ingredients);
    return matcherIndex;
  };

  const entryMatchesSlug = (entry, slug, index) => {
    const matching = global.BlissfulMatching || {};
    if (!entry || !slug || !(index?.matchers instanceof Map)) return false;
    if (
      typeof matching.sanitizeComparisonText !== 'function'
      || typeof matching.buildTokenSet !== 'function'
      || typeof matching.doesEntryMatchIngredient !== 'function'
    ) return false;
    const matcher = index.matchers.get(slug);
    if (!matcher) return false;
    return matching.doesEntryMatchIngredient({
      text: matching.sanitizeComparisonText(entry.item),
      tokens: matching.buildTokenSet(entry.item),
    }, matcher);
  };

  const collectRecipeMeasures = (slug, recipes, servingOverrides, index) => {
    const measures = [];
    (Array.isArray(recipes) ? recipes : []).forEach((recipe) => {
      const baseServings = Math.max(1, Number(recipe?.baseServings) || 1);
      const override = Number(servingOverrides?.[recipe?.id]);
      const scale = Number.isFinite(override) && override > 0 ? override / baseServings : 1;
      (Array.isArray(recipe?.ingredients) ? recipe.ingredients : []).forEach((entry) => {
        if (!entryMatchesSlug(entry, slug, index)) return;
        const quantity = Number(entry?.quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) return;
        measures.push({ quantity: quantity * scale, unit: entry?.unit });
      });
    });
    return aggregateMeasures(measures);
  };

  const setRowMeasure = (row, measures) => {
    const setText = (node, value) => {
      const next = String(value || '');
      if (node.textContent !== next) node.textContent = next;
    };
    if (!(row instanceof HTMLElement)) return;
    let quantity = row.querySelector('.shop-list-item__quantity');
    let unit = row.querySelector('.shop-list-item__unit');
    const name = row.querySelector('.productivity-shopping__item-name');
    if (!(quantity instanceof HTMLElement)) {
      quantity = document.createElement('span');
      quantity.className = 'shop-list-item__quantity';
      if (name?.nextSibling) row.insertBefore(quantity, name.nextSibling);
      else row.appendChild(quantity);
    }
    if (!(unit instanceof HTMLElement)) {
      unit = document.createElement('span');
      unit.className = 'shop-list-item__unit';
      if (quantity.nextSibling) row.insertBefore(unit, quantity.nextSibling);
      else row.appendChild(unit);
    }

    const normalized = Array.isArray(measures) ? measures.filter(Boolean) : [];
    if (normalized.length === 1) {
      setText(quantity, normalized[0].quantityLabel || '');
      setText(unit, normalized[0].unitLabel || '');
      unit.dataset.combined = 'false';
      quantity.hidden = false;
      unit.hidden = false;
      return;
    }
    if (normalized.length > 1) {
      setText(quantity, '');
      setText(unit, normalized
        .map((measure) => [measure.quantityLabel, measure.unitLabel].filter(Boolean).join(' '))
        .filter(Boolean)
        .join(' + '));
      unit.dataset.combined = 'true';
      quantity.hidden = true;
      unit.hidden = false;
      return;
    }
    setText(quantity, '—');
    setText(unit, '');
    unit.dataset.combined = 'false';
    quantity.hidden = false;
    unit.hidden = false;
  };

  const enhancePanel = (panel) => {
    if (!(panel instanceof HTMLElement)) return;
    panel.classList.add('shop-list-outline');
    const grouping = getGroupingMode();
    const plannedRecipes = getPlannedRecipes();
    const servingOverrides = getServingOverrides();
    const index = getMatcherIndex();

    panel.querySelectorAll('.productivity-shopping__category').forEach((category) => {
      if (!(category instanceof HTMLElement)) return;
      const title = category.querySelector('.productivity-shopping__category-title');
      if (title instanceof HTMLElement) {
        const label = String(title.textContent || '').trim();
        title.dataset.categoryIcon = getCategoryIcon(label, grouping);
        title.dataset.grouping = grouping;
      }

      category.querySelectorAll('.productivity-shopping__item').forEach((row) => {
        if (!(row instanceof HTMLElement)) return;
        row.classList.add('shop-list-item');
        const purchase = row.querySelector('.shopping-management__purchase');
        const purchaseMeasure = purchase instanceof HTMLElement ? parsePurchaseMeasure(purchase.textContent) : null;
        if (purchaseMeasure) {
          setRowMeasure(row, [purchaseMeasure]);
          purchase.hidden = true;
          purchase.dataset.shopOutlineHidden = 'true';
          return;
        }
        const slug = String(row.dataset.shoppingSlug || '').trim();
        setRowMeasure(row, slug ? collectRecipeMeasures(slug, plannedRecipes, servingOverrides, index) : []);
      });
    });
  };

  const sync = () => document.querySelectorAll(PANEL_SELECTOR).forEach(enhancePanel);

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
    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.type === 'childList' && record.addedNodes.length > 0)) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    global.addEventListener('storage', (event) => {
      if ([APP_STATE_STORAGE_KEY, MEAL_PLAN_STORAGE_KEY, SHOPPING_SETTINGS_STORAGE_KEY].includes(event.key)) schedule();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
