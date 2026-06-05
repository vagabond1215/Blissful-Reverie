;(function (global) {
  const APP_STATE_STORAGE_KEY = 'blissful-app-state';
  const MEAL_PLAN_STORAGE_KEY = 'blissful-meal-plan';
  const FAVORITES_STORAGE_KEY = 'blissful-favorites';
  const PANTRY_FAVORITES_STORAGE_KEY = 'blissful-pantry-favorites';
  const THEME_STORAGE_KEY = 'blissful-theme';
  const HOLIDAY_THEME_STORAGE_KEY = 'blissful-holiday-themes';
  const MEASUREMENT_STORAGE_KEY = 'blissful-measurement';

  const BACKUP_VERSION = 1;
  const BACKUP_KEYS = [
    APP_STATE_STORAGE_KEY,
    MEAL_PLAN_STORAGE_KEY,
    FAVORITES_STORAGE_KEY,
    PANTRY_FAVORITES_STORAGE_KEY,
    THEME_STORAGE_KEY,
    HOLIDAY_THEME_STORAGE_KEY,
    MEASUREMENT_STORAGE_KEY,
  ];

  const GENERATED_CATEGORY_LABELS = new Map([
    ['Ingredient Spotlight', 'Ingredient idea'],
    ['Diet Collection', 'Generated template'],
    ['Protein Collection', 'Generated template'],
    ['Menu Collection', 'Generated template'],
    ['Regional Collection', 'Generated template'],
  ]);

  const toText = (value) => String(value || '').trim();

  const normalizeIngredientName = (value) =>
    toText(value)
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .replace(/^to serve:\s*/i, '')
      .replace(/\b\d+(?:\.\d+)?\b/g, ' ')
      .replace(/\b(cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|grams?|g|kilograms?|kg|cans?|jars?|cloves?|medium|large|small|fresh|dried|chopped|diced|sliced|minced|grated|shredded|rinsed|drained|cooked)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const getRecipeTypeLabel = (recipe) => {
    if (!recipe || typeof recipe !== 'object') return 'Curated recipe';
    if (recipe.generated === true) return 'Generated template';
    const category = toText(recipe.category);
    if (GENERATED_CATEGORY_LABELS.has(category)) {
      return GENERATED_CATEGORY_LABELS.get(category);
    }
    const id = toText(recipe.id);
    if (/^(ingredient-spotlight|diet-|protein-|menu-|regional-)/.test(id)) {
      return id.startsWith('ingredient-spotlight') ? 'Ingredient idea' : 'Generated template';
    }
    return 'Curated recipe';
  };

  const getPantrySlugSet = (pantryInventory) => {
    if (!pantryInventory || typeof pantryInventory !== 'object') return new Set();
    return new Set(
      Object.entries(pantryInventory)
        .filter(([, entry]) => {
          if (entry === true) return true;
          if (!entry || typeof entry !== 'object') return false;
          const quantity = toText(entry.quantity);
          const unit = toText(entry.unit);
          return Boolean(quantity || unit);
        })
        .map(([slug]) => slug),
    );
  };

  const getSubstitutionSlugSet = (slug, substitutionGraph) => {
    const result = new Set();
    if (!slug || !(substitutionGraph instanceof Map)) return result;
    const entry = substitutionGraph.get(slug);
    if (!entry || !(entry.members instanceof Set)) return result;
    entry.members.forEach((member) => {
      if (member && member !== slug) result.add(member);
    });
    return result;
  };

  const analyzeRecipePantryFit = ({ recipe, pantryInventory, recipeIngredientMatches, substitutionGraph, substitutionsAllowed = false }) => {
    const pantrySlugs = getPantrySlugSet(pantryInventory);
    const matchedSlugs = recipeIngredientMatches instanceof Set ? recipeIngredientMatches : new Set();
    const present = [];
    const substituted = [];
    const missing = [];

    matchedSlugs.forEach((slug) => {
      if (pantrySlugs.has(slug)) {
        present.push(slug);
        return;
      }
      const alternatives = substitutionsAllowed ? getSubstitutionSlugSet(slug, substitutionGraph) : new Set();
      const pantryAlternative = Array.from(alternatives).find((alternative) => pantrySlugs.has(alternative));
      if (pantryAlternative) {
        substituted.push({ requested: slug, substitute: pantryAlternative });
      } else {
        missing.push(slug);
      }
    });

    const total = matchedSlugs.size;
    const available = present.length + substituted.length;
    const status = total === 0
      ? 'unknown'
      : missing.length === 0 && substituted.length === 0
        ? 'ready'
        : missing.length === 0
          ? 'ready-with-substitutions'
          : missing.length <= 2
            ? 'nearly-ready'
            : 'needs-shopping';

    return { recipeId: recipe?.id || '', total, available, present, substituted, missing, status };
  };

  const buildShoppingList = ({ recipes, pantryInventory, recipeMatchesById = new Map(), ingredientBySlug = new Map(), substitutionGraph = new Map(), substitutionsAllowed = false }) => {
    const list = new Map();
    (Array.isArray(recipes) ? recipes : []).forEach((recipe) => {
      const fit = analyzeRecipePantryFit({
        recipe,
        pantryInventory,
        recipeIngredientMatches: recipeMatchesById.get(recipe.id),
        substitutionGraph,
        substitutionsAllowed,
      });
      fit.missing.forEach((slug) => {
        const ingredient = ingredientBySlug.get(slug) || { slug, name: slug, category: 'Other' };
        const key = slug;
        if (!list.has(key)) {
          list.set(key, {
            slug,
            name: ingredient.name || slug,
            category: ingredient.category || 'Other',
            recipes: [],
          });
        }
        const recipeName = recipe.name || recipe.id || 'Recipe';
        if (!list.get(key).recipes.includes(recipeName)) {
          list.get(key).recipes.push(recipeName);
        }
      });
    });
    return Array.from(list.values()).sort((a, b) => {
      const categoryCompare = String(a.category).localeCompare(String(b.category));
      return categoryCompare || String(a.name).localeCompare(String(b.name));
    });
  };

  const createBackup = (storage = global.localStorage) => {
    const data = {};
    BACKUP_KEYS.forEach((key) => {
      try {
        const value = storage?.getItem?.(key);
        if (value !== null && value !== undefined) data[key] = value;
      } catch (error) {
        // Ignore unavailable storage keys so backup remains best-effort.
      }
    });
    return {
      app: 'Blissful Reverie',
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    };
  };

  const restoreBackup = (backup, storage = global.localStorage) => {
    if (!backup || backup.app !== 'Blissful Reverie' || typeof backup.data !== 'object') {
      throw new Error('Invalid Blissful Reverie backup.');
    }
    BACKUP_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(backup.data, key)) {
        storage?.setItem?.(key, String(backup.data[key]));
      }
    });
    return true;
  };

  const hasMeaningfulAppState = (state) => {
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      return false;
    }
    const hasObjectEntries = (value) => (
      value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
    );
    const hasArrayEntries = (value) => Array.isArray(value) && value.length > 0;
    const filters = state.mealFilters && typeof state.mealFilters === 'object'
      ? state.mealFilters
      : {};
    const pantryFilters = state.pantryFilters && typeof state.pantryFilters === 'object'
      ? state.pantryFilters
      : {};
    const familyMembers = Array.isArray(state.familyMembers) ? state.familyMembers : [];
    const hasCustomFamily = familyMembers.length > 0 && (
      familyMembers.length !== 2
      || familyMembers[0]?.name !== 'Alex'
      || familyMembers[1]?.name !== 'Riley'
    );

    return (
      (typeof state.activeView === 'string' && state.activeView !== 'meals')
      || hasObjectEntries(state.pantryInventory)
      || hasArrayEntries(state.kitchenInventory)
      || hasObjectEntries(state.servingOverrides)
      || hasObjectEntries(state.notes)
      || hasObjectEntries(state.openNotes)
      || hasArrayEntries(state.mealPlanMemberFilter)
      || (typeof state.mealPlanMacroSelection === 'string' && state.mealPlanMacroSelection !== 'overall')
      || (typeof filters.search === 'string' && filters.search.trim() !== '')
      || ['ingredients', 'ingredientsExcluded', 'tags', 'tagsExcluded', 'allergies', 'allergiesExcluded', 'equipment', 'equipmentExcluded', 'familyMembers']
        .some((key) => hasArrayEntries(filters[key]))
      || Boolean(filters.favoritesOnly || filters.pantryOnly || filters.substitutionsAllowed)
      || (typeof pantryFilters.search === 'string' && pantryFilters.search.trim() !== '')
      || ['categories', 'tags', 'allergens'].some((key) => hasArrayEntries(pantryFilters[key]))
      || (typeof state.kitchenFilters?.search === 'string' && state.kitchenFilters.search.trim() !== '')
      || hasCustomFamily
    );
  };

  const hasMeaningfulStoredState = (storage = global.localStorage) => {
    const hasStoredValue = (key) => {
      try {
        const raw = storage?.getItem?.(key);
        return typeof raw === 'string' && raw.trim() !== '';
      } catch (error) {
        return false;
      }
    };
    const readJson = (key) => {
      try {
        const raw = storage?.getItem?.(key);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return null;
      }
    };
    if (hasMeaningfulAppState(readJson(APP_STATE_STORAGE_KEY))) {
      return true;
    }
    const favorites = readJson(FAVORITES_STORAGE_KEY);
    const pantryFavorites = readJson(PANTRY_FAVORITES_STORAGE_KEY);
    const mealPlan = readJson(MEAL_PLAN_STORAGE_KEY);
    return (
      (Array.isArray(favorites) && favorites.length > 0)
      || (Array.isArray(pantryFavorites) && pantryFavorites.length > 0)
      || [THEME_STORAGE_KEY, HOLIDAY_THEME_STORAGE_KEY, MEASUREMENT_STORAGE_KEY]
        .some(hasStoredValue)
      || Boolean(
        mealPlan
        && typeof mealPlan === 'object'
        && !Array.isArray(mealPlan)
        && Object.values(mealPlan).some((entries) => Array.isArray(entries) && entries.length > 0)
      )
    );
  };

  const createStarterState = ({
    familyName = 'Family',
    allergies = [],
    diets = [],
    pantrySlugs = [],
    kitchenItems = [],
  } = {}) => {
    const uniqueText = (values) =>
      Array.from(
        new Set(
          (Array.isArray(values) ? values : [])
            .map((value) => toText(value))
            .filter(Boolean),
        ),
      );
    const normalizedAllergies = uniqueText(allergies);
    const normalizedDiets = uniqueText(diets);
    const normalizedPantrySlugs = uniqueText(pantrySlugs);

    return {
      activeView: 'meals',
      mealFilters: {
        search: '',
        ingredients: [],
        ingredientsExcluded: [],
        tags: normalizedDiets,
        tagsExcluded: [],
        allergies: [],
        allergiesExcluded: normalizedAllergies,
        equipment: [],
        equipmentExcluded: [],
        favoritesOnly: false,
        familyMembers: [],
        pantryOnly: true,
        substitutionsAllowed: true,
      },
      pantryFilters: {
        search: '',
        categories: [],
        tags: [],
        allergens: [],
      },
      kitchenFilters: {
        search: '',
      },
      mealPlanViewMode: 'month',
      mealPlanMemberFilter: [],
      mealPlanMacroSelection: 'overall',
      servingOverrides: {},
      notes: {},
      openNotes: {},
      pantryInventory: Object.fromEntries(
        normalizedPantrySlugs.map((slug) => [slug, { quantity: '1', unit: 'each' }]),
      ),
      kitchenInventory: uniqueText(kitchenItems),
      familyMembers: [
        {
          id: 'member_default',
          name: toText(familyName) || 'Family',
          icon: '\u{1F9D1}',
          allergies: normalizedAllergies,
          diets: normalizedDiets,
          birthday: '',
          preferences: '',
          targetCalories: null,
        },
      ],
    };
  };

  const summarizeDashboard = ({ recipes = [], pantryInventory = {}, recipeMatchesById = new Map(), substitutionGraph = new Map() } = {}) => {
    const scored = recipes.map((recipe) => ({
      recipe,
      exact: analyzeRecipePantryFit({
        recipe,
        pantryInventory,
        recipeIngredientMatches: recipeMatchesById.get(recipe.id),
        substitutionGraph,
        substitutionsAllowed: false,
      }),
      flexible: analyzeRecipePantryFit({
        recipe,
        pantryInventory,
        recipeIngredientMatches: recipeMatchesById.get(recipe.id),
        substitutionGraph,
        substitutionsAllowed: true,
      }),
    }));
    return {
      cookNow: scored.filter((entry) => entry.exact.status === 'ready').slice(0, 6),
      flexibleCookNow: scored.filter((entry) => entry.flexible.status === 'ready-with-substitutions').slice(0, 6),
      nearlyReady: scored.filter((entry) => entry.flexible.status === 'nearly-ready').slice(0, 6),
    };
  };

  const api = {
    BACKUP_KEYS,
    normalizeIngredientName,
    getRecipeTypeLabel,
    getPantrySlugSet,
    analyzeRecipePantryFit,
    buildShoppingList,
    createBackup,
    restoreBackup,
    hasMeaningfulAppState,
    hasMeaningfulStoredState,
    createStarterState,
    summarizeDashboard,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.BlissfulProductivity = Object.assign({}, global.BlissfulProductivity || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
