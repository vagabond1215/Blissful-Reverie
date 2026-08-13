;(function (global) {
  const MEAL_PLAN_STORAGE_KEY = 'blissful-meal-plan';
  const SHOPPING_ITEM_LIMIT = 18;
  const COPY_RESET_DELAY_MS = 2200;

  const isIsoDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

  const collectPastMealPlanRecipeIds = (mealPlan, todayKey) => {
    const result = new Set();
    const source = mealPlan && typeof mealPlan === 'object' && !Array.isArray(mealPlan) ? mealPlan : {};
    const today = isIsoDateKey(todayKey) ? todayKey : '';
    Object.entries(source).forEach(([dateKey, entries]) => {
      if (!today || !isIsoDateKey(dateKey) || dateKey >= today || !Array.isArray(entries)) return;
      entries.forEach((entry) => {
        const recipeId = typeof entry?.recipeId === 'string' ? entry.recipeId.trim() : '';
        if (recipeId) result.add(recipeId);
      });
    });
    return Array.from(result).sort();
  };

  const filterDiscoveryEntries = (entries, madeRecipeIds) => {
    const made = madeRecipeIds instanceof Set
      ? madeRecipeIds
      : new Set(Array.from(madeRecipeIds || []).map((value) => String(value || '').trim()).filter(Boolean));
    return (Array.isArray(entries) ? entries : []).filter(({ recipe, fit }) => {
      const missing = Array.isArray(fit?.missing) ? fit.missing.length : 0;
      return Boolean(recipe?.id) && Number(fit?.total) > 0 && missing === 0 && !made.has(recipe.id);
    });
  };

  const collectPlannedIngredientSlugs = (plannedRecipes, recipeMatchesById) => {
    const slugs = new Set();
    (Array.isArray(plannedRecipes) ? plannedRecipes : []).forEach((recipe) => {
      const matches = recipeMatchesById instanceof Map ? recipeMatchesById.get(recipe?.id) : null;
      if (!(matches instanceof Set)) return;
      matches.forEach((slug) => {
        const value = String(slug || '').trim();
        if (value) slugs.add(value);
      });
    });
    return Array.from(slugs).sort();
  };

  const helperApi = { collectPastMealPlanRecipeIds, filterDiscoveryEntries, collectPlannedIngredientSlugs };
  if (typeof module !== 'undefined' && module.exports) module.exports = helperApi;
  global.BlissfulProductivityUIHelpers = Object.assign({}, global.BlissfulProductivityUIHelpers || {}, helperApi);

  const tools = global.BlissfulProductivity || {};
  if (typeof document === 'undefined' || typeof tools.analyzeRecipePantryFit !== 'function') return;

  let currentContext = null;
  let copyFeedbackTimer = null;
  let previewReturnFocus = null;

  const getRecipes = () => (Array.isArray(currentContext?.recipes) ? currentContext.recipes : []);
  const getPlannedRecipes = () => (Array.isArray(currentContext?.plannedRecipes) ? currentContext.plannedRecipes.filter(Boolean) : []);
  const getRecipeMatches = () => (currentContext?.recipeIngredientMatches instanceof Map ? currentContext.recipeIngredientMatches : new Map());
  const getIngredientBySlug = () => (currentContext?.ingredientBySlug instanceof Map ? currentContext.ingredientBySlug : new Map());
  const getSubstitutionGraph = () => (currentContext?.substitutionGraph instanceof Map ? currentContext.substitutionGraph : new Map());
  const getPantryInventory = () => (currentContext?.pantryInventory && typeof currentContext.pantryInventory === 'object' ? currentContext.pantryInventory : {});
  const getSubstitutionsAllowed = () => Boolean(currentContext?.substitutionsAllowed);

  const getRecipeById = (recipeId) => {
    if (!recipeId) return null;
    if (currentContext?.recipeById instanceof Map) return currentContext.recipeById.get(recipeId) || null;
    return getRecipes().find((recipe) => recipe?.id === recipeId) || null;
  };

  const getLocalTodayKey = () => {
    const now = new Date();
    const year = String(now.getFullYear()).padStart(4, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const readMealPlanHistory = () => {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem?.(MEAL_PLAN_STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  };

  const getMadeRecipeIds = () => new Set(collectPastMealPlanRecipeIds(readMealPlanHistory(), getLocalTodayKey()));

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
    if (title) badge.title = title;
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
    if (!fit || fit.total === 0) return 'Ingredient coverage is unavailable for this recipe.';
    const available = Number(fit.available) || 0;
    const total = Number(fit.total) || 0;
    const missing = Array.isArray(fit.missing) ? fit.missing.length : 0;
    return missing
      ? `${available} of ${total} matched ingredients are in your pantry; ${missing} missing.`
      : `${available} of ${total} matched ingredients are in your pantry.`;
  };

  const getRecipeFit = (recipe) => tools.analyzeRecipePantryFit({
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
    badgeRow.appendChild(createBadge(
      typeof tools.getRecipeTypeLabel === 'function' ? tools.getRecipeTypeLabel(recipe) : 'Curated recipe',
      'source',
      'Recipe source label',
    ));
    badgeRow.appendChild(createBadge(getPantryBadgeText(fit), fit.status || 'unknown', getPantryBadgeTitle(fit)));
    const tagList = headerInfo.querySelector('.tag-list');
    if (tagList) headerInfo.insertBefore(badgeRow, tagList);
    else headerInfo.appendChild(badgeRow);
  };

  const enhanceVisibleCards = () => document.querySelectorAll('.meal-card').forEach(enhanceRecipeCard);

  const buildDashboardItems = () => getRecipes()
    .map((recipe) => ({ recipe, fit: getRecipeFit(recipe) }))
    .filter((entry) => entry.fit.total > 0)
    .sort((a, b) => String(a.recipe.name || '').localeCompare(String(b.recipe.name || '')));

  const findLiveMealCard = (recipeId) => Array.from(document.querySelectorAll('#meal-grid .meal-card'))
    .find((card) => card instanceof HTMLElement && card.dataset.recipeId === recipeId) || null;

  const ensurePreviewDialog = () => {
    let root = document.getElementById('recipe-preview-dialog');
    if (root instanceof HTMLElement) return root;
    root = document.createElement('div');
    root.id = 'recipe-preview-dialog';
    root.className = 'recipe-preview-dialog';
    root.hidden = true;
    root.innerHTML = `
      <div class="recipe-preview-dialog__backdrop" data-recipe-preview-close></div>
      <section class="recipe-preview-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="recipe-preview-title">
        <header class="recipe-preview-dialog__header">
          <h2 id="recipe-preview-title">Recipe preview</h2>
          <button type="button" class="recipe-preview-dialog__close" data-recipe-preview-close aria-label="Close recipe preview">×</button>
        </header>
        <div class="recipe-preview-dialog__body" id="recipe-preview-body"></div>
      </section>`;
    document.body.appendChild(root);
    root.querySelectorAll('[data-recipe-preview-close]').forEach((node) => node.addEventListener('click', () => closeRecipePreview()));
    return root;
  };

  function closeRecipePreview() {
    const root = document.getElementById('recipe-preview-dialog');
    if (!(root instanceof HTMLElement) || root.hidden) return;
    root.hidden = true;
    root.querySelector('#recipe-preview-body')?.replaceChildren();
    if (previewReturnFocus instanceof HTMLElement) previewReturnFocus.focus();
    previewReturnFocus = null;
  }

  const openRecipePreview = (recipe, trigger) => {
    const card = findLiveMealCard(recipe?.id);
    if (!(card instanceof HTMLElement)) return false;
    const root = ensurePreviewDialog();
    const body = root.querySelector('#recipe-preview-body');
    const title = root.querySelector('#recipe-preview-title');
    if (!(body instanceof HTMLElement)) return false;
    const clone = card.cloneNode(true);
    clone.classList.add('meal-card--preview');
    clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    clone.querySelectorAll('[aria-controls]').forEach((node) => node.removeAttribute('aria-controls'));
    body.replaceChildren(clone);
    if (title) title.textContent = recipe?.name || 'Recipe preview';
    previewReturnFocus = trigger instanceof HTMLElement ? trigger : null;
    root.hidden = false;
    root.querySelector('.recipe-preview-dialog__close')?.focus();
    return true;
  };

  const createDiscoveryGroup = (entries) => {
    const section = document.createElement('section');
    section.className = 'productivity-dashboard__group productivity-dashboard__group--discover';
    const heading = document.createElement('h3');
    heading.className = 'productivity-dashboard__group-title';
    heading.textContent = 'Discover new meals:';
    section.appendChild(heading);
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'productivity-dashboard__empty';
      empty.textContent = 'No new fully stocked recipes right now.';
      section.appendChild(empty);
      return section;
    }
    const list = document.createElement('div');
    list.className = 'productivity-dashboard__chips';
    entries.forEach(({ recipe }) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'productivity-dashboard__recipe-chip';
      chip.textContent = recipe.name;
      chip.title = `${recipe.name} · all ingredients on hand · not previously made`;
      chip.setAttribute('aria-label', `Preview ${recipe.name}; all ingredients on hand and not previously made`);
      chip.addEventListener('click', () => openRecipePreview(recipe, chip));
      list.appendChild(chip);
    });
    section.appendChild(list);
    return section;
  };

  const groupShoppingItems = (items) => {
    const groups = new Map();
    (Array.isArray(items) ? items : []).forEach((item) => {
      const category = item.category || 'Other';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(item);
    });
    return Array.from(groups.entries()).map(([category, categoryItems]) => ({ category, items: categoryItems }));
  };

  const buildShoppingText = (items) => {
    if (!items.length) return 'No missing or low meal plan ingredients.';
    const lines = ['Blissful Reverie shopping list'];
    groupShoppingItems(items).forEach((group) => {
      lines.push('', group.category);
      group.items.forEach((item) => {
        const recipeNote = Array.isArray(item.recipes) && item.recipes.length ? ` — for ${item.recipes.slice(0, 3).join(', ')}` : '';
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

  const createShoppingPanel = () => {
    const plannedRecipes = getPlannedRecipes();
    const recommendationSlugs = collectPlannedIngredientSlugs(plannedRecipes, getRecipeMatches());
    const shoppingItems = typeof tools.buildShoppingList === 'function'
      ? tools.buildShoppingList({
          recipes: plannedRecipes,
          pantryInventory: getPantryInventory(),
          recipeMatchesById: getRecipeMatches(),
          ingredientBySlug: getIngredientBySlug(),
          substitutionGraph: getSubstitutionGraph(),
          substitutionsAllowed: getSubstitutionsAllowed(),
        }).slice(0, SHOPPING_ITEM_LIMIT)
      : [];

    const panel = document.createElement('section');
    panel.className = 'productivity-shopping productivity-shopping--meal-plan-only';
    panel.setAttribute('aria-label', 'Missing or Low Meal Plan Ingredients');
    panel.dataset.source = 'meal-plan';
    panel.dataset.shoppingRecommendationScope = 'meal-plan';
    panel.dataset.shoppingRecommendationSlugs = JSON.stringify(recommendationSlugs);
    panel.dataset.compactShoppingSummary = 'true';

    const header = document.createElement('header');
    header.className = 'productivity-shopping__header';
    const title = document.createElement('h3');
    title.className = 'productivity-shopping__title';
    title.textContent = 'Missing or Low Meal Plan Ingredients';
    header.appendChild(title);

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
    copyWrap.append(copyButton, copyStatus);
    header.appendChild(copyWrap);
    panel.appendChild(header);

    if (!shoppingItems.length) {
      const empty = document.createElement('p');
      empty.className = 'productivity-shopping__empty';
      empty.textContent = plannedRecipes.length
        ? 'No missing or low meal plan ingredients.'
        : 'No planned meals yet.';
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
        if (note.textContent) note.title = item.recipes.join(', ');
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
    document.getElementById('productivity-dashboard')?.remove();

    const entries = buildDashboardItems();
    const discoveries = filterDiscoveryEntries(entries, getMadeRecipeIds());
    const dashboard = document.createElement('section');
    dashboard.className = 'productivity-dashboard productivity-dashboard--discovery';
    dashboard.id = 'productivity-dashboard';
    dashboard.setAttribute('aria-label', 'Recipe discovery and meal-plan shopping');
    const groups = document.createElement('div');
    groups.className = 'productivity-dashboard__groups productivity-dashboard__groups--discovery';
    groups.appendChild(createDiscoveryGroup(discoveries));
    dashboard.appendChild(groups);
    dashboard.appendChild(createShoppingPanel());
    mealView.insertBefore(dashboard, mealGrid);
  };

  const refreshProductivityUi = () => {
    renderDashboard();
    enhanceVisibleCards();
  };

  const render = (context) => {
    if (!context || !Array.isArray(context.recipes)) return;
    currentContext = context;
    refreshProductivityUi();
  };

  global.BlissfulProductivityUI = Object.assign({}, global.BlissfulProductivityUI || {}, { render });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !document.getElementById('recipe-preview-dialog')?.hidden) closeRecipePreview();
  });
})(typeof window !== 'undefined' ? window : globalThis);
