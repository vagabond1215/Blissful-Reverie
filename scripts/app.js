
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

  const APP_STATE_STORAGE_KEY = 'blissful-app-state';
  const MEAL_PLAN_STORAGE_KEY = 'blissful-meal-plan';
  const MEAL_PLAN_VIEW_MODES = ['day', 'week', 'month'];
  const DEFAULT_MEAL_PLAN_MODE = 'month';
  const AVAILABLE_VIEWS = ['meals', 'pantry', 'meal-plan'];
  const MEAL_PLAN_ENTRY_TYPES = [
    { value: 'meal', label: 'Meal' },
    { value: 'drink', label: 'Drink' },
    { value: 'snack', label: 'Snack' },
  ];
  const MEAL_PLAN_WEEK_START = 0;
  const MEAL_PLAN_DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

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

  const padNumber = (value) => String(value).padStart(2, '0');

  const toISODateString = (date) => {
    if (!(date instanceof Date)) {
      return '';
    }
    return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
  };

  const isValidISODateString = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

  const parseISODateString = (value) => {
    if (!isValidISODateString(value)) {
      return null;
    }
    const [yearStr, monthStr, dayStr] = value.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return null;
    }
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year
      || date.getMonth() !== month - 1
      || date.getDate() !== day
    ) {
      return null;
    }
    return date;
  };

  const getStartOfDay = (date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  };

  const getStartOfWeek = (date) => {
    const start = getStartOfDay(date);
    const diff = (start.getDay() - MEAL_PLAN_WEEK_START + 7) % 7;
    return addDays(start, -diff);
  };

  const getEndOfWeek = (date) => addDays(getStartOfWeek(date), 6);

  const getTodayIsoDate = () => toISODateString(new Date());

  const MEAL_PLAN_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

  const normalizeMealPlanTime = (value) => {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!MEAL_PLAN_TIME_PATTERN.test(trimmed)) {
      return null;
    }
    return trimmed;
  };

  const formatMealPlanTime = (value) => {
    const normalized = normalizeMealPlanTime(value);
    if (!normalized) {
      return '';
    }
    const [hourStr, minuteStr] = normalized.split(':');
    const hours = Number(hourStr);
    const minutes = Number(minuteStr);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return '';
    }
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minuteStr} ${period}`;
  };

  const sortMealPlanEntries = (entries) => {
    if (!Array.isArray(entries)) {
      return [];
    }
    return entries.slice().sort((a, b) => {
      const timeA = normalizeMealPlanTime(a?.time);
      const timeB = normalizeMealPlanTime(b?.time);
      if (timeA && timeB && timeA !== timeB) {
        return timeA.localeCompare(timeB);
      }
      if (timeA && !timeB) {
        return -1;
      }
      if (!timeA && timeB) {
        return 1;
      }
      const titleA = typeof a?.title === 'string' ? a.title : '';
      const titleB = typeof b?.title === 'string' ? b.title : '';
      return titleA.localeCompare(titleB);
    });
  };

  const mealPlanEntryTypeLookup = new Map(
    MEAL_PLAN_ENTRY_TYPES.map(({ value, label }) => [value, label]),
  );

  const createMealPlanEntryId = () =>
    `entry_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const loadMealPlan = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(MEAL_PLAN_STORAGE_KEY));
      if (!stored || typeof stored !== 'object') {
        return {};
      }
      const normalized = {};
      Object.entries(stored).forEach(([dateKey, entries]) => {
        if (!isValidISODateString(dateKey)) {
          return;
        }
        const parsedDate = parseISODateString(dateKey);
        if (!parsedDate) {
          return;
        }
        const list = Array.isArray(entries) ? entries : [];
        const cleaned = [];
        list.forEach((entry) => {
          if (!entry || typeof entry !== 'object') return;
          const title = typeof entry.title === 'string' ? entry.title.trim() : '';
          if (!title) return;
          const type = mealPlanEntryTypeLookup.has(entry.type) ? entry.type : 'meal';
          const id = typeof entry.id === 'string' && entry.id ? entry.id : createMealPlanEntryId();
          const time = normalizeMealPlanTime(entry.time);
          const cleanedEntry = { id, type, title };
          if (time) {
            cleanedEntry.time = time;
          }
          cleaned.push(cleanedEntry);
        });
        if (cleaned.length) {
          normalized[dateKey] = sortMealPlanEntries(cleaned);
        }
      });
      return normalized;
    } catch (error) {
      console.warn('Unable to read saved meal plan.', error);
      return {};
    }
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

  const toUniqueStringArray = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }
    const unique = new Set();
    value.forEach((entry) => {
      if (typeof entry !== 'string') return;
      const trimmed = entry.trim();
      if (trimmed) {
        unique.add(trimmed);
      }
    });
    return Array.from(unique);
  };

  const sanitizeMealFilters = (value) => {
    const defaults = getDefaultMealFilters();
    if (!value || typeof value !== 'object') {
      return defaults;
    }
    return {
      search: typeof value.search === 'string' ? value.search : defaults.search,
      ingredients: toUniqueStringArray(value.ingredients),
      tags: toUniqueStringArray(value.tags),
      allergies: toUniqueStringArray(value.allergies),
      equipment: toUniqueStringArray(value.equipment),
      favoritesOnly: Boolean(value.favoritesOnly),
    };
  };

  const sanitizePantryFilters = (value) => {
    const defaults = getDefaultPantryFilters();
    if (!value || typeof value !== 'object') {
      return defaults;
    }
    return {
      search: typeof value.search === 'string' ? value.search : defaults.search,
      categories: toUniqueStringArray(value.categories),
      tags: toUniqueStringArray(value.tags),
      allergens: toUniqueStringArray(value.allergens),
    };
  };

  const sanitizeServingOverrides = (value) => {
    if (!value || typeof value !== 'object') {
      return {};
    }
    const overrides = {};
    Object.entries(value).forEach(([key, raw]) => {
      if (typeof key !== 'string' || !key) {
        return;
      }
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        overrides[key] = Math.max(1, Math.round(parsed));
      }
    });
    return overrides;
  };

  const sanitizeNotes = (value) => {
    if (!value || typeof value !== 'object') {
      return {};
    }
    const notes = {};
    Object.entries(value).forEach(([key, raw]) => {
      if (typeof key !== 'string' || !key || typeof raw !== 'string') {
        return;
      }
      notes[key] = raw;
    });
    return notes;
  };

  const sanitizeOpenNotes = (value) => {
    if (!value || typeof value !== 'object') {
      return {};
    }
    const open = {};
    Object.entries(value).forEach(([key, raw]) => {
      if (typeof key !== 'string' || !key) {
        return;
      }
      if (Boolean(raw)) {
        open[key] = true;
      }
    });
    return open;
  };

  const sanitizePantryInventory = (value) => {
    if (!value || typeof value !== 'object') {
      return {};
    }
    const inventory = {};
    Object.entries(value).forEach(([slug, entry]) => {
      if (typeof slug !== 'string' || !slug || !entry || typeof entry !== 'object') {
        return;
      }
      const quantityRaw = entry.quantity;
      const unitRaw = entry.unit;
      const quantity =
        quantityRaw === null || quantityRaw === undefined
          ? ''
          : typeof quantityRaw === 'string'
            ? quantityRaw.trim()
            : String(quantityRaw);
      const unit = typeof unitRaw === 'string' ? unitRaw.trim() : '';
      const hasQuantity = quantity !== '';
      const isDefaultUnit = unit.toLowerCase() === 'each';
      if (!hasQuantity && (!unit || isDefaultUnit)) {
        return;
      }
      inventory[slug] = {
        quantity: hasQuantity ? quantity : '',
        unit: unit || 'each',
      };
    });
    return inventory;
  };

  const loadAppState = () => {
    const fallback = {
      activeView: 'meals',
      mealFilters: getDefaultMealFilters(),
      pantryFilters: getDefaultPantryFilters(),
      mealPlanViewMode: DEFAULT_MEAL_PLAN_MODE,
      mealPlanSelectedDate: getTodayIsoDate(),
      servingOverrides: {},
      notes: {},
      openNotes: {},
      pantryInventory: {},
    };
    try {
      const stored = JSON.parse(localStorage.getItem(APP_STATE_STORAGE_KEY));
      if (!stored || typeof stored !== 'object') {
        return fallback;
      }
      const result = { ...fallback };
      if (AVAILABLE_VIEWS.includes(stored.activeView)) {
        result.activeView = stored.activeView;
      }
      if (stored.mealFilters) {
        result.mealFilters = sanitizeMealFilters(stored.mealFilters);
      }
      if (stored.pantryFilters) {
        result.pantryFilters = sanitizePantryFilters(stored.pantryFilters);
      }
      if (MEAL_PLAN_VIEW_MODES.includes(stored.mealPlanViewMode)) {
        result.mealPlanViewMode = stored.mealPlanViewMode;
      }
      if (isValidISODateString(stored.mealPlanSelectedDate)) {
        result.mealPlanSelectedDate = stored.mealPlanSelectedDate;
      }
      result.servingOverrides = sanitizeServingOverrides(stored.servingOverrides);
      result.notes = sanitizeNotes(stored.notes);
      result.openNotes = sanitizeOpenNotes(stored.openNotes);
      result.pantryInventory = sanitizePantryInventory(stored.pantryInventory);
      return result;
    } catch (error) {
      console.warn('Unable to read saved application state.', error);
      return fallback;
    }
  };

  const storedAppState = loadAppState();

  const state = {
    activeView: storedAppState.activeView,
    mealFilters: sanitizeMealFilters(storedAppState.mealFilters),
    pantryFilters: sanitizePantryFilters(storedAppState.pantryFilters),
    mealPlanViewMode: storedAppState.mealPlanViewMode,
    mealPlanSelectedDate: storedAppState.mealPlanSelectedDate,
    mealPlan: loadMealPlan(),
    servingOverrides: sanitizeServingOverrides(storedAppState.servingOverrides),
    notes: sanitizeNotes(storedAppState.notes),
    openNotes: sanitizeOpenNotes(storedAppState.openNotes),
    pantryInventory: sanitizePantryInventory(storedAppState.pantryInventory),
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

  const scheduleDialogState = {
    root: null,
    form: null,
    recipeLabel: null,
    dateInput: null,
    timeInput: null,
    lastTimeValue: '',
    currentRecipe: null,
  };

  const closeRecipeScheduleDialog = () => {
    if (!scheduleDialogState.root) {
      return;
    }
    scheduleDialogState.root.hidden = true;
    scheduleDialogState.root.removeAttribute('data-open');
    scheduleDialogState.currentRecipe = null;
    document.removeEventListener('keydown', handleScheduleDialogKeydown);
  };

  const handleScheduleDialogKeydown = (event) => {
    if (event.key === 'Escape') {
      closeRecipeScheduleDialog();
    }
  };

  const submitRecipeScheduleDialog = () => {
    const { currentRecipe, dateInput, timeInput } = scheduleDialogState;
    if (!currentRecipe || !dateInput || !timeInput) {
      return;
    }
    const dateValue = dateInput.value;
    if (!isValidISODateString(dateValue)) {
      dateInput.focus();
      return;
    }
    const timeValue = normalizeMealPlanTime(timeInput.value);
    if (!timeValue) {
      timeInput.focus();
      return;
    }
    const recipeTitle = typeof currentRecipe.name === 'string' ? currentRecipe.name : '';
    const added = addMealPlanEntry(dateValue, 'meal', recipeTitle, timeValue);
    if (!added) {
      return;
    }
    scheduleDialogState.lastTimeValue = timeValue;
    setMealPlanSelectedDate(dateValue);
    closeRecipeScheduleDialog();
    if (state.activeView === 'meal-plan') {
      renderMealPlan();
    }
  };

  const ensureRecipeScheduleDialog = () => {
    if (scheduleDialogState.root) {
      return scheduleDialogState;
    }
    const root = document.createElement('div');
    root.className = 'schedule-dialog';
    root.hidden = true;

    const form = document.createElement('form');
    form.className = 'schedule-dialog__panel';
    form.setAttribute('role', 'dialog');
    form.setAttribute('aria-modal', 'true');

    const title = document.createElement('h3');
    title.className = 'schedule-dialog__title';
    title.id = 'schedule-dialog-title';
    title.textContent = 'Add to calendar';
    form.appendChild(title);

    const recipeLabel = document.createElement('p');
    recipeLabel.className = 'schedule-dialog__recipe';
    recipeLabel.id = 'schedule-dialog-recipe';
    form.appendChild(recipeLabel);
    form.setAttribute('aria-labelledby', 'schedule-dialog-title');
    form.setAttribute('aria-describedby', 'schedule-dialog-recipe');

    const dateField = document.createElement('div');
    dateField.className = 'schedule-dialog__field';
    const dateLabel = document.createElement('label');
    dateLabel.className = 'schedule-dialog__label';
    dateLabel.setAttribute('for', 'schedule-dialog-date');
    dateLabel.textContent = 'Date';
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.required = true;
    dateInput.id = 'schedule-dialog-date';
    dateInput.className = 'schedule-dialog__input';
    dateField.appendChild(dateLabel);
    dateField.appendChild(dateInput);
    form.appendChild(dateField);

    const timeField = document.createElement('div');
    timeField.className = 'schedule-dialog__field';
    const timeLabel = document.createElement('label');
    timeLabel.className = 'schedule-dialog__label';
    timeLabel.setAttribute('for', 'schedule-dialog-time');
    timeLabel.textContent = 'Time';
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.required = true;
    timeInput.id = 'schedule-dialog-time';
    timeInput.className = 'schedule-dialog__input';
    timeField.appendChild(timeLabel);
    timeField.appendChild(timeInput);
    form.appendChild(timeField);

    const actions = document.createElement('div');
    actions.className = 'schedule-dialog__actions';
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'schedule-dialog__button';
    cancelButton.textContent = 'Cancel';
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'schedule-dialog__button schedule-dialog__button--primary';
    submitButton.textContent = 'Add to calendar';
    actions.appendChild(cancelButton);
    actions.appendChild(submitButton);
    form.appendChild(actions);

    root.appendChild(form);
    document.body.appendChild(root);

    root.addEventListener('click', (event) => {
      if (event.target === root) {
        closeRecipeScheduleDialog();
      }
    });

    cancelButton.addEventListener('click', () => {
      closeRecipeScheduleDialog();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitRecipeScheduleDialog();
    });

    scheduleDialogState.root = root;
    scheduleDialogState.form = form;
    scheduleDialogState.recipeLabel = recipeLabel;
    scheduleDialogState.dateInput = dateInput;
    scheduleDialogState.timeInput = timeInput;

    return scheduleDialogState;
  };

  const openRecipeScheduleDialog = (recipe) => {
    if (!recipe) {
      return;
    }
    const dialog = ensureRecipeScheduleDialog();
    dialog.currentRecipe = recipe;
    const recipeTitle = typeof recipe.name === 'string' ? recipe.name : 'Recipe';
    if (dialog.recipeLabel) {
      dialog.recipeLabel.textContent = recipeTitle;
    }
    const defaultDate = isValidISODateString(state.mealPlanSelectedDate)
      ? state.mealPlanSelectedDate
      : getTodayIsoDate();
    if (dialog.dateInput) {
      dialog.dateInput.value = defaultDate;
    }
    const defaultTime = normalizeMealPlanTime(dialog.lastTimeValue) || '18:00';
    if (dialog.timeInput) {
      dialog.timeInput.value = defaultTime;
    }
    dialog.root.hidden = false;
    dialog.root.dataset.open = 'true';
    document.addEventListener('keydown', handleScheduleDialogKeydown);
    window.requestAnimationFrame(() => {
      dialog.dateInput?.focus();
    });
  };
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
  let lastPersistedMealPlan = JSON.stringify(state.mealPlan);
  let lastPersistedAppState = null;

  const createAppStateSnapshot = () => {
    const mealFilters = state.mealFilters || getDefaultMealFilters();
    const pantryFilters = state.pantryFilters || getDefaultPantryFilters();
    const snapshot = {
      activeView: AVAILABLE_VIEWS.includes(state.activeView) ? state.activeView : 'meals',
      mealFilters: {
        search: typeof mealFilters.search === 'string' ? mealFilters.search : '',
        ingredients: toUniqueStringArray(mealFilters.ingredients),
        tags: toUniqueStringArray(mealFilters.tags),
        allergies: toUniqueStringArray(mealFilters.allergies),
        equipment: toUniqueStringArray(mealFilters.equipment),
        favoritesOnly: Boolean(mealFilters.favoritesOnly),
      },
      pantryFilters: {
        search: typeof pantryFilters.search === 'string' ? pantryFilters.search : '',
        categories: toUniqueStringArray(pantryFilters.categories),
        tags: toUniqueStringArray(pantryFilters.tags),
        allergens: toUniqueStringArray(pantryFilters.allergens),
      },
      mealPlanViewMode: MEAL_PLAN_VIEW_MODES.includes(state.mealPlanViewMode)
        ? state.mealPlanViewMode
        : DEFAULT_MEAL_PLAN_MODE,
      mealPlanSelectedDate: isValidISODateString(state.mealPlanSelectedDate)
        ? state.mealPlanSelectedDate
        : getTodayIsoDate(),
      servingOverrides: {},
      notes: {},
      openNotes: {},
      pantryInventory: {},
    };

    Object.entries(state.servingOverrides || {}).forEach(([key, value]) => {
      if (typeof key !== 'string' || !key) return;
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        snapshot.servingOverrides[key] = Math.max(1, Math.round(numeric));
      }
    });

    Object.entries(state.notes || {}).forEach(([key, value]) => {
      if (typeof key === 'string' && key && typeof value === 'string') {
        snapshot.notes[key] = value;
      }
    });

    Object.entries(state.openNotes || {}).forEach(([key, value]) => {
      if (typeof key === 'string' && key && Boolean(value)) {
        snapshot.openNotes[key] = true;
      }
    });

    Object.entries(state.pantryInventory || {}).forEach(([slug, entry]) => {
      if (typeof slug !== 'string' || !slug || !entry || typeof entry !== 'object') {
        return;
      }
      const rawQuantity = entry.quantity;
      const rawUnit = entry.unit;
      const quantityText =
        rawQuantity === null || rawQuantity === undefined
          ? ''
          : typeof rawQuantity === 'string'
            ? rawQuantity.trim()
            : String(rawQuantity);
      const unitText = typeof rawUnit === 'string' ? rawUnit.trim() : '';
      const hasQuantity = quantityText !== '';
      const isDefaultUnit = unitText.toLowerCase() === 'each';
      if (!hasQuantity && (!unitText || isDefaultUnit)) {
        return;
      }
      snapshot.pantryInventory[slug] = {
        quantity: hasQuantity ? quantityText : '',
        unit: unitText || 'each',
      };
    });

    return snapshot;
  };

  const persistAppState = () => {
    const serialized = JSON.stringify(createAppStateSnapshot());
    if (serialized === lastPersistedAppState) {
      return;
    }
    try {
      localStorage.setItem(APP_STATE_STORAGE_KEY, serialized);
      lastPersistedAppState = serialized;
    } catch (error) {
      console.warn('Unable to persist application state.', error);
    }
  };

  const persistMealPlan = () => {
    const serialized = JSON.stringify(state.mealPlan);
    if (serialized === lastPersistedMealPlan) {
      return;
    }
    try {
      localStorage.setItem(MEAL_PLAN_STORAGE_KEY, serialized);
      lastPersistedMealPlan = serialized;
    } catch (error) {
      console.warn('Unable to persist meal plan entries.', error);
    }
  };

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
    persistAppState();
  };

  const getMealPlanEntries = (isoDate) => {
    if (!isValidISODateString(isoDate)) {
      return [];
    }
    const entries = state.mealPlan[isoDate];
    return Array.isArray(entries) ? sortMealPlanEntries(entries) : [];
  };

  const ensureMealPlanSelection = () => {
    if (!isValidISODateString(state.mealPlanSelectedDate)) {
      state.mealPlanSelectedDate = getTodayIsoDate();
    }
    return state.mealPlanSelectedDate;
  };

  const setMealPlanSelectedDate = (isoDate) => {
    if (isValidISODateString(isoDate)) {
      state.mealPlanSelectedDate = isoDate;
    } else {
      state.mealPlanSelectedDate = getTodayIsoDate();
    }
    persistAppState();
  };

  const addMealPlanEntry = (isoDate, type, title, time) => {
    const dateKey = isValidISODateString(isoDate) ? isoDate : ensureMealPlanSelection();
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    if (!normalizedTitle) {
      return false;
    }
    const entryType = mealPlanEntryTypeLookup.has(type) ? type : 'meal';
    const normalizedTime = normalizeMealPlanTime(time);
    const nextEntries = getMealPlanEntries(dateKey).slice();
    const entry = { id: createMealPlanEntryId(), type: entryType, title: normalizedTitle };
    if (normalizedTime) {
      entry.time = normalizedTime;
    }
    nextEntries.push(entry);
    state.mealPlan[dateKey] = sortMealPlanEntries(nextEntries);
    persistMealPlan();
    return true;
  };

  const removeMealPlanEntry = (isoDate, entryId) => {
    if (!isValidISODateString(isoDate) || typeof entryId !== 'string' || !entryId) {
      return;
    }
    const currentEntries = getMealPlanEntries(isoDate);
    if (!currentEntries.length) {
      return;
    }
    const filtered = currentEntries.filter((entry) => entry.id !== entryId);
    if (filtered.length) {
      state.mealPlan[isoDate] = sortMealPlanEntries(filtered);
    } else {
      delete state.mealPlan[isoDate];
    }
    persistMealPlan();
  };

  const cacheElements = () => {
    elements.viewToggleButtons = Array.from(document.querySelectorAll('[data-view-target]'));
    elements.appLayout = document.getElementById('app-layout');
    elements.filterPanel = document.getElementById('filter-panel');
    elements.mealView = document.getElementById('meal-view');
    elements.pantryView = document.getElementById('pantry-view');
    elements.mealPlanView = document.getElementById('meal-plan-view');
    elements.mealPlanCalendar = document.getElementById('meal-plan-calendar');
    elements.mealPlanSidebar = document.getElementById('meal-plan-sidebar');
    elements.mealPlanDayDetails = document.getElementById('meal-plan-day-details');
    elements.mealPlanForm = document.getElementById('meal-plan-form');
    elements.mealPlanEntryType = document.getElementById('meal-plan-entry-type');
    elements.mealPlanEntryTitle = document.getElementById('meal-plan-entry-title');
    elements.mealPlanEntryDate = document.getElementById('meal-plan-entry-date');
    elements.mealPlanModeButtons = Array.from(
      document.querySelectorAll('[data-meal-plan-mode]'),
    );
    elements.mealPlanPeriod = document.getElementById('meal-plan-period');
    elements.mealPlanPrevButton = document.getElementById('meal-plan-prev');
    elements.mealPlanNextButton = document.getElementById('meal-plan-next');
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
    if (view === 'meal-plan') {
      configuredFilterView = view;
      return;
    }
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
            ? `${favoriteCount} favorite${favoriteCount === 1 ? '' : 's'}`
            : 'No favorites';
        } else if (favoriteCount) {
          labelEl.textContent = `Favorites (${favoriteCount})`;
        } else {
          labelEl.textContent = 'Favorites';
        }
      }
      const titleText = favoritesOnly
        ? favoriteCount
          ? `Showing ${favoriteCount} favorite${favoriteCount === 1 ? '' : 's'}`
          : 'Showing favorite recipes only'
        : favoriteCount
          ? `Filter to ${favoriteCount} favorite${favoriteCount === 1 ? '' : 's'}`
          : 'Filter by favorite recipes';
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

  const formatMealPlanLongDate = (date) =>
    date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  const formatMealPlanMonthLabel = (date) =>
    date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const formatMealPlanWeekLabel = (date) => {
    const start = getStartOfWeek(date);
    const end = getEndOfWeek(date);
    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();
    if (sameMonth) {
      const monthName = start.toLocaleDateString(undefined, { month: 'long' });
      return `${monthName} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }
    const startOptions = { month: 'short', day: 'numeric' };
    const endOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    if (!sameYear) {
      startOptions.year = 'numeric';
    }
    const startLabel = start.toLocaleDateString(undefined, startOptions);
    const endLabel = end.toLocaleDateString(undefined, endOptions);
    return `${startLabel} – ${endLabel}`;
  };

  const createMealPlanDayNamesRow = () => {
    const row = document.createElement('div');
    row.className = 'meal-plan-calendar__day-names';
    for (let offset = 0; offset < 7; offset += 1) {
      const dayIndex = (MEAL_PLAN_WEEK_START + offset) % 7;
      const label = MEAL_PLAN_DAY_NAMES[dayIndex] || '';
      const cell = document.createElement('div');
      cell.className = 'meal-plan-calendar__day-name';
      cell.textContent = label.slice(0, 3);
      cell.title = label;
      row.appendChild(cell);
    }
    return row;
  };

  const createMealPlanCalendarEntry = (entry) => {
    const normalizedType = mealPlanEntryTypeLookup.has(entry.type) ? entry.type : 'meal';
    const typeLabel = mealPlanEntryTypeLookup.get(normalizedType) || 'Meal';
    const wrapper = document.createElement('div');
    wrapper.className = 'meal-plan-calendar__entry';
    const typeBadge = document.createElement('span');
    typeBadge.className = `meal-plan-calendar__entry-type meal-plan-calendar__entry-type--${normalizedType}`;
    typeBadge.textContent = typeLabel.charAt(0).toUpperCase();
    typeBadge.title = typeLabel;
    wrapper.appendChild(typeBadge);
    const timeLabel = formatMealPlanTime(entry.time);
    if (timeLabel) {
      const time = document.createElement('span');
      time.className = 'meal-plan-calendar__entry-time';
      time.textContent = timeLabel;
      wrapper.appendChild(time);
    }
    const title = document.createElement('span');
    title.className = 'meal-plan-calendar__entry-title';
    title.textContent = entry.title;
    wrapper.appendChild(title);
    return wrapper;
  };

  const createMealPlanEntryElement = (entry, options = {}) => {
    const { showRemove = false, dateKey, showMeta = true } = options;
    const normalizedType = mealPlanEntryTypeLookup.has(entry.type) ? entry.type : 'meal';
    const typeLabel = mealPlanEntryTypeLookup.get(normalizedType) || 'Meal';
    const article = document.createElement('article');
    article.className = 'meal-plan-entry';
    const badge = document.createElement('span');
    badge.className = `meal-plan-entry__type meal-plan-entry__type--${normalizedType}`;
    badge.textContent = typeLabel.charAt(0).toUpperCase();
    badge.title = typeLabel;
    article.appendChild(badge);
    const content = document.createElement('div');
    content.className = 'meal-plan-entry__content';
    const title = document.createElement('p');
    title.className = 'meal-plan-entry__title';
    title.textContent = entry.title;
    content.appendChild(title);
    const timeLabel = formatMealPlanTime(entry.time);
    if (timeLabel) {
      const time = document.createElement('p');
      time.className = 'meal-plan-entry__time';
      time.textContent = timeLabel;
      content.appendChild(time);
    }
    if (showMeta) {
      const meta = document.createElement('p');
      meta.className = 'meal-plan-entry__meta';
      meta.textContent = typeLabel;
      content.appendChild(meta);
    }
    article.appendChild(content);
    if (showRemove && dateKey) {
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'meal-plan-entry__remove';
      removeButton.dataset.removeEntry = entry.id;
      removeButton.dataset.entryDate = dateKey;
      removeButton.textContent = 'Remove';
      article.appendChild(removeButton);
    }
    return article;
  };

  const createMealPlanCalendarCell = (date, options = {}) => {
    const iso = toISODateString(date);
    const sourceEntries = Array.isArray(options.entries)
      ? options.entries
      : getMealPlanEntries(iso);
    const entries = sortMealPlanEntries(sourceEntries);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'meal-plan-calendar__cell';
    if (options.isCurrentMonth === false) {
      button.classList.add('meal-plan-calendar__cell--muted');
    }
    const isSelected = iso === state.mealPlanSelectedDate;
    if (isSelected) {
      button.classList.add('meal-plan-calendar__cell--selected');
      button.setAttribute('aria-current', 'date');
    }
    if (entries.length) {
      button.classList.add('meal-plan-calendar__cell--has-entries');
    }
    const descriptiveLabel = `${formatMealPlanLongDate(date)}${entries.length
      ? `, ${entries.length} planned ${entries.length === 1 ? 'item' : 'items'}`
      : ', no planned items'}`;
    button.setAttribute('aria-label', descriptiveLabel);
    button.dataset.date = iso;
    button.addEventListener('click', () => {
      if (state.mealPlanSelectedDate !== iso) {
        setMealPlanSelectedDate(iso);
        renderMealPlan();
      }
    });
    const dateContainer = document.createElement('div');
    dateContainer.className = 'meal-plan-calendar__date';
    const number = document.createElement('span');
    number.className = 'meal-plan-calendar__date-number';
    number.textContent = String(date.getDate());
    dateContainer.appendChild(number);
    button.appendChild(dateContainer);
    const list = document.createElement('div');
    list.className = 'meal-plan-calendar__entries';
    const maxEntries = typeof options.maxEntries === 'number' ? options.maxEntries : 3;
    entries.slice(0, maxEntries).forEach((entry) => {
      list.appendChild(createMealPlanCalendarEntry(entry));
    });
    if (entries.length > maxEntries) {
      const more = document.createElement('span');
      more.className = 'meal-plan-calendar__more';
      more.textContent = `+${entries.length - maxEntries} more`;
      list.appendChild(more);
    }
    button.appendChild(list);
    return button;
  };

  const renderMealPlanMonthView = (selectedDate) => {
    const container = document.createElement('div');
    container.className = 'meal-plan-calendar__month';
    container.appendChild(createMealPlanDayNamesRow());
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    let cursor = getStartOfWeek(monthStart);
    const gridEnd = getEndOfWeek(monthEnd);
    while (cursor <= gridEnd) {
      const weekRow = document.createElement('div');
      weekRow.className = 'meal-plan-calendar__week';
      for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
        const currentDate = new Date(cursor);
        const iso = toISODateString(currentDate);
        weekRow.appendChild(
          createMealPlanCalendarCell(currentDate, {
            isCurrentMonth: currentDate.getMonth() === selectedDate.getMonth(),
            entries: getMealPlanEntries(iso),
            maxEntries: 3,
          }),
        );
        cursor = addDays(cursor, 1);
      }
      container.appendChild(weekRow);
    }
    return container;
  };

  const renderMealPlanWeekView = (selectedDate) => {
    const container = document.createElement('div');
    container.className = 'meal-plan-calendar__week-view';
    const header = document.createElement('div');
    header.className = 'meal-plan-calendar__week-header';
    const weekStart = getStartOfWeek(selectedDate);
    for (let offset = 0; offset < 7; offset += 1) {
      const dayIndex = (MEAL_PLAN_WEEK_START + offset) % 7;
      const day = addDays(weekStart, offset);
      const cell = document.createElement('div');
      cell.className = 'meal-plan-calendar__week-header-cell';
      const name = document.createElement('span');
      name.className = 'meal-plan-calendar__day-name';
      const label = MEAL_PLAN_DAY_NAMES[dayIndex] || '';
      name.textContent = label.slice(0, 3);
      name.title = label;
      cell.appendChild(name);
      const dateLabel = document.createElement('span');
      dateLabel.className = 'meal-plan-calendar__week-header-date';
      dateLabel.textContent = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      cell.appendChild(dateLabel);
      header.appendChild(cell);
    }
    container.appendChild(header);
    const body = document.createElement('div');
    body.className = 'meal-plan-calendar__week';
    for (let offset = 0; offset < 7; offset += 1) {
      const day = addDays(weekStart, offset);
      const iso = toISODateString(day);
      body.appendChild(
        createMealPlanCalendarCell(day, {
          isCurrentMonth: true,
          entries: getMealPlanEntries(iso),
          maxEntries: 4,
        }),
      );
    }
    container.appendChild(body);
    return container;
  };

  const renderMealPlanDayView = (selectedIso) => {
    const container = document.createElement('div');
    container.className = 'meal-plan-calendar__day';
    const entries = getMealPlanEntries(selectedIso);
    MEAL_PLAN_ENTRY_TYPES.forEach(({ value, label }) => {
      const column = document.createElement('section');
      column.className = 'meal-plan-calendar__day-column';
      const heading = document.createElement('h4');
      heading.className = 'meal-plan-calendar__day-title';
      heading.textContent = label;
      column.appendChild(heading);
      const filtered = entries.filter((entry) => entry.type === value);
      if (!filtered.length) {
        const empty = document.createElement('p');
        empty.className = 'meal-plan-empty';
        empty.textContent = `No ${label.toLowerCase()} planned.`;
        column.appendChild(empty);
      } else {
        const list = document.createElement('div');
        list.className = 'meal-plan-day__list';
        filtered.forEach((entry) => {
          list.appendChild(createMealPlanEntryElement(entry, { showMeta: false }));
        });
        column.appendChild(list);
      }
      container.appendChild(column);
    });
    return container;
  };

  const renderMealPlanDayDetails = (selectedDate, selectedIso) => {
    if (!elements.mealPlanDayDetails) return;
    const container = elements.mealPlanDayDetails;
    container.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'meal-plan-day__header';
    const title = document.createElement('h3');
    title.className = 'meal-plan-day__title';
    title.textContent = formatMealPlanLongDate(selectedDate);
    header.appendChild(title);
    const entries = getMealPlanEntries(selectedIso);
    const subtitle = document.createElement('p');
    subtitle.className = 'meal-plan-day__subtitle';
    subtitle.textContent = entries.length
      ? `${entries.length} planned ${entries.length === 1 ? 'item' : 'items'}`
      : 'No meals planned yet.';
    header.appendChild(subtitle);
    container.appendChild(header);
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'meal-plan-empty';
      empty.textContent = 'Add meals, drinks, or snacks to fill this day.';
      container.appendChild(empty);
      return;
    }
    const list = document.createElement('div');
    list.className = 'meal-plan-day__list';
    entries.forEach((entry) => {
      list.appendChild(createMealPlanEntryElement(entry, { showRemove: true, dateKey: selectedIso }));
    });
    container.appendChild(list);
  };

  const updateMealPlanModeButtons = () => {
    if (!Array.isArray(elements.mealPlanModeButtons)) return;
    elements.mealPlanModeButtons.forEach((button) => {
      const mode = button.dataset.mealPlanMode;
      const isActive = mode === state.mealPlanViewMode;
      button.classList.toggle('view-toggle__button--active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const updateMealPlanPeriodLabel = (selectedDate) => {
    if (!elements.mealPlanPeriod) return;
    let label = '';
    if (state.mealPlanViewMode === 'week') {
      label = formatMealPlanWeekLabel(selectedDate);
    } else if (state.mealPlanViewMode === 'day') {
      label = formatMealPlanLongDate(selectedDate);
    } else {
      label = formatMealPlanMonthLabel(selectedDate);
    }
    elements.mealPlanPeriod.textContent = label;
  };

  const renderMealPlanCalendar = (selectedDate, selectedIso) => {
    if (!elements.mealPlanCalendar) return;
    elements.mealPlanCalendar.innerHTML = '';
    elements.mealPlanCalendar.dataset.viewMode = state.mealPlanViewMode;
    let view;
    if (state.mealPlanViewMode === 'week') {
      view = renderMealPlanWeekView(selectedDate);
    } else if (state.mealPlanViewMode === 'day') {
      view = renderMealPlanDayView(selectedIso);
    } else {
      view = renderMealPlanMonthView(selectedDate);
    }
    if (view) {
      elements.mealPlanCalendar.appendChild(view);
    }
  };

  const updateMealPlanForm = (selectedIso) => {
    if (elements.mealPlanEntryDate) {
      elements.mealPlanEntryDate.value = selectedIso;
    }
  };

  const renderMealPlan = () => {
    const selectedIso = ensureMealPlanSelection();
    const selectedDate = parseISODateString(selectedIso) || new Date();
    updateMealPlanModeButtons();
    updateMealPlanPeriodLabel(selectedDate);
    renderMealPlanCalendar(selectedDate, selectedIso);
    renderMealPlanDayDetails(selectedDate, selectedIso);
    updateMealPlanForm(selectedIso);
  };

  const setMealPlanViewMode = (mode) => {
    if (!MEAL_PLAN_VIEW_MODES.includes(mode) || state.mealPlanViewMode === mode) {
      return;
    }
    state.mealPlanViewMode = mode;
    renderMealPlan();
    persistAppState();
  };

  const adjustMealPlanSelection = (step) => {
    if (!Number.isInteger(step) || step === 0) {
      return;
    }
    const current = parseISODateString(ensureMealPlanSelection());
    if (!current) {
      return;
    }
    let nextDate;
    if (state.mealPlanViewMode === 'month') {
      nextDate = addMonths(current, step);
    } else if (state.mealPlanViewMode === 'week') {
      nextDate = addDays(current, step * 7);
    } else {
      nextDate = addDays(current, step);
    }
    setMealPlanSelectedDate(toISODateString(nextDate));
    renderMealPlan();
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

    const scheduleButton = document.createElement('button');
    scheduleButton.type = 'button';
    scheduleButton.className = 'meal-card__schedule-button';
    const recipeNameForLabel = typeof recipe.name === 'string' ? recipe.name : 'this recipe';
    scheduleButton.setAttribute('aria-label', `Add ${recipeNameForLabel} to calendar`);
    scheduleButton.title = 'Schedule recipe';
    scheduleButton.innerHTML = `
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="3.75" y="4.5" width="16.5" height="15" rx="2" stroke="currentColor" stroke-width="1.5" />
        <path d="M8 2.75v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M16 2.75v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M3.75 9h16.5" stroke="currentColor" stroke-width="1.5" />
        <circle cx="12" cy="14.5" r="3" stroke="currentColor" stroke-width="1.5" />
        <path d="M12 13v2l1.25.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
    scheduleButton.addEventListener('click', (event) => {
      event.stopPropagation();
      openRecipeScheduleDialog(recipe);
    });
    headerActions.appendChild(scheduleButton);

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
        persistAppState();
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
    const matchesText = `${filteredRecipes.length} ${matchLabel} your filters.`;
    elements.mealCount.textContent = String(filteredRecipes.length);
    elements.mealCount.setAttribute('aria-label', matchesText);
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
    const hideFilter = state.activeView === 'meal-plan';
    if (elements.mealView) {
      elements.mealView.hidden = state.activeView !== 'meals';
    }
    if (elements.pantryView) {
      elements.pantryView.hidden = state.activeView !== 'pantry';
    }
    if (elements.mealPlanView) {
      elements.mealPlanView.hidden = state.activeView !== 'meal-plan';
    }
    if (elements.appLayout) {
      elements.appLayout.classList.toggle('layout--single-column', hideFilter);
    }
    if (elements.filterPanel) {
      elements.filterPanel.hidden = hideFilter;
      if (hideFilter) {
        elements.filterPanel.setAttribute('aria-hidden', 'true');
      } else {
        elements.filterPanel.removeAttribute('aria-hidden');
      }
    }
  };

  const renderApp = () => {
    applyColorTheme(false);
    configureFilterPanel();
    if (state.activeView === 'meals') {
      renderMeals();
    } else if (state.activeView === 'pantry') {
      renderPantry();
    } else {
      renderMealPlan();
    }
    updateView();
    persistAppState();
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

    if (Array.isArray(elements.mealPlanModeButtons)) {
      elements.mealPlanModeButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const mode = button.dataset.mealPlanMode;
          if (mode) {
            setMealPlanViewMode(mode);
          }
        });
      });
    }

    if (elements.mealPlanPrevButton) {
      elements.mealPlanPrevButton.addEventListener('click', () => {
        adjustMealPlanSelection(-1);
      });
    }

    if (elements.mealPlanNextButton) {
      elements.mealPlanNextButton.addEventListener('click', () => {
        adjustMealPlanSelection(1);
      });
    }

    if (elements.mealPlanForm) {
      elements.mealPlanForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const dateValue = elements.mealPlanEntryDate?.value || state.mealPlanSelectedDate;
        const typeValue = elements.mealPlanEntryType?.value;
        const titleValue = elements.mealPlanEntryTitle?.value;
        const added = addMealPlanEntry(dateValue, typeValue, titleValue);
        if (!added) {
          return;
        }
        if (elements.mealPlanEntryTitle) {
          elements.mealPlanEntryTitle.value = '';
        }
        if (isValidISODateString(dateValue)) {
          setMealPlanSelectedDate(dateValue);
        }
        renderMealPlan();
      });
    }

    if (elements.mealPlanEntryDate) {
      elements.mealPlanEntryDate.addEventListener('change', (event) => {
        const { value } = event.target;
        if (isValidISODateString(value)) {
          setMealPlanSelectedDate(value);
          renderMealPlan();
        }
      });
    }

    if (elements.mealPlanDayDetails) {
      elements.mealPlanDayDetails.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target.closest('[data-remove-entry]') : null;
        if (!target) return;
        const { removeEntry, entryDate } = target.dataset;
        if (removeEntry && entryDate) {
          removeMealPlanEntry(entryDate, removeEntry);
          renderMealPlan();
        }
      });
    }

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
