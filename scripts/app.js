
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
    ],
    dark: [
      { id: 'midnight', label: 'Midnight', preview: '#2563eb' },
      { id: 'nebula', label: 'Nebula', preview: '#a855f7' },
      { id: 'forest', label: 'Forest', preview: '#34d399' },
    ],
  };

  const DEFAULT_THEME_SELECTIONS = {
    light: 'serene',
    dark: 'midnight',
  };

  const loadThemePreferences = () => {
    const fallback = { mode: 'light', selections: { ...DEFAULT_THEME_SELECTIONS } };
    try {
      const stored = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY));
      if (!stored || typeof stored !== 'object') {
        return fallback;
      }
      const mode = stored.mode === 'dark' ? 'dark' : 'light';
      const selections = { ...DEFAULT_THEME_SELECTIONS, ...(stored.selections || {}) };
      ['light', 'dark'].forEach((key) => {
        if (!Array.isArray(THEME_OPTIONS[key])) return;
        if (!THEME_OPTIONS[key].some((option) => option.id === selections[key])) {
          selections[key] = DEFAULT_THEME_SELECTIONS[key];
        }
      });
      return { mode, selections };
    } catch (error) {
      console.warn('Unable to read saved theme preferences.', error);
      return fallback;
    }
  };

  const themePreferences = loadThemePreferences();

  const getDefaultFilters = () => ({
    search: '',
    tags: [],
    allergies: [],
    equipment: [],
    includeIngredients: [],
    excludeIngredients: [],
  });

  const state = {
    activeView: 'meals',
    filters: getDefaultFilters(),
    servingOverrides: {},
    notes: {},
    openNotes: {},
    pantryItems: [],
    showCookableOnly: false,
    ingredientDirectory: {
      category: 'All',
      search: '',
      glutenFreeOnly: false,
      veganOnly: false,
    },
    themeMode: themePreferences.mode,
    themeSelections: { ...themePreferences.selections },
  };

  const tagOptions = Array.from(
    new Set(
      recipes.flatMap((recipe) => Array.isArray(recipe.tags) ? recipe.tags : []),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const allergyDefaults = ['dairy', 'gluten', 'eggs', 'nuts', 'soy', 'fish', 'shellfish'];
  const allergyOptions = Array.from(
    new Set([
      ...allergyDefaults,
      ...recipes.flatMap((recipe) => Array.isArray(recipe.allergens) ? recipe.allergens : []),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const equipmentOptions = Array.from(
    new Set(
      recipes.flatMap((recipe) => Array.isArray(recipe.equipment) ? recipe.equipment : []),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const ingredientTokens = new Set();
  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      if (ingredient && ingredient.item) {
        ingredientTokens.add(ingredient.item.toLowerCase());
      }
    });
  });
  ingredients.forEach((ingredient) => {
    ingredientTokens.add(ingredient.name.toLowerCase());
    ingredientTokens.add(String(ingredient.slug).toLowerCase());
  });
  const ingredientOptions = Array.from(ingredientTokens).sort();
  const ingredientSuggestions = ingredientOptions.slice(0, 200);

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

  const checkboxRegistry = {
    tags: new Map(),
    allergies: new Map(),
    equipment: new Map(),
  };

  const elements = {};

  const applyColorTheme = () => {
    const mode = state.themeMode;
    const options = THEME_OPTIONS[mode] || [];
    const fallback = DEFAULT_THEME_SELECTIONS[mode];
    const currentSelection = state.themeSelections[mode];
    const activeTheme = options.some((option) => option.id === currentSelection)
      ? currentSelection
      : fallback;
    if (activeTheme !== currentSelection) {
      state.themeSelections[mode] = activeTheme;
    }
    document.documentElement.dataset.mode = mode;
    document.documentElement.dataset.theme = activeTheme;
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
    if (!THEME_OPTIONS[mode] || state.themeMode === mode) return;
    state.themeMode = mode;
    if (!THEME_OPTIONS[mode].some((option) => option.id === state.themeSelections[mode])) {
      state.themeSelections[mode] = DEFAULT_THEME_SELECTIONS[mode];
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

  const canCookWithPantry = (recipe, pantryTokens) => {
    if (!pantryTokens.length) return false;
    const ingredientsList = recipe.ingredients.map((ingredient) => normalizeText(ingredient.item));
    return ingredientsList.every((ingredient) =>
      pantryTokens.some((pantryItem) => ingredient.includes(pantryItem) || pantryItem.includes(ingredient)),
    );
  };

  const formatQuantity = (quantity) => {
    if (quantity === null || quantity === undefined) return '';
    const rounded = Math.round(quantity * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  };

  const cacheElements = () => {
    elements.viewToggleButtons = Array.from(document.querySelectorAll('[data-view-target]'));
    elements.mealView = document.getElementById('meal-view');
    elements.ingredientView = document.getElementById('ingredient-view');
    elements.mealGrid = document.getElementById('meal-grid');
    elements.mealCount = document.getElementById('meal-count');
    elements.filterSearch = document.getElementById('filter-search');
    elements.resetButton = document.getElementById('reset-filters');
    elements.tagOptions = document.getElementById('tag-options');
    elements.allergyOptions = document.getElementById('allergy-options');
    elements.equipmentOptions = document.getElementById('equipment-options');
    elements.includeInput = document.getElementById('include-input');
    elements.includeAddButton = document.getElementById('include-add');
    elements.includeDatalist = document.getElementById('include-ingredients');
    elements.includeChips = document.getElementById('include-chips');
    elements.excludeInput = document.getElementById('exclude-input');
    elements.excludeAddButton = document.getElementById('exclude-add');
    elements.excludeDatalist = document.getElementById('exclude-ingredients');
    elements.excludeChips = document.getElementById('exclude-chips');
    elements.pantryForm = document.getElementById('pantry-form');
    elements.pantryInput = document.getElementById('pantry-input');
    elements.pantryList = document.getElementById('pantry-list');
    elements.showCookable = document.getElementById('show-cookable');
    elements.cookableCount = document.getElementById('cookable-count');
    elements.cookableResults = document.getElementById('cookable-results');
    elements.ingredientCategory = document.getElementById('ingredient-category');
    elements.ingredientSearch = document.getElementById('ingredient-search');
    elements.ingredientGlutenFree = document.getElementById('ingredient-gluten-free');
    elements.ingredientVegan = document.getElementById('ingredient-vegan');
    elements.ingredientCount = document.getElementById('ingredient-count');
    elements.ingredientGrid = document.getElementById('ingredient-grid');
    elements.themeOptions = document.getElementById('theme-options');
    elements.modeToggleButtons = Array.from(
      document.querySelectorAll('#mode-toggle .mode-toggle__button'),
    );
  };

  const populateCheckboxGroup = (container, options, field, spanClassName) => {
    container.innerHTML = '';
    checkboxRegistry[field].clear();
    options.forEach((option) => {
      const label = document.createElement('label');
      label.className = 'checkbox-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = option;
      input.addEventListener('change', () => {
        const current = new Set(state.filters[field]);
        if (input.checked) {
          current.add(option);
        } else {
          current.delete(option);
        }
        state.filters[field] = Array.from(current);
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
      checkboxRegistry[field].set(option, input);
    });
  };

  const populateFilterOptions = () => {
    populateCheckboxGroup(elements.tagOptions, tagOptions, 'tags');
    populateCheckboxGroup(elements.allergyOptions, allergyOptions, 'allergies', 'badge badge-soft');
    populateCheckboxGroup(elements.equipmentOptions, equipmentOptions, 'equipment');
    const populateDatalist = (element) => {
      element.innerHTML = '';
      ingredientSuggestions.forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option;
        element.appendChild(opt);
      });
    };
    populateDatalist(elements.includeDatalist);
    populateDatalist(elements.excludeDatalist);
  };

  const populateIngredientControls = () => {
    elements.ingredientCategory.innerHTML = '';
    categoryOrder.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      elements.ingredientCategory.appendChild(opt);
    });
  };

  const addIngredientFilter = (type) => {
    const input = type === 'include' ? elements.includeInput : elements.excludeInput;
    const field = type === 'include' ? 'includeIngredients' : 'excludeIngredients';
    const value = normalizeText(input.value.trim());
    if (!value) return;
    if (!state.filters[field].includes(value)) {
      state.filters[field] = [...state.filters[field], value];
      renderApp();
    }
    input.value = '';
  };

  const syncFilterControls = () => {
    elements.filterSearch.value = state.filters.search;
    ['tags', 'allergies', 'equipment'].forEach((field) => {
      const map = checkboxRegistry[field];
      map.forEach((input, option) => {
        input.checked = state.filters[field].includes(option);
      });
    });
    renderIngredientFilterChips('include');
    renderIngredientFilterChips('exclude');
    elements.showCookable.checked = state.showCookableOnly;
  };

  const renderIngredientFilterChips = (type) => {
    const container = type === 'include' ? elements.includeChips : elements.excludeChips;
    const field = type === 'include' ? 'includeIngredients' : 'excludeIngredients';
    container.innerHTML = '';
    state.filters[field].forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = type === 'include' ? 'chip' : 'chip chip-danger';
      button.textContent = item;
      const close = document.createElement('span');
      close.setAttribute('aria-hidden', 'true');
      close.textContent = ' ×';
      button.appendChild(close);
      button.addEventListener('click', () => {
        state.filters[field] = state.filters[field].filter((entry) => entry !== item);
        renderApp();
      });
      container.appendChild(button);
    });
  };

  const computeDerivedState = () => {
    const pantryTokens = state.pantryItems.map((item) => normalizeText(item));
    const cookableRecipes = pantryTokens.length
      ? recipes.filter((recipe) => canCookWithPantry(recipe, pantryTokens))
      : [];
    const cookableIds = new Set(cookableRecipes.map((recipe) => recipe.id));
    return { pantryTokens, cookableRecipes, cookableIds };
  };

  const matchesFilters = (recipe, derived) => {
    const haystack = `${recipe.name} ${recipe.description} ${(recipe.tags || []).join(' ')} ${recipe.category}`.toLowerCase();
    if (state.filters.search && !haystack.includes(state.filters.search.toLowerCase())) {
      return false;
    }
    if (state.filters.tags.length && !state.filters.tags.every((tag) => (recipe.tags || []).includes(tag))) {
      return false;
    }
    if (
      state.filters.allergies.length &&
      (recipe.allergens || []).some((allergen) => state.filters.allergies.includes(allergen))
    ) {
      return false;
    }
    if (
      state.filters.equipment.length &&
      !state.filters.equipment.every((item) => (recipe.equipment || []).includes(item))
    ) {
      return false;
    }
    const ingredientNames = recipe.ingredients.map((ingredient) => ingredient.item.toLowerCase());
    if (
      state.filters.includeIngredients.length &&
      !state.filters.includeIngredients.every((needle) => ingredientNames.some((name) => name.includes(needle)))
    ) {
      return false;
    }
    if (
      state.filters.excludeIngredients.length &&
      ingredientNames.some((name) => state.filters.excludeIngredients.some((ex) => name.includes(ex)))
    ) {
      return false;
    }
    if (state.showCookableOnly && derived.pantryTokens.length && !derived.cookableIds.has(recipe.id)) {
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

  const renderMeals = (derived) => {
    const filteredRecipes = recipes.filter((recipe) => matchesFilters(recipe, derived));
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

  const renderPantry = (derived) => {
    elements.pantryList.innerHTML = '';
    if (state.pantryItems.length) {
      state.pantryItems.forEach((item) => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.textContent = item;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Remove';
        button.addEventListener('click', () => {
          state.pantryItems = state.pantryItems.filter((entry) => entry !== item);
          renderApp();
        });
        li.appendChild(span);
        li.appendChild(button);
        elements.pantryList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No pantry items yet.';
      elements.pantryList.appendChild(li);
    }

    elements.cookableCount.textContent = derived.cookableRecipes.length;
    elements.cookableResults.innerHTML = '';
    if (derived.cookableRecipes.length) {
      const list = document.createElement('ul');
      derived.cookableRecipes.forEach((recipe) => {
        const li = document.createElement('li');
        li.textContent = recipe.name;
        list.appendChild(li);
      });
      elements.cookableResults.appendChild(list);
    } else {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'Add more items to unlock recipes.';
      elements.cookableResults.appendChild(empty);
    }
  };

  const renderIngredientDirectory = () => {
    const { category, search, glutenFreeOnly, veganOnly } = state.ingredientDirectory;
    elements.ingredientCategory.value = category;
    elements.ingredientSearch.value = search;
    elements.ingredientGlutenFree.checked = glutenFreeOnly;
    elements.ingredientVegan.checked = veganOnly;

    const query = search.trim().toLowerCase();
    const filteredItems = ingredients
      .filter((ingredient) => {
        if (category !== 'All' && ingredient.category !== category) return false;
        if (glutenFreeOnly && !ingredient.tags.includes('Gluten-Free')) return false;
        if (veganOnly && !ingredient.tags.includes('Vegan')) return false;
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

    elements.ingredientCount.textContent = filteredItems.length;
    elements.ingredientGrid.innerHTML = '';
    if (filteredItems.length) {
      filteredItems.forEach((ingredient) => {
        const card = document.createElement('article');
        card.className = 'ingredient-card';
        const header = document.createElement('header');
        header.className = 'ingredient-card__header';
        const title = document.createElement('h3');
        title.textContent = ingredient.name;
        const code = document.createElement('code');
        code.textContent = ingredient.slug;
        header.appendChild(title);
        header.appendChild(code);
        card.appendChild(header);
        const meta = document.createElement('div');
        meta.className = 'ingredient-card__meta';
        const badge = document.createElement('span');
        badge.className = 'badge badge-soft';
        badge.textContent = ingredient.category;
        meta.appendChild(badge);
        card.appendChild(meta);
        const tags = document.createElement('div');
        tags.className = 'ingredient-card__tags';
        ingredient.tags.forEach((tag) => {
          const span = document.createElement('span');
          span.className = 'ingredient-tag';
          span.textContent = tag;
          tags.appendChild(span);
        });
        card.appendChild(tags);
        elements.ingredientGrid.appendChild(card);
      });
    } else {
      const empty = document.createElement('div');
      empty.className = 'ingredient-directory__empty';
      const heading = document.createElement('h3');
      heading.textContent = 'No ingredients found';
      const paragraph = document.createElement('p');
      paragraph.textContent = 'Try clearing a filter or searching for a different keyword.';
      empty.appendChild(heading);
      empty.appendChild(paragraph);
      elements.ingredientGrid.appendChild(empty);
    }
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
    elements.mealView.hidden = state.activeView !== 'meals';
    elements.ingredientView.hidden = state.activeView !== 'ingredients';
  };

  const renderApp = () => {
    syncFilterControls();
    const derived = computeDerivedState();
    renderMeals(derived);
    renderPantry(derived);
    renderIngredientDirectory();
    updateView();
  };

  const handlePantrySubmit = (event) => {
    event.preventDefault();
    const value = normalizeText(elements.pantryInput.value.trim());
    if (!value) return;
    if (!state.pantryItems.includes(value)) {
      state.pantryItems = [...state.pantryItems, value];
      renderApp();
    }
    elements.pantryInput.value = '';
  };

  const bindEvents = () => {
    elements.viewToggleButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.viewTarget;
        if (target && target !== state.activeView) {
          state.activeView = target;
          updateView();
        }
      });
    });

    elements.filterSearch.addEventListener('input', (event) => {
      state.filters.search = event.target.value;
      renderApp();
    });

    elements.resetButton.addEventListener('click', () => {
      state.filters = getDefaultFilters();
      renderApp();
    });

    elements.includeAddButton.addEventListener('click', () => addIngredientFilter('include'));
    elements.excludeAddButton.addEventListener('click', () => addIngredientFilter('exclude'));

    elements.includeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addIngredientFilter('include');
      }
    });
    elements.excludeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addIngredientFilter('exclude');
      }
    });

    elements.pantryForm.addEventListener('submit', handlePantrySubmit);

    elements.showCookable.addEventListener('change', (event) => {
      state.showCookableOnly = event.target.checked;
      renderApp();
    });

    elements.ingredientCategory.addEventListener('change', (event) => {
      state.ingredientDirectory.category = event.target.value;
      renderIngredientDirectory();
    });
    elements.ingredientSearch.addEventListener('input', (event) => {
      state.ingredientDirectory.search = event.target.value;
      renderIngredientDirectory();
    });
    elements.ingredientGlutenFree.addEventListener('change', (event) => {
      state.ingredientDirectory.glutenFreeOnly = event.target.checked;
      renderIngredientDirectory();
    });
    elements.ingredientVegan.addEventListener('change', (event) => {
      state.ingredientDirectory.veganOnly = event.target.checked;
      renderIngredientDirectory();
    });

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
    populateFilterOptions();
    populateIngredientControls();
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
