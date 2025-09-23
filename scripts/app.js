
;(function () {
  const recipes = Array.isArray(window.BLISSFUL_RECIPES) ? window.BLISSFUL_RECIPES : [];
  const ingredients = Array.isArray(window.BLISSFUL_INGREDIENTS) ? window.BLISSFUL_INGREDIENTS : [];

  if (!recipes.length || !ingredients.length) {
    console.error('Blissful Reverie data could not be loaded.');
    return;
  }

  const matching = window.BlissfulMatching || {};
  const { createIngredientMatcherIndex, mapRecipesToIngredientMatches } = matching;
  if (
    typeof createIngredientMatcherIndex !== 'function'
    || typeof mapRecipesToIngredientMatches !== 'function'
  ) {
    console.error('Blissful Reverie ingredient matching utilities are unavailable.');
    return;
  }

  const THEME_STORAGE_KEY = 'blissful-theme';
  const THEME_OPTIONS = {
    light: [
      {
        id: 'serene',
        label: 'Serene',
        preview: 'linear-gradient(135deg, #4453d6, #f59e0b)',
      },
      {
        id: 'sunrise',
        label: 'Sunrise',
        preview: 'linear-gradient(135deg, #f97316, #0ea5e9)',
      },
      {
        id: 'meadow',
        label: 'Meadow',
        preview: 'linear-gradient(135deg, #2f855a, #6366f1)',
      },
      {
        id: 'mist',
        label: 'Misty Morning',
        preview: 'linear-gradient(135deg, #38bdf8, #a855f7)',
      },
      {
        id: 'blossom',
        label: 'Blossom',
        preview: 'linear-gradient(135deg, #ec4899, #22d3ee)',
      },
      {
        id: 'citrine',
        label: 'Citrine Glow',
        preview: 'linear-gradient(135deg, #facc15, #3b82f6)',
      },
    ],
    dark: [
      {
        id: 'midnight',
        label: 'Midnight',
        preview: 'linear-gradient(135deg, #2f6df0, #f472b6)',
      },
      {
        id: 'nebula',
        label: 'Nebula',
        preview: 'linear-gradient(135deg, #a855f7, #22d3ee)',
      },
      {
        id: 'forest',
        label: 'Forest',
        preview: 'linear-gradient(135deg, #34d399, #fbbf24)',
      },
      {
        id: 'ember',
        label: 'Ember',
        preview: 'linear-gradient(135deg, #f97316, #2563eb)',
      },
      {
        id: 'abyss',
        label: 'Abyss',
        preview: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
      },
      {
        id: 'velvet',
        label: 'Velvet Night',
        preview: 'linear-gradient(135deg, #f472b6, #14b8a6)',
      },
    ],
    sepia: [
      {
        id: 'classic',
        label: 'Classic Sepia',
        preview: 'linear-gradient(135deg, #b7791f, #2f855a)',
      },
      {
        id: 'copper',
        label: 'Copper Glow',
        preview: 'linear-gradient(135deg, #c26a3d, #0f766e)',
      },
      {
        id: 'umber',
        label: 'Deep Umber',
        preview: 'linear-gradient(135deg, #8a4b2a, #3b82f6)',
      },
    ],
  };

  const DEFAULT_THEME_SELECTIONS = {
    light: 'serene',
    dark: 'midnight',
    sepia: 'classic',
  };

  const DEFAULT_MODE = 'light';
  const AVAILABLE_MODES = Object.keys(THEME_OPTIONS);

  const MEASUREMENT_STORAGE_KEY = 'blissful-measurement';
  const MEASUREMENT_SYSTEMS = ['imperial', 'metric'];
  const DEFAULT_MEASUREMENT_SYSTEM = 'imperial';

  const resolveFallbackMode = () =>
    AVAILABLE_MODES.includes(DEFAULT_MODE) ? DEFAULT_MODE : AVAILABLE_MODES[0];

  const loadThemePreferences = () => {
    const fallbackMode = resolveFallbackMode();
    const fallback = { mode: fallbackMode, selections: { ...DEFAULT_THEME_SELECTIONS } };
    try {
      const stored = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY));
      if (!stored || typeof stored !== 'object') {
        return fallback;
      }
      const mode = AVAILABLE_MODES.includes(stored.mode) ? stored.mode : fallbackMode;
      const selections = { ...DEFAULT_THEME_SELECTIONS, ...(stored.selections || {}) };
      AVAILABLE_MODES.forEach((key) => {
        const options = Array.isArray(THEME_OPTIONS[key]) ? THEME_OPTIONS[key] : [];
        if (!options.length) return;
        if (!options.some((option) => option.id === selections[key])) {
          const fallbackSelection =
            DEFAULT_THEME_SELECTIONS[key] || (options[0] ? options[0].id : undefined);
          if (fallbackSelection) {
            selections[key] = fallbackSelection;
          }
        }
      });
      return { mode, selections };
    } catch (error) {
      console.warn('Unable to read saved theme preferences.', error);
      return fallback;
    }
  };

  const themePreferences = loadThemePreferences();

  const loadMeasurementPreference = () => {
    try {
      const stored = localStorage.getItem(MEASUREMENT_STORAGE_KEY);
      if (typeof stored === 'string' && MEASUREMENT_SYSTEMS.includes(stored)) {
        return stored;
      }
    } catch (error) {
      console.warn('Unable to read measurement preference.', error);
    }
    return DEFAULT_MEASUREMENT_SYSTEM;
  };

  const measurementPreference = loadMeasurementPreference();

  const FAVORITES_STORAGE_KEY = 'blissful-favorites';

  const recipeIdSet = new Set(recipes.map((recipe) => recipe.id));

  const loadFavoriteRecipeIds = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY));
      if (!Array.isArray(stored)) {
        return [];
      }
      const filtered = new Set();
      stored.forEach((id) => {
        if (recipeIdSet.has(id)) {
          filtered.add(id);
        }
      });
      return Array.from(filtered);
    } catch (error) {
      console.warn('Unable to read favorite recipes.', error);
      return [];
    }
  };

  const favoriteRecipeIds = loadFavoriteRecipeIds();

  const getDefaultMealFilters = () => ({
    search: '',
    ingredients: [],
    tags: [],
    allergies: [],
    equipment: [],
    favoritesOnly: false,
  });

  const getDefaultPantryFilters = () => ({
    search: '',
    categories: [],
    tags: [],
    allergens: [],
  });

  const state = {
    activeView: 'meals',
    mealFilters: getDefaultMealFilters(),
    pantryFilters: getDefaultPantryFilters(),
    servingOverrides: {},
    notes: {},
    openNotes: {},
    pantryInventory: {},
    themeMode: themePreferences.mode,
    themeSelections: { ...themePreferences.selections },
    measurementSystem: measurementPreference,
    favoriteRecipes: new Set(favoriteRecipeIds),
  };

  const equipmentOptions = Array.from(
    new Set(
      recipes.flatMap((recipe) => Array.isArray(recipe.equipment) ? recipe.equipment : []),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const TAG_SYNONYM_DEFINITIONS = [
    { canonical: 'Autumn / Fall', tags: ['Autumn', 'Fall'] },
    { canonical: 'Bright', tags: ['Citrus'] },
    { canonical: 'Earthy', tags: ['Coffee', 'Matcha', 'Tea'] },
    { canonical: 'Nutty', tags: ['Nuts', 'Sesame'] },
    { canonical: 'Rich', tags: ['Dairy'] },
    { canonical: 'Savory', tags: ['Vegetable', 'Potato', 'Seafood'] },
    { canonical: 'Spicy', tags: ['Spicy'] },
    { canonical: 'Sweet', tags: ['Chocolate', 'Fruit'] },
    { canonical: 'Sweet & Savory', tags: ['Sweet Savory'] },
    { canonical: 'Tropical', tags: ['Tropical'] },
  ];

  const ALWAYS_AVAILABLE_TAGS = ['Spring', 'Winter'];

  const canonicalTagLookup = new Map();
  const tagToCanonical = new Map();

  const registerCanonicalTag = (canonical, tags) => {
    const normalizedCanonical = typeof canonical === 'string' ? canonical : '';
    if (!normalizedCanonical) return;
    let set = canonicalTagLookup.get(normalizedCanonical);
    if (!set) {
      set = new Set();
      canonicalTagLookup.set(normalizedCanonical, set);
    }
    (Array.isArray(tags) ? tags : []).forEach((tag) => {
      if (typeof tag !== 'string' || !tag) return;
      set.add(tag);
      tagToCanonical.set(tag, normalizedCanonical);
    });
  };

  TAG_SYNONYM_DEFINITIONS.forEach(({ canonical, tags }) => registerCanonicalTag(canonical, tags));

  const rawTagSet = new Set(
    recipes.flatMap((recipe) => (Array.isArray(recipe.tags) ? recipe.tags : [])),
  );
  ALWAYS_AVAILABLE_TAGS.forEach((tag) => rawTagSet.add(tag));
  TAG_SYNONYM_DEFINITIONS.forEach(({ canonical }) => rawTagSet.add(canonical));
  const rawTagOptions = Array.from(rawTagSet).sort((a, b) => a.localeCompare(b));

  const TAG_CATEGORY_DEFINITIONS = [
    {
      id: 'meal-time',
      label: 'Meal & Course',
      tags: ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Side', 'Dessert', 'Tea Time'],
    },
    {
      id: 'seasonal',
      label: 'Seasonal',
      tags: ['Spring', 'Summer', 'Autumn / Fall', 'Winter'],
    },
    {
      id: 'cuisine',
      label: 'Cuisine & Region',
      tags: ['Asian Inspired', 'Indian', 'Italian', 'Mediterranean', 'North African', 'Tex-Mex', 'Tacos'],
    },
    {
      id: 'diet',
      label: 'Diet & Nutrition',
      tags: [
        'Vegetarian',
        'Vegan',
        'Gluten Free',
        'Dairy Free',
        'No Dairy',
        'Low Carb',
        'Low Sodium',
        'Whole Grains',
        'High Protein',
      ],
    },
    {
      id: 'occasion',
      label: 'Occasion & Lifestyle',
      tags: [
        'Comfort Food',
        'Elegant',
        'Freezer Friendly',
        'Make Ahead',
        'Meal Prep',
        'Party',
        'Picnic',
        'Quick',
        'Weeknight',
        'Kid Friendly',
        'Holiday',
      ],
    },
    {
      id: 'technique',
      label: 'Technique & Prep',
      tags: ['Baked', 'Baking', 'No Bake', 'One Pan', 'One Pot', 'Stir Fry', 'Crispy', 'Frozen'],
    },
    {
      id: 'dish',
      label: 'Dish & Format',
      tags: ['Casserole', 'Pasta', 'Baked Pasta', 'Rice Bowl', 'Sandwich', 'Soup', 'Flatbread', 'Warm Salad', 'Cookies'],
    },
    {
      id: 'ingredients',
      label: 'Flavor',
      tags: ['Bright', 'Earthy', 'Nutty', 'Rich', 'Savory', 'Spicy', 'Sweet', 'Sweet & Savory', 'Tropical'],
    },
  ];

  const TAG_CATEGORY_LOOKUP = new Map();
  TAG_CATEGORY_DEFINITIONS.forEach((group) => {
    group.tags.forEach((tag) => {
      if (!TAG_CATEGORY_LOOKUP.has(tag)) {
        TAG_CATEGORY_LOOKUP.set(tag, group.id);
      }
      registerCanonicalTag(tag, [tag]);
    });
  });

  TAG_SYNONYM_DEFINITIONS.forEach(({ canonical, tags }) => {
    const groupId = TAG_CATEGORY_LOOKUP.get(canonical);
    if (!groupId) return;
    tags.forEach((tag) => {
      if (!TAG_CATEGORY_LOOKUP.has(tag)) {
        TAG_CATEGORY_LOOKUP.set(tag, groupId);
      }
    });
  });

  const ensureCanonicalTag = (value) => {
    const mapped = tagToCanonical.get(value);
    if (mapped) {
      registerCanonicalTag(mapped, [value]);
      return mapped;
    }
    registerCanonicalTag(value, [value]);
    return value;
  };

  const createTagGroups = (options) => {
    const baseGroups = TAG_CATEGORY_DEFINITIONS.map((group) => ({
      id: group.id,
      label: group.label,
      options: [],
    }));
    const defaultGroup = { id: 'other', label: 'Other Tags', options: [] };
    const groupIndex = new Map(baseGroups.map((group) => [group.id, group]));
    const canonicalEntries = new Map();

    const recordCanonicalOption = (canonical, tag, groupId) => {
      if (!canonical) return;
      const entry = canonicalEntries.get(canonical) || {
        tags: new Set(),
        groupIds: new Set(),
      };
      if (tag) entry.tags.add(tag);
      if (groupId) entry.groupIds.add(groupId);
      canonicalEntries.set(canonical, entry);
    };

    options.forEach((tag) => {
      const canonical = ensureCanonicalTag(tag);
      const groupId = TAG_CATEGORY_LOOKUP.get(tag);
      recordCanonicalOption(canonical, tag, groupId);
    });

    TAG_SYNONYM_DEFINITIONS.forEach(({ canonical, tags }) => {
      const groupId = TAG_CATEGORY_LOOKUP.get(canonical);
      tags.forEach((tag) => {
        recordCanonicalOption(canonical, tag, groupId);
      });
    });

    ALWAYS_AVAILABLE_TAGS.forEach((tag) => {
      const canonical = ensureCanonicalTag(tag);
      const groupId = TAG_CATEGORY_LOOKUP.get(canonical) || TAG_CATEGORY_LOOKUP.get(tag);
      recordCanonicalOption(canonical, tag, groupId);
    });

    canonicalEntries.forEach((entry, canonical) => {
      const actualTags = Array.from(canonicalTagLookup.get(canonical) || entry.tags || []);
      if (!actualTags.length) return;
      const preferredGroupId = Array.from(entry.groupIds).find((id) => groupIndex.has(id));
      const fallbackGroupId = actualTags
        .map((tag) => TAG_CATEGORY_LOOKUP.get(tag))
        .find((id) => id && groupIndex.has(id));
      const target = (preferredGroupId && groupIndex.get(preferredGroupId))
        || (fallbackGroupId && groupIndex.get(fallbackGroupId))
        || defaultGroup;
      if (!target) return;
      target.options.push({ value: canonical, label: canonical, tags: actualTags });
    });

    const populatedGroups = baseGroups
      .filter((group) => group.options.length > 0)
      .map((group) => ({
        ...group,
        options: group.options.sort((a, b) => a.label.localeCompare(b.label)),
      }));
    if (defaultGroup.options.length) {
      populatedGroups.push({
        ...defaultGroup,
        options: defaultGroup.options.sort((a, b) => a.label.localeCompare(b.label)),
      });
    }
    return populatedGroups;
  };

  const excludedTags = new Set();
  equipmentOptions.forEach((item) => excludedTags.add(item));
  const tagOptions = rawTagOptions.filter((tag) => !excludedTags.has(tag));
  const mealTagGroups = createTagGroups(tagOptions);

  const allergyDefaults = ['dairy', 'gluten', 'eggs', 'nuts', 'soy', 'fish', 'shellfish'];
  const allergyOptions = Array.from(
    new Set([
      ...allergyDefaults,
      ...recipes.flatMap((recipe) => (Array.isArray(recipe.allergens) ? recipe.allergens : [])),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const categoryOrder = (() => {
    const seen = new Set();
    const order = ['All'];
    ingredients.forEach((ingredient) => {
      if (!seen.has(ingredient.category)) {
        seen.add(ingredient.category);
        order.push(ingredient.category);
      }
    });
    return order;
  })();

  const categoryRanks = new Map();
  categoryOrder.slice(1).forEach((category, index) => {
    categoryRanks.set(category, index);
  });

  const ingredientCategoryOptions = categoryOrder.slice(1);
  const ingredientTagSet = new Set(
    ingredients.flatMap((ingredient) =>
      Array.isArray(ingredient.tags) ? ingredient.tags.map((tag) => String(tag)) : [],
    ),
  );
  const ingredientTagsSorted = Array.from(ingredientTagSet).sort((a, b) => a.localeCompare(b));
  const allergenTagPattern = /(contains|free)/i;
  const pantryAllergenOptions = ingredientTagsSorted.filter((tag) => allergenTagPattern.test(tag));
  const pantryTagOptions = ingredientTagsSorted.filter((tag) => !allergenTagPattern.test(tag));

  const INGREDIENT_FILTER_GROUPS = [
    { id: 'protein', label: 'Protein', categories: ['Meat', 'Seafood'] },
    { id: 'legumes', label: 'Legumes & Plant Protein', categories: ['Legume'] },
    { id: 'vegetables', label: 'Vegetables', categories: ['Vegetable'] },
    { id: 'fruits', label: 'Fruits', categories: ['Fruit'] },
    { id: 'pasta-grains', label: 'Pasta & Grains', categories: ['Pasta', 'Grain'] },
    { id: 'dairy-eggs', label: 'Dairy & Eggs', categories: ['Dairy'] },
    { id: 'baking', label: 'Baking Essentials', categories: ['Baking'] },
    { id: 'herbs-spices', label: 'Herbs & Spices', categories: ['Herb', 'Spice'] },
    { id: 'nuts-seeds', label: 'Nuts & Seeds', categories: ['Nut/Seed'] },
    { id: 'oils-condiments', label: 'Oils & Condiments', categories: ['Oil/Fat', 'Condiment/Sauce'] },
    { id: 'sweeteners', label: 'Sweeteners', categories: ['Sweetener'] },
    { id: 'broths-beverages', label: 'Broths & Beverages', categories: ['Beverage'] },
  ];

  const ingredientMatcherIndex = createIngredientMatcherIndex(ingredients);
  const { recipeIngredientMatches, ingredientUsage } = mapRecipesToIngredientMatches(
    recipes,
    ingredientMatcherIndex,
  );

  const ingredientFilterGroups = INGREDIENT_FILTER_GROUPS.map((group) => {
    const options = ingredients
      .filter(
        (ingredient) =>
          group.categories.includes(ingredient.category) && ingredientUsage.get(ingredient.slug),
      )
      .map((ingredient) => ({ slug: ingredient.slug, label: ingredient.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return { id: group.id, label: group.label, options };
  }).filter((group) => group.options.length);

  const PANTRY_UNITS = [
    'each',
    'oz',
    'gram',
    'kilogram',
    'pound',
    'tsp',
    'tbsp',
    'cup',
    'quart',
    'liter',
    'ml',
    'jar',
    'box',
    'bag',
    'can',
    'bottle',
    'pack',
  ];

  const DEFAULT_PANTRY_UNIT = 'each';

  const MEASUREMENT_CONVERSIONS = {
    metric: {
      cup: { unit: 'mL', factor: 240 },
      cups: { unit: 'mL', factor: 240 },
      tablespoon: { unit: 'mL', factor: 15 },
      tablespoons: { unit: 'mL', factor: 15 },
      tbsp: { unit: 'mL', factor: 15 },
      teaspoon: { unit: 'mL', factor: 5 },
      teaspoons: { unit: 'mL', factor: 5 },
      tsp: { unit: 'mL', factor: 5 },
      ounce: { unit: 'g', factor: 28.3495 },
      ounces: { unit: 'g', factor: 28.3495 },
      oz: { unit: 'g', factor: 28.3495 },
      pound: { unit: 'g', factor: 453.592 },
      pounds: { unit: 'g', factor: 453.592 },
      lb: { unit: 'g', factor: 453.592 },
      lbs: { unit: 'g', factor: 453.592 },
      quart: { unit: 'mL', factor: 946.353 },
      quarts: { unit: 'mL', factor: 946.353 },
      pint: { unit: 'mL', factor: 473.176 },
      pints: { unit: 'mL', factor: 473.176 },
      gallon: { unit: 'L', factor: 3.78541 },
      gallons: { unit: 'L', factor: 3.78541 },
    },
    imperial: {
      gram: { unit: 'oz', factor: 0.035274 },
      grams: { unit: 'oz', factor: 0.035274 },
      g: { unit: 'oz', factor: 0.035274 },
      kilogram: { unit: 'lb', factor: 2.20462 },
      kilograms: { unit: 'lb', factor: 2.20462 },
      kg: { unit: 'lb', factor: 2.20462 },
      liter: { unit: 'cups', factor: 4.22675 },
      liters: { unit: 'cups', factor: 4.22675 },
      l: { unit: 'cups', factor: 4.22675 },
      milliliter: { unit: 'tsp', factor: 0.202884 },
      milliliters: { unit: 'tsp', factor: 0.202884 },
      ml: { unit: 'tsp', factor: 0.202884 },
    },
  };

  const MEASUREMENT_DISPLAY_PRECISION = {
    g: 0,
    ml: 1,
    l: 2,
    oz: 2,
    lb: 2,
    cups: 2,
    tsp: 1,
  };

  const checkboxRegistry = {
    meals: {
      ingredients: new Map(),
      tags: new Map(),
      allergies: new Map(),
      equipment: new Map(),
    },
    pantry: {
      categories: new Map(),
      tags: new Map(),
      allergens: new Map(),
    },
  };

  const tagGroupSummaryRegistry = {
    meals: [],
    pantry: [],
  };

  const elements = {};
  let configuredFilterView = null;

  const getActiveFilters = () =>
    state.activeView === 'meals' ? state.mealFilters : state.pantryFilters;

  const setDocumentThemeAttributes = (mode, theme) => {
    if (document.documentElement.dataset.mode !== mode) {
      document.documentElement.dataset.mode = mode;
    }
    if (theme) {
      if (document.documentElement.dataset.theme !== theme) {
        document.documentElement.dataset.theme = theme;
      }
    } else {
      delete document.documentElement.dataset.theme;
    }
  };

  let lastPersistedTheme = null;
  let lastPersistedMeasurement = null;
  let lastPersistedFavorites = JSON.stringify(favoriteRecipeIds);

  const persistFavoriteRecipeIds = () => {
    const serialized = JSON.stringify(Array.from(state.favoriteRecipes));
    if (serialized === lastPersistedFavorites) {
      return;
    }
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, serialized);
      lastPersistedFavorites = serialized;
    } catch (error) {
      console.warn('Unable to persist favorite recipes.', error);
    }
  };

  const applyColorTheme = (shouldPersist = true) => {
    const mode = state.themeMode;
    const options = THEME_OPTIONS[mode] || [];
    const fallback = DEFAULT_THEME_SELECTIONS[mode] || (options[0] ? options[0].id : undefined);
    const currentSelection = state.themeSelections[mode];
    const activeTheme = options.some((option) => option.id === currentSelection)
      ? currentSelection
      : fallback;
    const selectionChanged = activeTheme !== currentSelection;
    if (selectionChanged) {
      state.themeSelections[mode] = activeTheme;
    }
    setDocumentThemeAttributes(mode, activeTheme);
    if (!shouldPersist && !selectionChanged) return;
    const serialized = JSON.stringify({ mode, selections: { ...state.themeSelections } });
    if (serialized === lastPersistedTheme) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, serialized);
      lastPersistedTheme = serialized;
    } catch (error) {
      console.warn('Unable to persist theme preferences.', error);
    }
  };

  const updateModeButtons = () => {
    if (!Array.isArray(elements.modeToggleButtons)) return;
    elements.modeToggleButtons.forEach((button) => {
      const mode = button.dataset.mode;
      const isActive = mode === state.themeMode;
      button.classList.toggle('mode-toggle__button--active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const renderThemeOptions = () => {
    if (!elements.themeOptions) return;
    const currentMode = state.themeMode;
    const options = THEME_OPTIONS[currentMode] || [];
    const activeTheme = state.themeSelections[currentMode];
    elements.themeOptions.innerHTML = '';
    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'theme-option';
      button.style.setProperty('--theme-preview-color', option.preview);
      const isActive = option.id === activeTheme;
      if (isActive) {
        button.classList.add('theme-option--active');
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.setAttribute('aria-pressed', 'false');
      }
      button.dataset.themeOption = option.id;
      button.textContent = option.label;
      button.addEventListener('click', () => {
        if (state.themeSelections[currentMode] === option.id) return;
        state.themeSelections[currentMode] = option.id;
        applyColorTheme();
        renderThemeOptions();
      });
      elements.themeOptions.appendChild(button);
    });
  };

  const setThemeMode = (mode) => {
    const options = Array.isArray(THEME_OPTIONS[mode]) ? THEME_OPTIONS[mode] : [];
    if (!options.length || state.themeMode === mode) return;
    state.themeMode = mode;
    if (!options.some((option) => option.id === state.themeSelections[mode])) {
      const fallbackSelection =
        DEFAULT_THEME_SELECTIONS[mode] || (options[0] ? options[0].id : undefined);
      if (fallbackSelection) {
        state.themeSelections[mode] = fallbackSelection;
      }
    }
    applyColorTheme();
    updateModeButtons();
    renderThemeOptions();
  };

  const initThemeControls = () => {
    applyColorTheme();
    updateModeButtons();
    renderThemeOptions();
  };

  const persistMeasurementPreference = () => {
    const preference = state.measurementSystem;
    if (preference === lastPersistedMeasurement) return;
    try {
      localStorage.setItem(MEASUREMENT_STORAGE_KEY, preference);
      lastPersistedMeasurement = preference;
    } catch (error) {
      console.warn('Unable to persist measurement preference.', error);
    }
  };

  const updateMeasurementButtons = () => {
    if (!Array.isArray(elements.measurementToggleButtons)) return;
    elements.measurementToggleButtons.forEach((button) => {
      const system = button.dataset.measurement;
      const isActive = system === state.measurementSystem;
      button.classList.toggle('mode-toggle__button--active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const setMeasurementSystem = (system) => {
    if (!MEASUREMENT_SYSTEMS.includes(system) || state.measurementSystem === system) return;
    state.measurementSystem = system;
    persistMeasurementPreference();
    updateMeasurementButtons();
    renderApp();
  };

  const initMeasurementControls = () => {
    updateMeasurementButtons();
  };

  const normalizeText = (value) => String(value || '').toLowerCase();

  const roundToPrecision = (value, decimals) => {
    if (!Number.isFinite(value) || !Number.isInteger(decimals) || decimals < 0) {
      return value;
    }
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  };

  const formatQuantity = (quantity) => {
    if (quantity === null || quantity === undefined) return '';
    const rounded = Math.round(quantity * 100) / 100;
    if (Number.isInteger(rounded)) {
      return String(rounded);
    }
    return rounded.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  };

  const convertMeasurement = (quantity, unit, targetSystem) => {
    if (!Number.isFinite(quantity)) {
      return { quantity, unit };
    }
    const normalizedUnit = typeof unit === 'string' ? unit.trim().toLowerCase() : '';
    if (!normalizedUnit) {
      return { quantity, unit };
    }
    const conversions = MEASUREMENT_CONVERSIONS[targetSystem] || {};
    const conversion = conversions[normalizedUnit];
    if (!conversion) {
      return { quantity, unit };
    }
    return {
      quantity: quantity * conversion.factor,
      unit: conversion.unit,
    };
  };

  const formatIngredientMeasurement = (quantity, unit) => {
    const normalizedUnit = typeof unit === 'string' ? unit.trim() : '';
    if (!Number.isFinite(quantity)) {
      return {
        quantityText: typeof quantity === 'string' ? quantity : '',
        unitText: normalizedUnit,
      };
    }
    let convertedQuantity = quantity;
    let convertedUnit = normalizedUnit;
    if (MEASUREMENT_SYSTEMS.includes(state.measurementSystem)) {
      const result = convertMeasurement(quantity, normalizedUnit, state.measurementSystem);
      convertedQuantity = Number.isFinite(result.quantity) ? result.quantity : quantity;
      convertedUnit = result.unit || normalizedUnit;
    }
    const finalUnit = typeof convertedUnit === 'string' ? convertedUnit.trim() : '';
    const precisionKey = finalUnit.toLowerCase();
    const hasPrecision = Object.prototype.hasOwnProperty.call(
      MEASUREMENT_DISPLAY_PRECISION,
      precisionKey,
    );
    const precision = hasPrecision ? MEASUREMENT_DISPLAY_PRECISION[precisionKey] : null;
    const adjustedQuantity =
      hasPrecision && Number.isFinite(precision)
        ? roundToPrecision(convertedQuantity, precision)
        : convertedQuantity;
    return {
      quantityText: formatQuantity(adjustedQuantity),
      unitText: finalUnit,
    };
  };

  const formatAllergenLabel = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    return text
      .split(/([\s/_-]+)/)
      .map((segment) => {
        if (!segment) return segment;
        if (!/[a-z0-9]/i.test(segment)) {
          if (/^_+$/.test(segment)) {
            return ' ';
          }
          return segment;
        }
        const lower = segment.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join('');
  };

  const getPantryEntry = (slug) => state.pantryInventory[slug] || { quantity: '', unit: DEFAULT_PANTRY_UNIT };

  const updatePantryEntry = (slug, patch) => {
    const existing = getPantryEntry(slug);
    const next = { ...existing, ...patch };
    const quantityValue = typeof next.quantity === 'string' ? next.quantity.trim() : next.quantity;
    const unitValue = typeof next.unit === 'string' ? next.unit.trim() : next.unit;
    const isQuantityEmpty = quantityValue === '' || quantityValue === null || quantityValue === undefined;
    const normalizedUnit = unitValue || DEFAULT_PANTRY_UNIT;
    if (isQuantityEmpty && normalizedUnit === DEFAULT_PANTRY_UNIT) {
      delete state.pantryInventory[slug];
    } else {
      state.pantryInventory[slug] = {
        quantity: isQuantityEmpty ? '' : quantityValue,
        unit: normalizedUnit,
      };
    }
  };

  const cacheElements = () => {
    elements.viewToggleButtons = Array.from(document.querySelectorAll('[data-view-target]'));
    elements.mealView = document.getElementById('meal-view');
    elements.pantryView = document.getElementById('pantry-view');
    elements.mealGrid = document.getElementById('meal-grid');
    elements.mealCount = document.getElementById('meal-count');
    elements.pantryGrid = document.getElementById('pantry-grid');
    elements.pantryCount = document.getElementById('pantry-count');
    elements.filterSearch = document.getElementById('filter-search');
    elements.resetButton = document.getElementById('reset-filters');
    elements.favoriteFilterToggle = document.getElementById('favorite-filter');
    elements.ingredientSection = document.getElementById('ingredient-section');
    elements.tagSection = document.getElementById('tag-section');
    elements.allergySection = document.getElementById('allergy-section');
    elements.equipmentSection = document.getElementById('equipment-section');
    elements.ingredientSummary = document.getElementById('ingredient-summary');
    elements.tagSummary = document.getElementById('tag-summary');
    elements.allergySummary = document.getElementById('allergy-summary');
    elements.equipmentSummary = document.getElementById('equipment-summary');
    elements.ingredientOptions = document.getElementById('ingredient-options');
    elements.tagOptions = document.getElementById('tag-options');
    elements.allergyOptions = document.getElementById('allergy-options');
    elements.equipmentOptions = document.getElementById('equipment-options');
    elements.themeOptions = document.getElementById('theme-options');
    elements.modeToggleButtons = Array.from(
      document.querySelectorAll('#mode-toggle .mode-toggle__button'),
    );
    elements.measurementToggleButtons = Array.from(
      document.querySelectorAll('#measurement-toggle .mode-toggle__button'),
    );
  };

  const populateCheckboxGroup = (view, container, options, field, config) => {
    let spanClassName;
    let labelFormatter;
    if (typeof config === 'string') {
      spanClassName = config;
    } else if (config && typeof config === 'object') {
      spanClassName = config.spanClassName;
      labelFormatter = config.labelFormatter;
    }
    if (!container) return;
    const registry = checkboxRegistry[view]?.[field];
    if (!registry) return;
    const filters = view === 'meals' ? state.mealFilters : state.pantryFilters;
    if (!Array.isArray(filters[field])) {
      filters[field] = [];
    }
    container.innerHTML = '';
    registry.clear();
    options.forEach((option) => {
      const label = document.createElement('label');
      label.className = 'checkbox-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = option;
      input.checked = filters[field].includes(option);
      input.addEventListener('change', () => {
        const current = new Set(filters[field]);
        if (input.checked) {
          current.add(option);
        } else {
          current.delete(option);
        }
        filters[field] = Array.from(current);
        renderApp();
      });
      label.appendChild(input);
      const span = document.createElement('span');
      if (spanClassName) {
        span.className = spanClassName;
      }
      span.textContent = typeof labelFormatter === 'function' ? labelFormatter(option) : option;
      label.appendChild(span);
      container.appendChild(label);
      registry.set(option, input);
    });
  };

  const populateGroupedTagOptions = (view, container, groups, field) => {
    if (!container) return;
    const registry = checkboxRegistry[view]?.[field];
    if (!registry) return;
    const filters = view === 'meals' ? state.mealFilters : state.pantryFilters;
    if (!Array.isArray(filters[field])) {
      filters[field] = [];
    }
    tagGroupSummaryRegistry[view] = [];
    container.innerHTML = '';
    registry.clear();
    container.classList.add('tag-groups');
    container.classList.remove('checkbox-grid');
    groups.forEach((group, index) => {
      if (!group.options.length) return;
      const optionValues = group.options.map((option) => option.value);
      const selectedCount = optionValues.reduce(
        (count, value) => (filters[field].includes(value) ? count + 1 : count),
        0,
      );
      const details = document.createElement('details');
      details.className = 'tag-group';
      const hasSelection = selectedCount > 0;
      details.open = hasSelection || index === 0;
      const summary = document.createElement('summary');
      summary.className = 'tag-group__summary';
      const labelSpan = document.createElement('span');
      labelSpan.className = 'tag-group__summary-label';
      labelSpan.textContent = group.label;
      summary.appendChild(labelSpan);
      const countBadge = document.createElement('span');
      countBadge.className = 'tag-group__summary-count';
      summary.appendChild(countBadge);
      const updateSelectionDisplay = (count) => {
        if (count > 0) {
          countBadge.textContent = `${count} selected`;
          countBadge.hidden = false;
          summary.setAttribute('aria-label', `${group.label} (${count} selected)`);
        } else {
          countBadge.textContent = '';
          countBadge.hidden = true;
          summary.setAttribute('aria-label', `${group.label} (no tags selected)`);
        }
      };
      updateSelectionDisplay(selectedCount);
      details.appendChild(summary);
      const optionGrid = document.createElement('div');
      optionGrid.className = 'checkbox-grid';
      const optionGridId = `tag-group-${view}-${group.id || index}-options`;
      optionGrid.id = optionGridId;
      summary.setAttribute('aria-controls', optionGridId);
      const applyExpandedState = () => {
        summary.setAttribute('aria-expanded', details.open ? 'true' : 'false');
      };
      details.addEventListener('toggle', applyExpandedState);
      applyExpandedState();
      group.options.forEach((option) => {
        const label = document.createElement('label');
        label.className = 'checkbox-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = option.value;
        input.checked = filters[field].includes(option.value);
        input.addEventListener('change', () => {
          const current = new Set(filters[field]);
          if (input.checked) {
            current.add(option.value);
          } else {
            current.delete(option.value);
          }
          filters[field] = Array.from(current);
          renderApp();
        });
        label.appendChild(input);
        const span = document.createElement('span');
        span.textContent = option.label;
        label.appendChild(span);
        optionGrid.appendChild(label);
        registry.set(option.value, input);
      });
      details.appendChild(optionGrid);
      container.appendChild(details);
      tagGroupSummaryRegistry[view].push({
        summary,
        countBadge,
        label: group.label,
        field,
        optionValues,
        updateSelectionDisplay,
      });
    });
  };

  const populateIngredientFilters = (container, groups) => {
    if (!container) return;
    const registry = checkboxRegistry.meals?.ingredients;
    if (!registry) return;
    const filters = state.mealFilters;
    if (!Array.isArray(filters.ingredients)) {
      filters.ingredients = [];
    }
    container.innerHTML = '';
    registry.clear();
    container.classList.add('ingredient-groups');
    container.classList.remove('checkbox-grid');
    groups.forEach((group, index) => {
      if (!group.options.length) return;
      const details = document.createElement('details');
      details.className = 'ingredient-group';
      const hasSelection = group.options.some((option) => filters.ingredients.includes(option.slug));
      details.open = hasSelection || index < 2;
      const summary = document.createElement('summary');
      summary.className = 'ingredient-group__summary';
      summary.textContent = group.label;
      details.appendChild(summary);
      const optionGrid = document.createElement('div');
      optionGrid.className = 'checkbox-grid';
      group.options.forEach((option) => {
        const label = document.createElement('label');
        label.className = 'checkbox-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = option.slug;
        input.checked = filters.ingredients.includes(option.slug);
        input.addEventListener('change', () => {
          const current = new Set(filters.ingredients);
          if (input.checked) {
            current.add(option.slug);
          } else {
            current.delete(option.slug);
          }
          filters.ingredients = Array.from(current);
          renderApp();
        });
        label.appendChild(input);
        const span = document.createElement('span');
        span.textContent = option.label;
        label.appendChild(span);
        optionGrid.appendChild(label);
        registry.set(option.slug, input);
      });
      details.appendChild(optionGrid);
      container.appendChild(details);
    });
  };

  const configureFilterPanel = () => {
    const view = state.activeView;
    if (configuredFilterView === view) {
      syncFilterControls();
      return;
    }
    configuredFilterView = view;
    const isMealsView = view === 'meals';
    if (elements.filterSearch) {
      const searchPlaceholder = isMealsView
        ? 'Search by name, description, or tag'
        : 'Search by ingredient name, slug, or tag';
      elements.filterSearch.placeholder = searchPlaceholder;
      elements.filterSearch.setAttribute(
        'aria-label',
        isMealsView ? 'Search recipes' : 'Search pantry',
      );
    }

    if (elements.ingredientSummary) {
      elements.ingredientSummary.textContent = isMealsView ? 'Ingredients' : 'Categories';
    }
    if (elements.tagSummary) {
      elements.tagSummary.textContent = 'Tags';
    }
    if (elements.allergySummary) {
      elements.allergySummary.textContent = isMealsView ? 'Allergies to Avoid' : 'Allergen Tags';
    }
    if (elements.equipmentSummary) {
      elements.equipmentSummary.textContent = isMealsView ? 'Equipment' : '';
    }

    if (elements.equipmentSection) {
      elements.equipmentSection.hidden = !isMealsView;
    }

    if (elements.favoriteFilterToggle) {
      if (isMealsView) {
        elements.favoriteFilterToggle.hidden = false;
        elements.favoriteFilterToggle.disabled = false;
        elements.favoriteFilterToggle.removeAttribute('aria-hidden');
      } else {
        elements.favoriteFilterToggle.hidden = true;
        elements.favoriteFilterToggle.disabled = true;
        elements.favoriteFilterToggle.setAttribute('aria-hidden', 'true');
      }
    }

    if (isMealsView) {
      populateIngredientFilters(elements.ingredientOptions, ingredientFilterGroups);
      populateGroupedTagOptions('meals', elements.tagOptions, mealTagGroups, 'tags');
      populateCheckboxGroup('meals', elements.allergyOptions, allergyOptions, 'allergies', {
        labelFormatter: formatAllergenLabel,
      });
      populateCheckboxGroup('meals', elements.equipmentOptions, equipmentOptions, 'equipment');
    } else {
      if (elements.ingredientOptions) {
        elements.ingredientOptions.classList.remove('ingredient-groups');
        elements.ingredientOptions.classList.add('checkbox-grid');
      }
      if (elements.tagOptions) {
        elements.tagOptions.classList.remove('tag-groups');
        elements.tagOptions.classList.add('checkbox-grid');
      }
      tagGroupSummaryRegistry.pantry = [];
      populateCheckboxGroup('pantry', elements.ingredientOptions, ingredientCategoryOptions, 'categories');
      populateCheckboxGroup('pantry', elements.tagOptions, pantryTagOptions, 'tags');
      populateCheckboxGroup(
        'pantry',
        elements.allergyOptions,
        pantryAllergenOptions,
        'allergens',
        { labelFormatter: formatAllergenLabel },
      );
      if (elements.equipmentOptions) {
        elements.equipmentOptions.innerHTML = '';
      }
    }

    syncFilterControls();
  };

  const syncFilterControls = () => {
    if (!elements.filterSearch) return;
    const filters = getActiveFilters();
    elements.filterSearch.value = filters.search || '';
    if (elements.favoriteFilterToggle) {
      const isMealsView = state.activeView === 'meals';
      const favoritesOnly = isMealsView && Boolean(filters.favoritesOnly);
      elements.favoriteFilterToggle.setAttribute('aria-pressed', favoritesOnly ? 'true' : 'false');
      elements.favoriteFilterToggle.classList.toggle('favorite-filter--active', favoritesOnly);
      const labelEl = elements.favoriteFilterToggle.querySelector('.favorite-filter__label');
      const favoriteCount = state.favoriteRecipes.size;
      if (labelEl) {
        if (favoritesOnly) {
          labelEl.textContent = favoriteCount
            ? `${favoriteCount} favorite${favoriteCount === 1 ? '' : 's'} selected`
            : 'No favorites selected';
        } else if (favoriteCount) {
          labelEl.textContent = `Show favorites only (${favoriteCount})`;
        } else {
          labelEl.textContent = 'Show favorites only';
        }
      }
      const titleText = favoritesOnly
        ? 'Showing favorite recipes only'
        : favoriteCount
          ? 'Show only your favorite recipes'
          : 'Show only favorite recipes';
      elements.favoriteFilterToggle.setAttribute('title', titleText);
      elements.favoriteFilterToggle.setAttribute('aria-label', titleText);
    }
    const registry = checkboxRegistry[state.activeView];
    if (!registry) return;
    Object.entries(registry).forEach(([field, map]) => {
      const selected = Array.isArray(filters[field]) ? filters[field] : [];
      map.forEach((input, option) => {
        input.checked = selected.includes(option);
      });
    });
    const summaryEntries = tagGroupSummaryRegistry[state.activeView];
    if (Array.isArray(summaryEntries)) {
      summaryEntries.forEach((entry) => {
        if (!entry) return;
        const selectedValues = Array.isArray(filters[entry.field]) ? filters[entry.field] : [];
        const selectedCount = entry.optionValues.reduce(
          (count, value) => (selectedValues.includes(value) ? count + 1 : count),
          0,
        );
        if (typeof entry.updateSelectionDisplay === 'function') {
          entry.updateSelectionDisplay(selectedCount);
        } else if (entry.countBadge && entry.summary) {
          if (selectedCount > 0) {
            entry.countBadge.textContent = `${selectedCount} selected`;
            entry.countBadge.hidden = false;
            entry.summary.setAttribute('aria-label', `${entry.label} (${selectedCount} selected)`);
          } else {
            entry.countBadge.textContent = '';
            entry.countBadge.hidden = true;
            entry.summary.setAttribute('aria-label', `${entry.label} (no tags selected)`);
          }
        }
      });
    }
  };

  const matchesMealFilters = (recipe) => {
    const filters = state.mealFilters;
    const haystack = `${recipe.name} ${recipe.description} ${(recipe.tags || []).join(' ')} ${recipe.category}`.toLowerCase();
    if (filters.search && !haystack.includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.ingredients.length) {
      const matchedIngredients = recipeIngredientMatches.get(recipe.id) || new Set();
      const hasAllSelected = filters.ingredients.every((slug) => matchedIngredients.has(slug));
      if (!hasAllSelected) {
        return false;
      }
    }
    if (filters.tags.length) {
      const recipeTags = Array.isArray(recipe.tags) ? recipe.tags : [];
      const hasAllTagSelections = filters.tags.every((selected) => {
        const candidateSet = canonicalTagLookup.get(selected);
        const available = candidateSet instanceof Set ? Array.from(candidateSet) : [selected];
        return available.some((tag) => recipeTags.includes(tag));
      });
      if (!hasAllTagSelections) {
        return false;
      }
    }
    if (filters.allergies.length && (recipe.allergens || []).some((allergen) => filters.allergies.includes(allergen))) {
      return false;
    }
    if (filters.equipment.length && !filters.equipment.every((item) => (recipe.equipment || []).includes(item))) {
      return false;
    }
    if (filters.favoritesOnly && !state.favoriteRecipes.has(recipe.id)) {
      return false;
    }
    return true;
  };

  const isRecipeFavorite = (recipeId) => state.favoriteRecipes.has(recipeId);

  const toggleFavoriteRecipe = (recipeId) => {
    if (!recipeId) return;
    if (state.favoriteRecipes.has(recipeId)) {
      state.favoriteRecipes.delete(recipeId);
    } else {
      state.favoriteRecipes.add(recipeId);
    }
    persistFavoriteRecipeIds();
    renderApp();
  };

  const createMealCard = (recipe) => {
    const card = document.createElement('article');
    card.className = 'meal-card';

    const favorite = isRecipeFavorite(recipe.id);
    if (favorite) {
      card.classList.add('meal-card--favorite');
    }

    const currentServings = state.servingOverrides[recipe.id] ?? recipe.baseServings;
    const scale = recipe.baseServings ? currentServings / recipe.baseServings : 1;

    const header = document.createElement('header');
    header.className = 'meal-card__header';

    const headerInfo = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = recipe.name;
    headerInfo.appendChild(title);

    const description = document.createElement('p');
    description.className = 'meal-card__description';
    description.textContent = recipe.description;
    headerInfo.appendChild(description);

    const tagList = document.createElement('div');
    tagList.className = 'tag-list';
    (recipe.tags || []).forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'badge';
      span.textContent = tag;
      tagList.appendChild(span);
    });
    headerInfo.appendChild(tagList);
    header.appendChild(headerInfo);

    const headerActions = document.createElement('div');
    headerActions.className = 'meal-card__header-actions';

    const favoriteButton = document.createElement('button');
    favoriteButton.type = 'button';
    favoriteButton.className = 'meal-card__favorite-button';
    favoriteButton.setAttribute('aria-pressed', favorite ? 'true' : 'false');
    favoriteButton.setAttribute(
      'aria-label',
      favorite ? 'Remove from favorites' : 'Add to favorites',
    );
    favoriteButton.title = favorite ? 'Remove from favorites' : 'Add to favorites';
    if (favorite) {
      favoriteButton.classList.add('meal-card__favorite-button--active');
    }
    favoriteButton.textContent = '♥';
    favoriteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleFavoriteRecipe(recipe.id);
    });
    headerActions.appendChild(favoriteButton);

    const controls = document.createElement('div');
    controls.className = 'serving-controls';
    const label = document.createElement('label');
    const span = document.createElement('span');
    span.textContent = 'Servings';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.value = String(currentServings);
    input.addEventListener('change', (event) => {
      const parsed = Number(event.target.value);
      const valid = Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.round(parsed)) : recipe.baseServings;
      if (valid === recipe.baseServings) {
        delete state.servingOverrides[recipe.id];
      } else {
        state.servingOverrides[recipe.id] = valid;
      }
      renderApp();
    });
    label.appendChild(span);
    label.appendChild(input);
    controls.appendChild(label);
    const base = document.createElement('p');
    base.className = 'base-serving';
    base.textContent = `Base: ${recipe.baseServings}`;
    controls.appendChild(base);
    headerActions.appendChild(controls);
    header.appendChild(headerActions);
    card.appendChild(header);

    const ingredientSection = document.createElement('section');
    ingredientSection.className = 'meal-card__section';
    const ingredientHeading = document.createElement('h4');
    ingredientHeading.textContent = 'Ingredients';
    ingredientSection.appendChild(ingredientHeading);
    const ingredientList = document.createElement('ul');
    ingredientList.className = 'ingredient-list';
    recipe.ingredients.forEach((ingredient) => {
      const item = document.createElement('li');
      const quantity = document.createElement('span');
      quantity.className = 'ingredient-quantity';
      const rawQuantity = ingredient.quantity;
      const scaledQuantity =
        typeof rawQuantity === 'number' ? rawQuantity * scale : rawQuantity;
      const measurement = formatIngredientMeasurement(scaledQuantity, ingredient.unit);
      quantity.textContent = [measurement.quantityText, measurement.unitText]
        .filter(Boolean)
        .join(' ');
      const name = document.createElement('span');
      name.className = 'ingredient-name';
      name.textContent = ingredient.item;
      item.appendChild(quantity);
      item.appendChild(name);
      ingredientList.appendChild(item);
    });
    ingredientSection.appendChild(ingredientList);
    card.appendChild(ingredientSection);

    const instructionSection = document.createElement('section');
    instructionSection.className = 'meal-card__section';
    const instructionHeading = document.createElement('h4');
    instructionHeading.textContent = 'Instructions';
    instructionSection.appendChild(instructionHeading);
    const instructionList = document.createElement('ol');
    instructionList.className = 'instruction-list';
    recipe.instructions.forEach((step) => {
      const li = document.createElement('li');
      li.textContent = step;
      instructionList.appendChild(li);
    });
    instructionSection.appendChild(instructionList);
    card.appendChild(instructionSection);

    const details = document.createElement('section');
    details.className = 'meal-card__details';

    const equipmentBlock = document.createElement('div');
    const equipmentHeading = document.createElement('h4');
    equipmentHeading.textContent = 'Equipment';
    equipmentBlock.appendChild(equipmentHeading);
    const equipmentList = document.createElement('ul');
    equipmentList.className = 'inline-list';
    (recipe.equipment || []).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      equipmentList.appendChild(li);
    });
    equipmentBlock.appendChild(equipmentList);
    details.appendChild(equipmentBlock);

    const allergenBlock = document.createElement('div');
    const allergenHeading = document.createElement('h4');
    allergenHeading.textContent = 'Allergens';
    allergenBlock.appendChild(allergenHeading);
    const allergenList = document.createElement('ul');
    allergenList.className = 'inline-list';
    if ((recipe.allergens || []).length) {
      recipe.allergens.forEach((allergen) => {
        const li = document.createElement('li');
        li.className = 'badge badge-soft';
        li.textContent = formatAllergenLabel(allergen);
        allergenList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.className = 'badge badge-soft';
      li.textContent = 'None';
      allergenList.appendChild(li);
    }
    allergenBlock.appendChild(allergenList);
    details.appendChild(allergenBlock);
    card.appendChild(details);

    if (recipe.nutritionPerServing) {
      const nutritionSection = document.createElement('section');
      nutritionSection.className = 'meal-card__section nutrition';
      const nutritionHeading = document.createElement('h4');
      nutritionHeading.textContent = 'Nutrition';
      nutritionSection.appendChild(nutritionHeading);
      const grid = document.createElement('div');
      grid.className = 'nutrition-grid';
      const totalNutrition = {};
      Object.entries(recipe.nutritionPerServing).forEach(([key, value]) => {
        totalNutrition[key] = Math.round(value * currentServings * 10) / 10;
      });
      Object.entries(recipe.nutritionPerServing).forEach(([key, value]) => {
        const cell = document.createElement('div');
        const labelEl = document.createElement('span');
        labelEl.className = 'nutrition-label';
        labelEl.textContent = key;
        const valueEl = document.createElement('span');
        valueEl.className = 'nutrition-value';
        valueEl.textContent = `${value} / serving`;
        cell.appendChild(labelEl);
        cell.appendChild(valueEl);
        if (totalNutrition[key] !== undefined) {
          const totalEl = document.createElement('span');
          totalEl.className = 'nutrition-total';
          totalEl.textContent = `${totalNutrition[key]} total`;
          cell.appendChild(totalEl);
        }
        grid.appendChild(cell);
      });
      nutritionSection.appendChild(grid);
      card.appendChild(nutritionSection);
    }

    const footer = document.createElement('footer');
    footer.className = 'meal-card__footer';
    const notesButton = document.createElement('button');
    notesButton.type = 'button';
    const isOpen = Boolean(state.openNotes[recipe.id]);
    notesButton.textContent = isOpen ? 'Hide notes' : 'Add notes';
    notesButton.addEventListener('click', () => {
      if (state.openNotes[recipe.id]) {
        delete state.openNotes[recipe.id];
      } else {
        state.openNotes[recipe.id] = true;
      }
      renderApp();
    });
    footer.appendChild(notesButton);
    if (isOpen) {
      const textarea = document.createElement('textarea');
      textarea.value = state.notes[recipe.id] || '';
      textarea.placeholder = 'Add personal notes, timing adjustments, or plating ideas';
      textarea.addEventListener('input', (event) => {
        state.notes[recipe.id] = event.target.value;
      });
      footer.appendChild(textarea);
    }
    card.appendChild(footer);

    return card;
  };

  const createPantryCard = (ingredient) => {
    const card = document.createElement('article');
    card.className = 'pantry-card';

    const entry = getPantryEntry(ingredient.slug);

    const details = document.createElement('div');
    details.className = 'pantry-card__details';

    const header = document.createElement('div');
    header.className = 'pantry-card__header';

    const title = document.createElement('h3');
    title.className = 'pantry-card__name';
    title.textContent = ingredient.name;
    header.appendChild(title);

    const inlineControls = document.createElement('div');
    inlineControls.className = 'pantry-card__inline-controls';

    const quantityInput = document.createElement('input');
    quantityInput.className = 'pantry-card__inline-input pantry-card__inline-input--quantity';
    quantityInput.type = 'number';
    quantityInput.min = '0';
    quantityInput.step = '0.25';
    quantityInput.inputMode = 'decimal';
    quantityInput.autocomplete = 'off';
    quantityInput.setAttribute('aria-label', `Quantity for ${ingredient.name}`);
    quantityInput.title = `Quantity for ${ingredient.name}`;
    if (entry.quantity !== undefined && entry.quantity !== '') {
      quantityInput.value = entry.quantity;
    } else {
      quantityInput.value = '';
    }
    quantityInput.placeholder = '0';
    quantityInput.addEventListener('input', (event) => {
      updatePantryEntry(ingredient.slug, { quantity: event.target.value });
    });
    inlineControls.appendChild(quantityInput);

    const unitInput = document.createElement('input');
    unitInput.className = 'pantry-card__inline-input pantry-card__inline-input--unit';
    unitInput.type = 'text';
    unitInput.setAttribute('list', 'pantry-unit-options');
    unitInput.placeholder = DEFAULT_PANTRY_UNIT;
    const normalizedUnit = entry.unit || DEFAULT_PANTRY_UNIT;
    unitInput.value = normalizedUnit === DEFAULT_PANTRY_UNIT ? '' : normalizedUnit;
    unitInput.autocomplete = 'off';
    unitInput.spellcheck = false;
    unitInput.setAttribute('aria-label', `Unit for ${ingredient.name}`);
    unitInput.title = `Unit for ${ingredient.name}`;
    const handleUnitChange = (event) => {
      updatePantryEntry(ingredient.slug, { unit: event.target.value });
    };
    unitInput.addEventListener('input', handleUnitChange);
    unitInput.addEventListener('change', handleUnitChange);
    inlineControls.appendChild(unitInput);

    header.appendChild(inlineControls);
    details.appendChild(header);

    if (Array.isArray(ingredient.tags) && ingredient.tags.length) {
      const tags = document.createElement('div');
      tags.className = 'pantry-card__tags';
      ingredient.tags.forEach((tag) => {
        const span = document.createElement('span');
        span.textContent = tag;
        tags.appendChild(span);
      });
      details.appendChild(tags);
    }

    card.appendChild(details);

    return card;
  };

  const renderMeals = () => {
    const filters = state.mealFilters;
    const filteredRecipes = recipes.filter((recipe) => matchesMealFilters(recipe));
    const matchLabel = filters.favoritesOnly
      ? filteredRecipes.length === 1
        ? 'favorite recipe matches'
        : 'favorite recipes match'
      : filteredRecipes.length === 1
        ? 'recipe matches'
        : 'recipes match';
    elements.mealCount.textContent = `${filteredRecipes.length} ${matchLabel} your filters.`;
    elements.mealGrid.innerHTML = '';
    if (filteredRecipes.length) {
      filteredRecipes.forEach((recipe) => {
        elements.mealGrid.appendChild(createMealCard(recipe));
      });
    } else {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const heading = document.createElement('h3');
      const paragraph = document.createElement('p');
      if (filters.favoritesOnly) {
        heading.textContent = 'No favorite recipes yet';
        paragraph.textContent =
          'Tap the heart icon on any recipe to save it as a favorite and quickly find it here.';
      } else {
        heading.textContent = 'No recipes found';
        paragraph.textContent =
          'Try removing a filter or adding more pantry items to expand your options.';
      }
      empty.appendChild(heading);
      empty.appendChild(paragraph);
      elements.mealGrid.appendChild(empty);
    }
  };

  const renderPantry = () => {
    if (!elements.pantryGrid || !elements.pantryCount) return;
    const { search, categories, tags, allergens } = state.pantryFilters;
    const query = search.trim().toLowerCase();
    const filteredItems = ingredients
      .filter((ingredient) => {
        const ingredientTags = Array.isArray(ingredient.tags) ? ingredient.tags : [];
        const category = ingredient.category;
        if (categories.length && (!category || !categories.includes(category))) return false;
        if (tags.length && !tags.every((tag) => ingredientTags.includes(tag))) return false;
        if (allergens.length && !allergens.every((tag) => ingredientTags.includes(tag))) return false;
        if (!query) return true;
        const haystack = `${ingredient.name} ${ingredient.slug} ${ingredientTags.join(' ')}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const rankA = categoryRanks.get(a.category) ?? 0;
        const rankB = categoryRanks.get(b.category) ?? 0;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });

    elements.pantryCount.textContent = filteredItems.length;
    elements.pantryGrid.innerHTML = '';
    if (!filteredItems.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const heading = document.createElement('h3');
      heading.textContent = 'No pantry items found';
      const paragraph = document.createElement('p');
      paragraph.textContent = 'Try adjusting your filters or search to find more ingredients.';
      empty.appendChild(heading);
      empty.appendChild(paragraph);
      elements.pantryGrid.appendChild(empty);
      return;
    }

    const groupedItems = [];
    filteredItems.forEach((ingredient) => {
      const categoryName = ingredient.category || 'Uncategorized';
      const previous = groupedItems[groupedItems.length - 1];
      if (!previous || previous.category !== categoryName) {
        groupedItems.push({ category: categoryName, items: [ingredient] });
      } else {
        previous.items.push(ingredient);
      }
    });

    groupedItems.forEach((group) => {
      const section = document.createElement('section');
      section.className = 'pantry-category';

      const heading = document.createElement('h3');
      heading.className = 'pantry-category__title';
      heading.textContent = group.category;
      section.appendChild(heading);

      const list = document.createElement('div');
      list.className = 'pantry-category__list';
      group.items.forEach((ingredient) => {
        list.appendChild(createPantryCard(ingredient));
      });
      section.appendChild(list);

      elements.pantryGrid.appendChild(section);
    });
  };

  const updateView = () => {
    elements.viewToggleButtons.forEach((button) => {
      const target = button.dataset.viewTarget;
      if (target === state.activeView) {
        button.classList.add('view-toggle__button--active');
      } else {
        button.classList.remove('view-toggle__button--active');
      }
    });
    if (elements.mealView) {
      elements.mealView.hidden = state.activeView !== 'meals';
    }
    if (elements.pantryView) {
      elements.pantryView.hidden = state.activeView !== 'pantry';
    }
  };

  const renderApp = () => {
    applyColorTheme(false);
    configureFilterPanel();
    if (state.activeView === 'meals') {
      renderMeals();
    } else {
      renderPantry();
    }
    updateView();
  };

  const bindEvents = () => {
    elements.viewToggleButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.viewTarget;
        if (target && target !== state.activeView) {
          state.activeView = target;
          configuredFilterView = null;
          renderApp();
        }
      });
    });

    if (elements.filterSearch) {
      elements.filterSearch.addEventListener('input', (event) => {
        const filters = getActiveFilters();
        filters.search = event.target.value;
        renderApp();
      });
    }

    if (elements.resetButton) {
      elements.resetButton.addEventListener('click', () => {
        if (state.activeView === 'meals') {
          state.mealFilters = getDefaultMealFilters();
        } else {
          state.pantryFilters = getDefaultPantryFilters();
        }
        renderApp();
      });
    }

    if (elements.favoriteFilterToggle) {
      elements.favoriteFilterToggle.addEventListener('click', () => {
        if (state.activeView !== 'meals') return;
        state.mealFilters.favoritesOnly = !state.mealFilters.favoritesOnly;
        renderApp();
      });
    }

    if (Array.isArray(elements.modeToggleButtons)) {
      elements.modeToggleButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const mode = button.dataset.mode;
          if (mode) {
            setThemeMode(mode);
          }
        });
      });
    }

    if (Array.isArray(elements.measurementToggleButtons)) {
      elements.measurementToggleButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const system = button.dataset.measurement;
          if (system) {
            setMeasurementSystem(system);
          }
        });
      });
    }
  };

  const init = () => {
    cacheElements();
    bindEvents();
    initThemeControls();
    initMeasurementControls();
    renderApp();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
