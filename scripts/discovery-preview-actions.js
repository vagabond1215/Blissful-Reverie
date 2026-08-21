;(function (global) {
  const normalizeRecipeName = (value) => String(value || '').trim().toLowerCase();
  const getRecipeIdFromPreviewButton = (button) => {
    const card = button?.closest?.('.meal-card--preview[data-recipe-id]');
    return String(card?.dataset?.recipeId || '').trim();
  };
  const getRecipeForChipLabel = (recipes, label) => {
    const target = normalizeRecipeName(label);
    return (Array.isArray(recipes) ? recipes : []).find((recipe) => normalizeRecipeName(recipe?.name) === target) || null;
  };
  const getRecipeById = (recipes, recipeId) => {
    const target = String(recipeId || '').trim();
    if (!target) return null;
    return (Array.isArray(recipes) ? recipes : []).find((recipe) => String(recipe?.id || '').trim() === target) || null;
  };
  const buildPreviewModel = (recipe) => ({
    id: String(recipe?.id || '').trim(),
    name: String(recipe?.name || 'Recipe').trim(),
    description: String(recipe?.description || '').trim(),
    tags: Array.isArray(recipe?.tags) ? recipe.tags.map((tag) => String(tag || '').trim()).filter(Boolean) : [],
    ingredients: Array.isArray(recipe?.ingredients) ? recipe.ingredients.map((ingredient) => ({
      quantity: ingredient?.quantity,
      unit: String(ingredient?.unit || '').trim(),
      item: String(ingredient?.item || '').trim(),
    })) : [],
    instructions: Array.isArray(recipe?.instructions) ? recipe.instructions.map((step) => String(step || '').trim()).filter(Boolean) : [],
    equipment: Array.isArray(recipe?.equipment) ? recipe.equipment.map((item) => String(item || '').trim()).filter(Boolean) : [],
    allergens: Array.isArray(recipe?.allergens) ? recipe.allergens.map((item) => String(item || '').trim()).filter(Boolean) : [],
    nutrition: recipe?.nutritionPerServing && typeof recipe.nutritionPerServing === 'object' ? { ...recipe.nutritionPerServing } : null,
  });

  const api = {
    normalizeRecipeName,
    getRecipeIdFromPreviewButton,
    getRecipeForChipLabel,
    getRecipeById,
    buildPreviewModel,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulDiscoveryPreviewActions = Object.assign({}, global.BlissfulDiscoveryPreviewActions || {}, api);
  if (typeof document === 'undefined') return;

  const recipes = Array.isArray(global.BLISSFUL_RECIPES) ? global.BLISSFUL_RECIPES : [];
  let previewReturnFocus = null;

  const formatQuantity = (quantity, unit) => {
    const quantityText = quantity === null || quantity === undefined ? '' : String(quantity).trim();
    return [quantityText, String(unit || '').trim()].filter(Boolean).join(' ');
  };

  const ensureDialog = () => {
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
    return root;
  };

  const closePreview = () => {
    const root = document.getElementById('recipe-preview-dialog');
    if (!(root instanceof HTMLElement) || root.hidden) return;
    root.hidden = true;
    root.querySelector('#recipe-preview-body')?.replaceChildren();
    if (previewReturnFocus instanceof HTMLElement) previewReturnFocus.focus();
    previewReturnFocus = null;
  };

  const createListSection = (headingText, values, ordered = false) => {
    const section = document.createElement('section');
    section.className = 'meal-card__section';
    const heading = document.createElement('h4');
    heading.textContent = headingText;
    section.appendChild(heading);
    const list = document.createElement(ordered ? 'ol' : 'ul');
    list.className = ordered ? 'instruction-list' : 'inline-list';
    (Array.isArray(values) ? values : []).forEach((value) => {
      const item = document.createElement('li');
      item.textContent = String(value || '');
      list.appendChild(item);
    });
    section.appendChild(list);
    return section;
  };

  const createPreviewCard = (recipe) => {
    const model = buildPreviewModel(recipe);
    const card = document.createElement('article');
    card.className = 'meal-card meal-card--preview';
    card.dataset.recipeId = model.id;

    const header = document.createElement('header');
    header.className = 'meal-card__header';
    const headingWrap = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = model.name;
    headingWrap.appendChild(title);
    if (model.description) {
      const description = document.createElement('p');
      description.textContent = model.description;
      headingWrap.appendChild(description);
    }
    if (model.tags.length) {
      const tags = document.createElement('ul');
      tags.className = 'tag-list';
      model.tags.forEach((tag) => {
        const item = document.createElement('li');
        item.textContent = tag;
        tags.appendChild(item);
      });
      headingWrap.appendChild(tags);
    }
    const plan = document.createElement('button');
    plan.type = 'button';
    plan.className = 'meal-card__schedule-button';
    plan.dataset.discoveryPreviewPlan = model.id;
    plan.textContent = 'Plan & Shop';
    plan.setAttribute('aria-label', `Plan ${model.name}`);
    header.append(headingWrap, plan);
    card.appendChild(header);

    const ingredientSection = document.createElement('section');
    ingredientSection.className = 'meal-card__section';
    const ingredientHeading = document.createElement('h4');
    ingredientHeading.textContent = 'Ingredients';
    ingredientSection.appendChild(ingredientHeading);
    const ingredientList = document.createElement('ul');
    ingredientList.className = 'ingredient-list';
    model.ingredients.forEach((ingredient) => {
      const item = document.createElement('li');
      const quantity = document.createElement('span');
      quantity.className = 'ingredient-quantity';
      quantity.textContent = formatQuantity(ingredient.quantity, ingredient.unit);
      const name = document.createElement('span');
      name.className = 'ingredient-name';
      name.textContent = ingredient.item;
      item.append(quantity, name);
      ingredientList.appendChild(item);
    });
    ingredientSection.appendChild(ingredientList);
    card.appendChild(ingredientSection);

    card.appendChild(createListSection('Instructions', model.instructions, true));
    card.appendChild(createListSection('Equipment', model.equipment));
    card.appendChild(createListSection('Allergens', model.allergens.length ? model.allergens : ['None']));

    if (model.nutrition) {
      const nutrition = document.createElement('section');
      nutrition.className = 'meal-card__section nutrition';
      const heading = document.createElement('h4');
      heading.textContent = 'Nutrition';
      nutrition.appendChild(heading);
      const grid = document.createElement('div');
      grid.className = 'nutrition-grid';
      Object.entries(model.nutrition).forEach(([key, value]) => {
        const cell = document.createElement('div');
        const label = document.createElement('span');
        label.className = 'nutrition-label';
        label.textContent = key;
        const amount = document.createElement('span');
        amount.className = 'nutrition-value';
        amount.textContent = `${value} / serving`;
        cell.append(label, amount);
        grid.appendChild(cell);
      });
      nutrition.appendChild(grid);
      card.appendChild(nutrition);
    }
    return card;
  };

  const openPreview = (recipe, trigger) => {
    if (!recipe?.id) return false;
    const root = ensureDialog();
    const body = root.querySelector('#recipe-preview-body');
    const title = root.querySelector('#recipe-preview-title');
    if (!(body instanceof HTMLElement)) return false;
    body.replaceChildren(createPreviewCard(recipe));
    if (title instanceof HTMLElement) title.textContent = recipe.name || 'Recipe preview';
    previewReturnFocus = trigger instanceof HTMLElement ? trigger : null;
    root.hidden = false;
    root.querySelector('.recipe-preview-dialog__close')?.focus();
    return true;
  };

  const findLiveScheduleButton = (recipeId) => document.querySelector(
    `#meal-grid .meal-card[data-recipe-id="${CSS.escape(String(recipeId || ''))}"] .meal-card__schedule-button`,
  );

  const renderRecipeIntoCurrentPage = (recipe) => {
    const search = document.getElementById('filter-search');
    if (!(search instanceof HTMLInputElement)) return Promise.resolve(null);
    const previous = search.value;
    search.value = recipe.name || '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise((resolve) => {
      global.requestAnimationFrame(() => global.requestAnimationFrame(() => {
        resolve({ button: findLiveScheduleButton(recipe.id), search, previous });
      }));
    });
  };

  const restoreSearch = ({ search, previous } = {}) => {
    if (!(search instanceof HTMLInputElement)) return;
    search.value = String(previous || '');
    search.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const planRecipe = async (recipeId) => {
    const recipe = getRecipeById(recipes, recipeId);
    if (!recipe) return;
    const scrollX = Number(global.scrollX) || 0;
    const scrollY = Number(global.scrollY) || 0;
    let liveButton = findLiveScheduleButton(recipe.id);
    let temporarySearch = null;
    if (!(liveButton instanceof HTMLButtonElement)) {
      temporarySearch = await renderRecipeIntoCurrentPage(recipe);
      liveButton = temporarySearch?.button;
    }
    if (!(liveButton instanceof HTMLButtonElement)) {
      restoreSearch(temporarySearch);
      return;
    }
    closePreview();
    if (typeof global.scrollTo === 'function') global.scrollTo(scrollX, scrollY);
    liveButton.click();
    if (temporarySearch) global.requestAnimationFrame(() => restoreSearch(temporarySearch));
  };

  const handleDiscoveryChip = (event) => {
    const chip = event.target instanceof Element
      ? event.target.closest('.productivity-dashboard__recipe-chip')
      : null;
    if (!(chip instanceof HTMLButtonElement)) return;
    const recipe = getRecipeForChipLabel(recipes, chip.textContent);
    if (!recipe) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openPreview(recipe, chip);
  };

  const handlePreviewAction = (event) => {
    const close = event.target instanceof Element ? event.target.closest('[data-recipe-preview-close]') : null;
    if (close) {
      event.preventDefault();
      closePreview();
      return;
    }
    const plan = event.target instanceof Element ? event.target.closest('[data-discovery-preview-plan]') : null;
    if (!(plan instanceof HTMLButtonElement)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    planRecipe(plan.dataset.discoveryPreviewPlan || getRecipeIdFromPreviewButton(plan));
  };

  const start = () => {
    document.addEventListener('click', handleDiscoveryChip, true);
    document.addEventListener('click', handlePreviewAction, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !document.getElementById('recipe-preview-dialog')?.hidden) closePreview();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
