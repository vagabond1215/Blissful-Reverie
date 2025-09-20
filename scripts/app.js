
;(function () {
  const recipes = Array.isArray(window.BLISSFUL_RECIPES) ? window.BLISSFUL_RECIPES : [];
  const ingredients = Array.isArray(window.BLISSFUL_INGREDIENTS) ? window.BLISSFUL_INGREDIENTS : [];

  if (!recipes.length || !ingredients.length) {
    console.error('Blissful Reverie data could not be loaded.');
    return;
  }

  const THEME_STORAGE_KEY = 'blissful-theme';
  const THEME_OPTIONS = {
    light: [
      { id: 'serene', label: 'Serene', preview: '#5160d9' },
      { id: 'sunrise', label: 'Sunrise', preview: '#f97316' },
      { id: 'meadow', label: 'Meadow', preview: '#2f855a' },
      { id: 'mist', label: 'Misty Morning', preview: '#38bdf8' },
      { id: 'blossom', label: 'Blossom', preview: '#ec4899' },
      { id: 'citrine', label: 'Citrine Glow', preview: '#facc15' },
    ],
    dark: [
      { id: 'midnight', label: 'Midnight', preview: '#2563eb' },
      { id: 'nebula', label: 'Nebula', preview: '#a855f7' },
      { id: 'forest', label: 'Forest', preview: '#34d399' },
      { id: 'ember', label: 'Ember', preview: '#f97316' },
      { id: 'abyss', label: 'Abyss', preview: '#14b8a6' },
      { id: 'velvet', label: 'Velvet Night', preview: '#f472b6' },
    ],
    sepia: [
      { id: 'classic', label: 'Classic Sepia', preview: '#b7791f' },
      { id: 'copper', label: 'Copper Glow', preview: '#c26a3d' },
      { id: 'umber', label: 'Deep Umber', preview: '#8a4b2a' },
    ],
  };

  const DEFAULT_THEME_SELECTIONS = {
    light: 'serene',
    dark: 'midnight',
    sepia: 'classic',
  };

  const DEFAULT_MODE = 'light';
  const AVAILABLE_MODES = Object.keys(THEME_OPTIONS);

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

  const getDefaultMealFilters = () => ({
    search: '',
    protein: [],
    tags: [],
    allergies: [],
    equipment: [],
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
  };

  const equipmentOptions = Array.from(
    new Set(
      recipes.flatMap((recipe) => Array.isArray(recipe.equipment) ? recipe.equipment : []),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const rawTagOptions = Array.from(
    new Set(
      recipes.flatMap((recipe) => (Array.isArray(recipe.tags) ? recipe.tags : [])),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const PROTEIN_TAGS = new Set(['Beef', 'Chicken', 'Pork', 'Turkey']);
  const proteinOptions = rawTagOptions.filter((tag) => PROTEIN_TAGS.has(tag));
  const excludedTags = new Set(proteinOptions);
  equipmentOptions.forEach((item) => excludedTags.add(item));
  const tagOptions = rawTagOptions.filter((tag) => !excludedTags.has(tag));

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

  const checkboxRegistry = {
    meals: {
      protein: new Map(),
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

  const elements = {};
  let configuredFilterView = null;

  const getActiveFilters = () =>
    state.activeView === 'meals' ? state.mealFilters : state.pantryFilters;

  const applyColorTheme = () => {
    const mode = state.themeMode;
    const options = THEME_OPTIONS[mode] || [];
    const fallback = DEFAULT_THEME_SELECTIONS[mode] || (options[0] ? options[0].id : undefined);
    const currentSelection = state.themeSelections[mode];
    const activeTheme = options.some((option) => option.id === currentSelection)
      ? currentSelection
      : fallback;
    if (activeTheme !== currentSelection) {
      state.themeSelections[mode] = activeTheme;
    }
    document.documentElement.dataset.mode = mode;
    if (activeTheme) {
      document.documentElement.dataset.theme = activeTheme;
    }
    try {
      localStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ mode, selections: { ...state.themeSelections } }),
      );
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

  const normalizeText = (value) => String(value || '').toLowerCase();

  const formatQuantity = (quantity) => {
    if (quantity === null || quantity === undefined) return '';
    const rounded = Math.round(quantity * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
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
    elements.filterPanelTitle = document.getElementById('filter-panel-title');
    elements.filterSearchLabel = document.getElementById('filter-search-label');
    elements.filterSearch = document.getElementById('filter-search');
    elements.resetButton = document.getElementById('reset-filters');
    elements.proteinSection = document.getElementById('protein-section');
    elements.tagSection = document.getElementById('tag-section');
    elements.allergySection = document.getElementById('allergy-section');
    elements.equipmentSection = document.getElementById('equipment-section');
    elements.proteinSummary = document.getElementById('protein-summary');
    elements.tagSummary = document.getElementById('tag-summary');
    elements.allergySummary = document.getElementById('allergy-summary');
    elements.equipmentSummary = document.getElementById('equipment-summary');
    elements.proteinOptions = document.getElementById('protein-options');
    elements.tagOptions = document.getElementById('tag-options');
    elements.allergyOptions = document.getElementById('allergy-options');
    elements.equipmentOptions = document.getElementById('equipment-options');
    elements.themeOptions = document.getElementById('theme-options');
    elements.modeToggleButtons = Array.from(
      document.querySelectorAll('#mode-toggle .mode-toggle__button'),
    );
  };

  const populateCheckboxGroup = (view, container, options, field, spanClassName) => {
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
      span.textContent = option;
      label.appendChild(span);
      container.appendChild(label);
      registry.set(option, input);
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
    if (elements.filterPanelTitle) {
      elements.filterPanelTitle.textContent = isMealsView ? 'Filter Meals' : 'Filter Pantry';
    }
    if (elements.filterSearchLabel) {
      elements.filterSearchLabel.textContent = isMealsView ? 'Search Meals' : 'Search Pantry';
    }
    if (elements.filterSearch) {
      elements.filterSearch.placeholder = isMealsView
        ? 'Search by name, description, or tag'
        : 'Search by ingredient name, slug, or tag';
    }

    if (elements.proteinSummary) {
      elements.proteinSummary.textContent = isMealsView ? 'Protein' : 'Categories';
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

    if (isMealsView) {
      populateCheckboxGroup('meals', elements.proteinOptions, proteinOptions, 'protein');
      populateCheckboxGroup('meals', elements.tagOptions, tagOptions, 'tags');
      populateCheckboxGroup('meals', elements.allergyOptions, allergyOptions, 'allergies', 'badge badge-soft');
      populateCheckboxGroup('meals', elements.equipmentOptions, equipmentOptions, 'equipment');
    } else {
      populateCheckboxGroup('pantry', elements.proteinOptions, ingredientCategoryOptions, 'categories');
      populateCheckboxGroup('pantry', elements.tagOptions, pantryTagOptions, 'tags');
      populateCheckboxGroup(
        'pantry',
        elements.allergyOptions,
        pantryAllergenOptions,
        'allergens',
        'badge badge-soft',
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
    const registry = checkboxRegistry[state.activeView];
    if (!registry) return;
    Object.entries(registry).forEach(([field, map]) => {
      const selected = Array.isArray(filters[field]) ? filters[field] : [];
      map.forEach((input, option) => {
        input.checked = selected.includes(option);
      });
    });
  };

  const matchesMealFilters = (recipe) => {
    const filters = state.mealFilters;
    const haystack = `${recipe.name} ${recipe.description} ${(recipe.tags || []).join(' ')} ${recipe.category}`.toLowerCase();
    if (filters.search && !haystack.includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.protein.length && !filters.protein.some((protein) => (recipe.tags || []).includes(protein))) {
      return false;
    }
    if (filters.tags.length && !filters.tags.every((tag) => (recipe.tags || []).includes(tag))) {
      return false;
    }
    if (filters.allergies.length && (recipe.allergens || []).some((allergen) => filters.allergies.includes(allergen))) {
      return false;
    }
    if (filters.equipment.length && !filters.equipment.every((item) => (recipe.equipment || []).includes(item))) {
      return false;
    }
    return true;
  };

  const createMealCard = (recipe) => {
    const card = document.createElement('article');
    card.className = 'meal-card';

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
    header.appendChild(controls);
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
      quantity.textContent = `${formatQuantity(ingredient.quantity * scale)} ${ingredient.unit || ''}`.trim();
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
        li.textContent = allergen;
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

    const header = document.createElement('header');
    header.className = 'pantry-card__header';

    const info = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = ingredient.name;
    info.appendChild(title);
    const code = document.createElement('code');
    code.textContent = ingredient.slug;
    info.appendChild(code);
    header.appendChild(info);

    const badge = document.createElement('span');
    badge.className = 'badge badge-soft';
    badge.textContent = ingredient.category;
    header.appendChild(badge);
    card.appendChild(header);

    if (Array.isArray(ingredient.tags) && ingredient.tags.length) {
      const tags = document.createElement('div');
      tags.className = 'pantry-card__tags';
      ingredient.tags.forEach((tag) => {
        const span = document.createElement('span');
        span.textContent = tag;
        tags.appendChild(span);
      });
      card.appendChild(tags);
    }

    const controls = document.createElement('div');
    controls.className = 'pantry-card__controls';

    const quantityControl = document.createElement('label');
    quantityControl.className = 'pantry-card__control';
    const quantityLabel = document.createElement('span');
    quantityLabel.textContent = 'Quantity';
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.min = '0';
    quantityInput.step = '0.25';
    quantityInput.inputMode = 'decimal';
    if (entry.quantity !== undefined && entry.quantity !== '') {
      quantityInput.value = entry.quantity;
    } else {
      quantityInput.value = '';
    }
    quantityInput.placeholder = '0';
    quantityInput.addEventListener('input', (event) => {
      updatePantryEntry(ingredient.slug, { quantity: event.target.value });
    });
    quantityControl.appendChild(quantityLabel);
    quantityControl.appendChild(quantityInput);
    controls.appendChild(quantityControl);

    const unitControl = document.createElement('label');
    unitControl.className = 'pantry-card__control';
    const unitLabel = document.createElement('span');
    unitLabel.textContent = 'Unit';
    const unitInput = document.createElement('input');
    unitInput.type = 'text';
    unitInput.setAttribute('list', 'pantry-unit-options');
    unitInput.placeholder = DEFAULT_PANTRY_UNIT;
    const normalizedUnit = entry.unit || DEFAULT_PANTRY_UNIT;
    unitInput.value = normalizedUnit === DEFAULT_PANTRY_UNIT ? '' : normalizedUnit;
    const handleUnitChange = (event) => {
      updatePantryEntry(ingredient.slug, { unit: event.target.value });
    };
    unitInput.addEventListener('input', handleUnitChange);
    unitInput.addEventListener('change', handleUnitChange);
    unitControl.appendChild(unitLabel);
    unitControl.appendChild(unitInput);
    controls.appendChild(unitControl);

    card.appendChild(controls);

    return card;
  };

  const renderMeals = () => {
    const filteredRecipes = recipes.filter((recipe) => matchesMealFilters(recipe));
    elements.mealCount.textContent = `${filteredRecipes.length} ${filteredRecipes.length === 1 ? 'meal matches' : 'meals match'} your filters.`;
    elements.mealGrid.innerHTML = '';
    if (filteredRecipes.length) {
      filteredRecipes.forEach((recipe) => {
        elements.mealGrid.appendChild(createMealCard(recipe));
      });
    } else {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const heading = document.createElement('h3');
      heading.textContent = 'No meals found';
      const paragraph = document.createElement('p');
      paragraph.textContent = 'Try removing a filter or adding more pantry items to expand your options.';
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
        if (categories.length && !categories.includes(ingredient.category)) return false;
        if (tags.length && !tags.every((tag) => ingredient.tags.includes(tag))) return false;
        if (allergens.length && !allergens.every((tag) => ingredient.tags.includes(tag))) return false;
        if (!query) return true;
        const haystack = `${ingredient.name} ${ingredient.slug} ${ingredient.tags.join(' ')}`.toLowerCase();
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

    filteredItems.forEach((ingredient) => {
      elements.pantryGrid.appendChild(createPantryCard(ingredient));
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
  };

  const init = () => {
    cacheElements();
    bindEvents();
    initThemeControls();
    renderApp();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
