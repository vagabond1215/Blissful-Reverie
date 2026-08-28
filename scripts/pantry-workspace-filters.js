;(function (global) {
  if (typeof document === 'undefined') return;
  const core = global.BlissfulPantryWorkspaceCore;
  if (!core) return;

  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const recipes = Array.isArray(global.BLISSFUL_RECIPES) ? global.BLISSFUL_RECIPES : [];
  const equipment = Array.isArray(global.BLISSFUL_EQUIPMENT) ? global.BLISSFUL_EQUIPMENT : [];
  const equipmentModel = global.BlissfulEquipmentModel || {};
  const equipmentIndex = typeof equipmentModel.createIndex === 'function'
    ? equipmentModel.createIndex(equipment)
    : null;
  const ingredientByToken = new Map(
    ingredients.map((ingredient) => [String(ingredient?.slug || '').trim(), ingredient]).filter(([token]) => Boolean(token)),
  );

  const CONFIGS = {
    meals: [
      ['categories', 'ingredient-section', 'ingredient-options', 'ingredient-summary', 'Ingredients'],
      ['tags', 'tag-section', 'tag-options', 'tag-summary', 'Tags'],
      ['allergens', 'allergy-section', 'allergy-options', 'allergy-summary', 'Allergens'],
      ['equipment', 'equipment-section', 'equipment-options', 'equipment-summary', 'Equipment'],
    ],
    pantry: [
      ['categories', 'ingredient-section', 'ingredient-options', 'ingredient-summary', 'Categories'],
      ['tags', 'tag-section', 'tag-options', 'tag-summary', 'Tags'],
      ['allergens', 'allergy-section', 'allergy-options', 'allergy-summary', 'Allergens'],
    ],
    kitchen: [
      ['categories', 'ingredient-section', 'ingredient-options', 'ingredient-summary', 'Categories'],
    ],
  };

  const pantryCounts = Object.fromEntries(
    ['categories', 'tags', 'allergens'].map((key) => [key, core.countOptions(ingredients, key)]),
  );

  const recipeCategoryCounts = {};
  const recipeEquipmentCounts = {};
  recipes.forEach((recipe) => {
    const categories = new Set();
    (Array.isArray(recipe?.ingredients) ? recipe.ingredients : []).forEach((entry) => {
      const token = String(entry?.token || '').trim();
      const category = ingredientByToken.get(token)?.category;
      if (category) categories.add(category);
    });
    categories.forEach((category) => {
      const key = core.normalize(category);
      recipeCategoryCounts[key] = (recipeCategoryCounts[key] || 0) + 1;
    });

    if (typeof equipmentModel.collectRecipeTokens === 'function' && equipmentIndex) {
      equipmentModel.collectRecipeTokens(recipe, equipmentIndex).forEach((token) => {
        const key = core.normalize(token);
        recipeEquipmentCounts[key] = (recipeEquipmentCounts[key] || 0) + 1;
      });
    }
  });

  const kitchenCategoryCounts = {};
  equipment.forEach((item) => {
    const key = core.normalize(item?.category);
    if (key) kitchenCategoryCounts[key] = (kitchenCategoryCounts[key] || 0) + 1;
  });

  const countFor = (mode, key, value) => {
    const normalized = core.normalize(value);
    if (mode === 'pantry') return pantryCounts[key]?.[normalized];
    if (mode === 'meals' && key === 'categories') return recipeCategoryCounts[normalized];
    if (mode === 'meals' && key === 'equipment') return recipeEquipmentCounts[normalized];
    if (mode === 'kitchen' && key === 'categories') return kitchenCategoryCounts[normalized];
    return undefined;
  };

  let queued = false;
  const setText = (node, value) => {
    const next = String(value ?? '');
    if (node && node.textContent !== next) node.textContent = next;
  };

  const activeMode = () => {
    const pantry = document.getElementById('pantry-view');
    if (pantry instanceof HTMLElement && !pantry.hidden) return 'pantry';
    const kitchen = document.getElementById('kitchen-view');
    if (kitchen instanceof HTMLElement && !kitchen.hidden) return 'kitchen';
    const meals = document.getElementById('meal-view');
    if (meals instanceof HTMLElement && !meals.hidden) return 'meals';
    return '';
  };

  const optionDescriptor = (node) => {
    const input = node.querySelector('input[type="checkbox"]');
    if (input instanceof HTMLInputElement) {
      return { value: input.value, selected: input.checked };
    }
    const value = node.dataset?.filterValue || '';
    const state = node.getAttribute('aria-checked');
    return { value, selected: state === 'true' || state === 'mixed' };
  };

  const enhance = (mode, [key, sectionId, optionsId, summaryId, title]) => {
    const section = document.getElementById(sectionId);
    const container = document.getElementById(optionsId);
    const summary = document.getElementById(summaryId);
    if (!(section instanceof HTMLDetailsElement) || !(container instanceof HTMLElement) || !(summary instanceof HTMLElement)) return;

    section.classList.add('pantry-workspace__filter-card');
    if (key !== 'categories' && summary.textContent !== title) summary.textContent = title;

    const labels = Array.from(container.querySelectorAll(':scope > .checkbox-option'))
      .filter((node) => node instanceof HTMLElement);
    const options = labels.map((label) => ({ label, ...optionDescriptor(label) }));
    const limit = Number(core.LIMITS[key]) || (key === 'equipment' ? 8 : 12);
    const expanded = section.dataset.showAll === 'true';
    const shown = new Set(core.visibleIndexes(options, limit, expanded));

    options.forEach((option, index) => {
      option.label.classList.add('pantry-workspace__filter-option');
      const hidden = !shown.has(index);
      if (option.label.hidden !== hidden) option.label.hidden = hidden;
      const numericCount = countFor(mode, key, option.value);
      let count = option.label.querySelector('.pantry-workspace__filter-count');
      if (Number.isFinite(numericCount)) {
        if (!(count instanceof HTMLElement)) {
          count = document.createElement('span');
          count.className = 'pantry-workspace__filter-count';
          count.setAttribute('aria-hidden', 'true');
          option.label.appendChild(count);
        }
        setText(count, `(${numericCount})`);
      } else if (count instanceof HTMLElement) {
        count.remove();
      }
    });

    let more = section.querySelector(':scope > .pantry-workspace__show-more');
    if (labels.length > limit) {
      if (!(more instanceof HTMLButtonElement)) {
        more = document.createElement('button');
        more.type = 'button';
        more.className = 'pantry-workspace__show-more';
        more.addEventListener('click', () => {
          section.dataset.showAll = section.dataset.showAll === 'true' ? 'false' : 'true';
          enhance(mode, [key, sectionId, optionsId, summaryId, title]);
        });
        section.appendChild(more);
      }
      if (more.hidden) more.hidden = false;
      setText(more, expanded ? 'Show less ︿' : 'Show more ﹀');
      more.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    } else if (more instanceof HTMLButtonElement && !more.hidden) {
      more.hidden = true;
    }
  };

  const ensureAll = () => {
    const summary = document.getElementById('ingredient-summary');
    if (!(summary instanceof HTMLElement) || summary.querySelector('.pantry-workspace__all-button')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pantry-workspace__all-button';
    button.textContent = 'All';
    button.setAttribute('aria-label', 'Show all categories');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      Array.from(document.querySelectorAll('#ingredient-options input[type="checkbox"]:checked')).forEach((input) => {
        if (input instanceof HTMLInputElement) input.click();
      });
    });
    summary.appendChild(button);
  };

  const sync = () => {
    queued = false;
    const mode = activeMode();
    const configs = CONFIGS[mode];
    if (!configs) return;
    configs.forEach((config) => enhance(mode, config));
    ensureAll();
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    global.requestAnimationFrame(sync);
  };

  const start = () => {
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden'],
    });
    schedule();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
