;(function (global) {
  const tools = global.BlissfulProductivity || {};
  if (typeof document === 'undefined' || typeof tools.analyzeRecipePantryFit !== 'function') {
    return;
  }

  const SHOPPING_RECIPE_LIMIT = 8;
  const SHOPPING_ITEM_LIMIT = 18;
  const SHOPPING_SOURCE_MEAL_PLAN = 'meal-plan';
  const SHOPPING_SOURCE_CLOSEST = 'closest';
  const COPY_RESET_DELAY_MS = 2200;
  let currentContext = null;
  let shoppingSource = SHOPPING_SOURCE_MEAL_PLAN;
  let copyFeedbackTimer = null;

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

  const getPantryInventory = () => (
    currentContext?.pantryInventory && typeof currentContext.pantryInventory === 'object'
      ? currentContext.pantryInventory
      : {}
  );

  const hasPantryData = () => Object.values(getPantryInventory()).some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const quantity = Number(entry.quantity);
    return Number.isFinite(quantity) ? quantity > 0 : Boolean(String(entry.quantity || '').trim());
  });

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

  const getShoppingSourceMeta = (source) => (
    source === SHOPPING_SOURCE_CLOSEST
      ? {
          label: 'Closest recipes',
          pill: 'Closest recipes',
          description: 'Pantry-fit recipes with missing ingredients.',
        }
      : {
          label: 'From meal plan',
          pill: 'From meal plan',
          description: 'Missing ingredients from planned meals.',
        }
  );

  const createShoppingSourceControl = (selectedSource) => {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'productivity-shopping__source-control';
    const legend = document.createElement('legend');
    legend.className = 'productivity-shopping__source-legend';
    legend.textContent = 'Source';
    fieldset.appendChild(legend);

    [
      { value: SHOPPING_SOURCE_MEAL_PLAN, label: 'From meal plan', detail: 'Planned meals' },
      { value: SHOPPING_SOURCE_CLOSEST, label: 'Closest recipes', detail: 'Pantry fit' },
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
      text.className = 'productivity-shopping__source-text';
      const name = document.createElement('span');
      name.className = 'productivity-shopping__source-name';
      name.textContent = option.label;
      const detail = document.createElement('span');
      detail.className = 'productivity-shopping__source-detail';
      detail.textContent = option.detail;
      text.appendChild(name);
      text.appendChild(detail);
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

  const setCopyFeedback = (button, status, message, state) => {
    button.dataset.state = state;
    button.textContent = state === 'error' ? 'Copy failed' : 'Copied';
    status.textContent = message;
    status.dataset.state = state;
    if (copyFeedbackTimer) global.clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = global.setTimeout(() => {
      button.textContent = 'Copy list';
      button.dataset.state = 'idle';
      status.textContent = '';
      status.dataset.state = 'idle';
    }, COPY_RESET_DELAY_MS);
  };

  const copyShoppingList = async (button, status, items) => {
    const text = buildShoppingText(items);
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(button, status, 'Shopping list copied.', 'success');
      return;
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
        setCopyFeedback(button, status, 'Shopping list copied.', 'success');
      } catch (fallbackError) {
        setCopyFeedback(button, status, 'Copy failed. Select the list manually.', 'error');
      }
      textarea.remove();
    }
  };

  const getShoppingSummary = ({ source, shoppingItems, plannedRecipes, pantryHasItems }) => {
    if (source === SHOPPING_SOURCE_MEAL_PLAN && !plannedRecipes.length) {
      return 'No planned meals yet.';
    }
    if (shoppingItems.length) {
      const sourceLabel = source === SHOPPING_SOURCE_MEAL_PLAN ? 'planned meals' : 'closest recipes';
      return `${shoppingItems.length} missing ingredient${shoppingItems.length === 1 ? '' : 's'} from ${sourceLabel}.`;
    }
    if (source === SHOPPING_SOURCE_MEAL_PLAN) {
      return 'Planned meals are covered by your pantry.';
    }
    if (!pantryHasItems) {
      return 'Add pantry items to compare closest recipes.';
    }
    return 'Closest recipes do not need extra shopping right now.';
  };

  const getShoppingEmptyText = ({ source, plannedRecipes, pantryHasItems }) => {
    if (source === SHOPPING_SOURCE_MEAL_PLAN && !plannedRecipes.length) {
      return 'Add meals to your plan, then missing ingredients will appear here.';
    }
    if (source === SHOPPING_SOURCE_MEAL_PLAN) {
      return 'All planned-meal ingredients are already covered by pantry items or substitutions.';
    }
    if (!pantryHasItems) {
      return 'Add what you have in the pantry to see closest recipe gaps.';
    }
    return 'Closest recipe gaps will appear here when pantry-fit recipes need extra ingredients.';
  };

  const createShoppingPanel = (entries) => {
    const source = shoppingSource === SHOPPING_SOURCE_CLOSEST
      ? SHOPPING_SOURCE_CLOSEST
      : SHOPPING_SOURCE_MEAL_PLAN;
    shoppingSource = source;
    const plannedRecipes = getPlannedRecipes();
    const pantryHasItems = hasPantryData();
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
    const sourceMeta = getShoppingSourceMeta(source);

    const panel = document.createElement('section');
    panel.className = 'productivity-shopping';
    panel.setAttribute('aria-label', 'Smart shopping list');
    panel.dataset.source = source;

    const header = document.createElement('header');
    header.className = 'productivity-shopping__header';
    const headerText = document.createElement('div');
    headerText.className = 'productivity-shopping__header-text';
    const titleRow = document.createElement('div');
    titleRow.className = 'productivity-shopping__title-row';
    const title = document.createElement('h3');
    title.className = 'productivity-shopping__title';
    title.textContent = 'Smart shopping list';
    const sourcePill = document.createElement('span');
    sourcePill.className = 'productivity-shopping__source-pill';
    sourcePill.textContent = sourceMeta.pill;
    titleRow.appendChild(title);
    titleRow.appendChild(sourcePill);
    headerText.appendChild(titleRow);
    const subtitle = document.createElement('p');
    subtitle.className = 'productivity-shopping__subtitle';
    subtitle.textContent = getShoppingSummary({ source, shoppingItems, plannedRecipes, pantryHasItems });
    headerText.appendChild(subtitle);
    const modeNote = document.createElement('p');
    modeNote.className = 'productivity-shopping__mode-note';
    modeNote.textContent = sourceMeta.description;
    headerText.appendChild(modeNote);
    header.appendChild(headerText);

    const copyWrap = document.createElement('div');
    copyWrap.className = 'productivity-shopping__copy-wrap';
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'productivity-shopping__copy';
    copyButton.textContent = 'Copy list';
    copyButton.dataset.state = 'idle';
    copyButton.disabled = !shoppingItems.length;
    const copyStatus = document.createElement('span');
    copyStatus.className = 'productivity-shopping__copy-status';
    copyStatus.dataset.state = 'idle';
    copyStatus.setAttribute('aria-live', 'polite');
    copyStatus.setAttribute('role', 'status');
    copyButton.addEventListener('click', () => copyShoppingList(copyButton, copyStatus, shoppingItems));
    copyWrap.appendChild(copyButton);
    copyWrap.appendChild(copyStatus);
    header.appendChild(copyWrap);
    panel.appendChild(header);
    panel.appendChild(createShoppingSourceControl(source));

    if (!shoppingItems.length) {
      const empty = document.createElement('p');
      empty.className = 'productivity-shopping__empty';
      empty.textContent = getShoppingEmptyText({ source, plannedRecipes, pantryHasItems });
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
          ? `For ${item.recipes.slice(0, 2).join(', ')}${item.recipes.length > 2 ? ` +${item.recipes.length - 2}` : ''}`
          : '';
        if (note.textContent) {
          note.title = item.recipes.join(', ');
        }
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
