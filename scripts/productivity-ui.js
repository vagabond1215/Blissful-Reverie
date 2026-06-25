;(function (global) {
  const tools = global.BlissfulProductivity || {};
  if (typeof document === 'undefined' || typeof tools.analyzeRecipePantryFit !== 'function') {
    return;
  }

  const SHOPPING_RECIPE_LIMIT = 8;
  const SHOPPING_ITEM_LIMIT = 18;
  const SHOPPING_SOURCE_MEAL_PLAN = 'meal-plan';
  const SHOPPING_SOURCE_CLOSEST = 'closest';
  let currentContext = null;
  let shoppingSource = SHOPPING_SOURCE_MEAL_PLAN;

  const getRecipes = () => (
    Array.isArray(currentContext?.recipes) ? currentContext.recipes : []
  );

  const getPlannedRecipes = () => (
    Array.isArray(currentContext?.plannedRecipes) ? currentContext.plannedRecipes.filter(Boolean) : []
  );

  const getRecipeMatches = () => (
    currentContext?.recipeIngredientMatches instanceof Map
      ? currentContext.recipeIngredientMatches
      : new Map()
  );

  const getIngredientBySlug = () => (
    currentContext?.ingredientBySlug instanceof Map
      ? currentContext.ingredientBySlug
      : new Map()
  );

  const getSubstitutionGraph = () => (
    currentContext?.substitutionGraph instanceof Map
      ? currentContext.substitutionGraph
      : new Map()
  );

  const getRecipeById = (recipeId) => {
    if (!recipeId) return null;
    if (currentContext?.recipeById instanceof Map) {
      return currentContext.recipeById.get(recipeId) || null;
    }
    return getRecipes().find((recipe) => recipe?.id === recipeId) || null;
  };

  const statusLabels = new Map([
    ['ready', 'Ready to cook'],
    ['ready-with-substitutions', 'Ready with swaps'],
    ['nearly-ready', 'Almost ready'],
    ['needs-shopping', 'Needs shopping'],
    ['unknown', 'Pantry unknown'],
  ]);

  const createBadge = (text, variant, title) => {
    const badge = document.createElement('span');
    badge.className = `productivity-badge productivity-badge--${variant}`;
    badge.textContent = text;
    if (title) {
      badge.title = title;
    }
    return badge;
  };

  const getPantryBadgeText = (fit) => {
    if (!fit || fit.total === 0) return 'Pantry unknown';
    if (fit.status === 'ready') return 'Ready to cook';
    if (fit.status === 'ready-with-substitutions') return 'Ready with swaps';
    const count = Array.isArray(fit.missing) ? fit.missing.length : 0;
    if (count === 1) return 'Missing 1 item';
    if (count > 1) return `Missing ${count} items`;
    return statusLabels.get(fit.status) || 'Pantry unknown';
  };

  const getPantryBadgeTitle = (fit) => {
    if (!fit || fit.total === 0) {
      return 'Ingredient coverage is unavailable for this recipe.';
    }
    const available = Number(fit.available) || 0;
    const total = Number(fit.total) || 0;
    const missing = Array.isArray(fit.missing) ? fit.missing.length : 0;
    if (!missing) {
      return `${available} of ${total} matched ingredients are in your pantry.`;
    }
    return `${available} of ${total} matched ingredients are in your pantry; ${missing} missing.`;
  };

  const getPantryInventory = () => {
    return currentContext?.pantryInventory && typeof currentContext.pantryInventory === 'object'
      ? currentContext.pantryInventory
      : {};
  };

  const getSubstitutionsAllowed = () => Boolean(currentContext?.substitutionsAllowed);

  const getRecipeFit = (recipe) =>
    tools.analyzeRecipePantryFit({
      recipe,
      pantryInventory: getPantryInventory(),
      recipeIngredientMatches: getRecipeMatches().get(recipe.id),
      substitutionGraph: getSubstitutionGraph(),
      substitutionsAllowed: getSubstitutionsAllowed(),
    });

  const enhanceRecipeCard = (card) => {
    if (!(card instanceof HTMLElement)) return;
    const recipe = getRecipeById(card.dataset.recipeId);
    if (!recipe) return;

    const headerInfo = card.querySelector('.meal-card__header > div:first-child');
    if (!(headerInfo instanceof HTMLElement)) return;

    headerInfo.querySelector('.meal-card__productivity-badges')?.remove();

    const fit = getRecipeFit(recipe);
    const badgeRow = document.createElement('div');
    badgeRow.className = 'meal-card__productivity-badges';
    badgeRow.appendChild(
      createBadge(
        typeof tools.getRecipeTypeLabel === 'function' ? tools.getRecipeTypeLabel(recipe) : 'Curated recipe',
        'source',
        'Recipe source label',
      ),
    );
    badgeRow.appendChild(createBadge(getPantryBadgeText(fit), fit.status || 'unknown', getPantryBadgeTitle(fit)));

    const tagList = headerInfo.querySelector('.tag-list');
    if (tagList) {
      headerInfo.insertBefore(badgeRow, tagList);
    } else {
      headerInfo.appendChild(badgeRow);
    }
  };

  const enhanceVisibleCards = () => {
    document.querySelectorAll('.meal-card').forEach(enhanceRecipeCard);
  };

  const buildDashboardItems = () =>
    getRecipes()
      .map((recipe) => ({ recipe, fit: getRecipeFit(recipe) }))
      .filter((entry) => entry.fit.total > 0)
      .sort((a, b) => {
        const missingDiff = a.fit.missing.length - b.fit.missing.length;
        if (missingDiff) return missingDiff;
        return a.recipe.name.localeCompare(b.recipe.name);
      });

  const createDashboardGroup = (title, entries, emptyText) => {
    const section = document.createElement('section');
    section.className = 'productivity-dashboard__group';
    const heading = document.createElement('h3');
    heading.className = 'productivity-dashboard__group-title';
    heading.textContent = title;
    section.appendChild(heading);

    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'productivity-dashboard__empty';
      empty.textContent = emptyText;
      section.appendChild(empty);
      return section;
    }

    const list = document.createElement('ul');
    list.className = 'productivity-dashboard__list';
    entries.slice(0, 4).forEach(({ recipe, fit }) => {
      const item = document.createElement('li');
      item.className = 'productivity-dashboard__item';
      const name = document.createElement('span');
      name.className = 'productivity-dashboard__item-name';
      name.textContent = recipe.name;
      item.appendChild(name);
      const note = document.createElement('span');
      note.className = 'productivity-dashboard__item-note';
      note.textContent = getPantryBadgeText(fit);
      item.appendChild(note);
      list.appendChild(item);
    });
    section.appendChild(list);
    return section;
  };

  const groupShoppingItems = (items) => {
    const groups = new Map();
    items.forEach((item) => {
      const category = item.category || 'Other';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(item);
    });
    return Array.from(groups.entries()).map(([category, categoryItems]) => ({
      category,
      items: categoryItems,
    }));
  };

  const getShoppingCandidateRecipes = (entries) =>
    entries
      .filter(({ fit }) => Array.isArray(fit.missing) && fit.missing.length > 0)
      .slice(0, SHOPPING_RECIPE_LIMIT)
      .map(({ recipe }) => recipe);

  const createShoppingSourceControl = (selectedSource) => {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'productivity-shopping__source-control';
    const legend = document.createElement('legend');
    legend.className = 'productivity-shopping__source-legend';
    legend.textContent = 'Shopping source';
    fieldset.appendChild(legend);

    [
      { value: SHOPPING_SOURCE_MEAL_PLAN, label: 'From meal plan' },
      { value: SHOPPING_SOURCE_CLOSEST, label: 'Closest recipes' },
    ].forEach((option) => {
      const label = document.createElement('label');
      label.className = 'productivity-shopping__source-option';
      if (selectedSource === option.value) {
        label.classList.add('productivity-shopping__source-option--active');
      }
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'productivity-shopping-source';
      input.value = option.value;
      input.checked = selectedSource === option.value;
      input.addEventListener('change', () => {
        shoppingSource = option.value;
        renderDashboard();
      });
      const text = document.createElement('span');
      text.textContent = option.label;
      label.appendChild(input);
      label.appendChild(text);
      fieldset.appendChild(label);
    });
    return fieldset;
  };

  const buildShoppingText = (items) => {
    if (!items.length) return 'No missing ingredients yet.';
    const lines = ['Blissful Reverie shopping list'];
    groupShoppingItems(items).forEach((group) => {
      lines.push('', group.category);
      group.items.forEach((item) => {
        const recipeNote = Array.isArray(item.recipes) && item.recipes.length
          ? ` — for ${item.recipes.slice(0, 3).join(', ')}`
          : '';
        lines.push(`- ${item.name}${recipeNote}`);
      });
    });
    return lines.join('\n');
  };

  const copyShoppingList = async (button, items) => {
    const text = buildShoppingText(items);
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copied';
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        button.textContent = 'Copied';
      } catch (fallbackError) {
        button.textContent = 'Copy failed';
      }
      textarea.remove();
    }
    global.setTimeout(() => {
      button.textContent = 'Copy list';
    }, 1800);
  };

  const createShoppingPanel = (entries) => {
    const source = shoppingSource === SHOPPING_SOURCE_CLOSEST
      ? SHOPPING_SOURCE_CLOSEST
      : SHOPPING_SOURCE_MEAL_PLAN;
    shoppingSource = source;
    const plannedRecipes = getPlannedRecipes();
    const candidates = source === SHOPPING_SOURCE_MEAL_PLAN
      ? plannedRecipes
      : getShoppingCandidateRecipes(entries);
    const shoppingItems = typeof tools.buildShoppingList === 'function'
      ? tools.buildShoppingList({
          recipes: candidates,
          pantryInventory: getPantryInventory(),
          recipeMatchesById: getRecipeMatches(),
          ingredientBySlug: getIngredientBySlug(),
          substitutionGraph: getSubstitutionGraph(),
          substitutionsAllowed: getSubstitutionsAllowed(),
        }).slice(0, SHOPPING_ITEM_LIMIT)
      : [];

    const panel = document.createElement('section');
    panel.className = 'productivity-shopping';
    panel.setAttribute('aria-label', 'Smart shopping list');

    const header = document.createElement('header');
    header.className = 'productivity-shopping__header';
    const headerText = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'productivity-shopping__title';
    title.textContent = 'Smart shopping list';
    headerText.appendChild(title);
    const subtitle = document.createElement('p');
    subtitle.className = 'productivity-shopping__subtitle';
    if (source === SHOPPING_SOURCE_MEAL_PLAN && !plannedRecipes.length) {
      subtitle.textContent = 'No planned recipes yet.';
    } else if (shoppingItems.length) {
      const sourceLabel = source === SHOPPING_SOURCE_MEAL_PLAN ? 'planned recipes' : 'closest recipes';
      subtitle.textContent = `${shoppingItems.length} missing ingredient${shoppingItems.length === 1 ? '' : 's'} from your ${sourceLabel}`;
    } else if (source === SHOPPING_SOURCE_MEAL_PLAN) {
      subtitle.textContent = 'Your planned recipes are covered by pantry items and substitutions.';
    } else {
      subtitle.textContent = 'Add pantry quantities to generate missing ingredients.';
    }
    headerText.appendChild(subtitle);
    header.appendChild(headerText);

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'productivity-shopping__copy';
    copyButton.textContent = 'Copy list';
    copyButton.disabled = !shoppingItems.length;
    copyButton.addEventListener('click', () => copyShoppingList(copyButton, shoppingItems));
    header.appendChild(copyButton);
    panel.appendChild(header);
    panel.appendChild(createShoppingSourceControl(source));

    if (!shoppingItems.length) {
      const empty = document.createElement('p');
      empty.className = 'productivity-shopping__empty';
      if (source === SHOPPING_SOURCE_MEAL_PLAN && !plannedRecipes.length) {
        empty.textContent = 'Add recipes to your meal plan, or switch to closest recipes for pantry-based suggestions.';
      } else if (source === SHOPPING_SOURCE_MEAL_PLAN) {
        empty.textContent = 'Missing planned-meal ingredients will appear here as your pantry changes.';
      } else {
        empty.textContent = 'Recipes that are missing ingredients will appear here once your pantry is populated.';
      }
      panel.appendChild(empty);
      return panel;
    }

    const categoryGrid = document.createElement('div');
    categoryGrid.className = 'productivity-shopping__categories';
    groupShoppingItems(shoppingItems).forEach((group) => {
      const category = document.createElement('section');
      category.className = 'productivity-shopping__category';
      const categoryTitle = document.createElement('h4');
      categoryTitle.className = 'productivity-shopping__category-title';
      categoryTitle.textContent = group.category;
      category.appendChild(categoryTitle);
      const list = document.createElement('ul');
      list.className = 'productivity-shopping__list';
      group.items.forEach((item) => {
        const row = document.createElement('li');
        row.className = 'productivity-shopping__item';
        const name = document.createElement('span');
        name.className = 'productivity-shopping__item-name';
        name.textContent = item.name;
        row.appendChild(name);
        const note = document.createElement('span');
        note.className = 'productivity-shopping__item-note';
        note.textContent = Array.isArray(item.recipes) && item.recipes.length
          ? `${item.recipes.length} recipe${item.recipes.length === 1 ? '' : 's'}`
          : '';
        row.appendChild(note);
        list.appendChild(row);
      });
      category.appendChild(list);
      categoryGrid.appendChild(category);
    });
    panel.appendChild(categoryGrid);
    return panel;
  };

  const renderDashboard = () => {
    const mealView = document.getElementById('meal-view');
    const mealGrid = document.getElementById('meal-grid');
    if (!mealView || !mealGrid) return;

    const existing = document.getElementById('productivity-dashboard');
    existing?.remove();

    const entries = buildDashboardItems();
    const ready = entries.filter(({ fit }) => fit.status === 'ready' || fit.status === 'ready-with-substitutions');
    const nearlyReady = entries.filter(({ fit }) => fit.status === 'nearly-ready');
    const needsShopping = entries.filter(({ fit }) => fit.status === 'needs-shopping');

    const dashboard = document.createElement('section');
    dashboard.className = 'productivity-dashboard';
    dashboard.id = 'productivity-dashboard';
    dashboard.setAttribute('aria-label', 'Pantry recipe dashboard');

    const header = document.createElement('header');
    header.className = 'productivity-dashboard__header';
    const headerText = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'productivity-dashboard__title';
    title.textContent = 'Cook from your pantry';
    headerText.appendChild(title);
    const subtitle = document.createElement('p');
    subtitle.className = 'productivity-dashboard__subtitle';
    subtitle.textContent = `${ready.length} ready · ${nearlyReady.length} almost ready · ${needsShopping.length} need shopping`;
    headerText.appendChild(subtitle);
    header.appendChild(headerText);
    dashboard.appendChild(header);

    const groups = document.createElement('div');
    groups.className = 'productivity-dashboard__groups';
    groups.appendChild(createDashboardGroup('Cook now', ready, 'Add pantry quantities to find ready recipes.'));
    groups.appendChild(createDashboardGroup('Almost ready', nearlyReady, 'Recipes missing one or two items will appear here.'));
    groups.appendChild(createDashboardGroup('Shopping candidates', needsShopping, 'Recipes with larger gaps will appear here.'));
    dashboard.appendChild(groups);
    dashboard.appendChild(createShoppingPanel(entries));

    mealView.insertBefore(dashboard, mealGrid);
  };

  const refreshProductivityUi = () => {
    renderDashboard();
    enhanceVisibleCards();
  };

  const render = (context) => {
    if (!context || !Array.isArray(context.recipes)) {
      return;
    }
    currentContext = context;
    refreshProductivityUi();
  };

  global.BlissfulProductivityUI = Object.assign({}, global.BlissfulProductivityUI || {}, {
    render,
  });
})(typeof window !== 'undefined' ? window : globalThis);
