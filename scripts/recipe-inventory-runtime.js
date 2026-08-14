;(function (global) {
  const core = global.BlissfulInventoryUnits || (typeof require === 'function' ? require('./inventory-units-core.js') : {});
  const APP_STATE_KEY = 'blissful-app-state';
  const PROFILE_KEY = core.PROFILE_STORAGE_KEY || 'blissful-inventory-unit-profiles';
  const USAGE_KEY = 'blissful-pantry-usage';
  const recipes = Array.isArray(global.BLISSFUL_RECIPES) ? global.BLISSFUL_RECIPES : [];
  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const recipeById = new Map(recipes.filter((recipe) => recipe?.id).map((recipe) => [String(recipe.id), recipe]));

  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const readJson = (key, fallback) => {
    try { const raw = global.localStorage?.getItem?.(key); return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  };
  const writeJson = (key, value) => {
    try { global.localStorage?.setItem?.(key, JSON.stringify(value)); return true; } catch (error) { return false; }
  };
  const getState = () => {
    const value = readJson(APP_STATE_KEY, {});
    return isRecord(value) ? value : {};
  };
  const getProfiles = () => core.normalizeProfiles?.(readJson(PROFILE_KEY, {})) || {};
  const getServingScale = (recipe, state) => {
    const base = Number(recipe?.baseServings) || 1;
    const override = Number(state?.servingOverrides?.[recipe?.id]);
    return Number.isFinite(override) && override > 0 ? override / base : 1;
  };

  const commitInventory = (inventory) => {
    const state = getState();
    state.pantryInventory = isRecord(inventory) ? inventory : {};
    writeJson(APP_STATE_KEY, state);
    if (typeof global.BlissfulApp?.applyStarterState === 'function') {
      try { global.BlissfulApp.applyStarterState(state); } catch (error) {}
    }
    global.dispatchEvent?.(new CustomEvent('blissful-inventory-change', { detail: { inventory: state.pantryInventory } }));
  };

  const recordUsage = (changes) => {
    const append = global.BlissfulShopping?.appendUsageEvent;
    if (typeof append !== 'function' || !Array.isArray(changes) || !changes.length) return;
    let history = readJson(USAGE_KEY, {});
    changes.forEach((change) => {
      history = append(history, {
        slug: change.slug,
        before: change.before,
        after: change.after,
        unit: change.unit,
      });
    });
    writeJson(USAGE_KEY, history);
  };

  const summarizeConsumption = (result) => {
    if (!result?.ok) {
      if (result?.reason === 'insufficient-stock') return 'Not enough tracked Pantry stock to apply this recipe.';
      if (result?.reason === 'incompatible-existing-unit' || result?.reason === 'incompatible-unit') {
        return 'A tracked Pantry item needs a compatible unit or package conversion first.';
      }
      return 'Pantry quantities were not changed.';
    }
    const changed = result.changes?.length || 0;
    const skipped = result.skipped?.length || 0;
    if (!changed) return skipped ? 'No tracked, convertible Pantry quantities were changed.' : 'No Pantry quantities were needed.';
    return skipped
      ? `Used ${changed} tracked Pantry item${changed === 1 ? '' : 's'}; ${skipped} untracked/unsupported item${skipped === 1 ? '' : 's'} left unchanged.`
      : `Used ${changed} tracked Pantry item${changed === 1 ? '' : 's'}.`;
  };

  const cookRecipe = (recipe) => {
    const state = getState();
    const result = core.consumeRecipe?.({
      inventory: isRecord(state.pantryInventory) ? state.pantryInventory : {},
      recipe,
      ingredients,
      matching: global.BlissfulMatching || {},
      profiles: getProfiles(),
      servingScale: getServingScale(recipe, state),
    });
    if (result?.ok && result.changes?.length) {
      recordUsage(result.changes);
      commitInventory(result.inventory);
    }
    return result;
  };

  const enhanceCard = (card) => {
    if (!(card instanceof HTMLElement) || card.querySelector('.recipe-inventory-action')) return;
    const recipe = recipeById.get(String(card.dataset.recipeId || ''));
    if (!recipe) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'recipe-inventory-action';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recipe-inventory-action__button';
    button.textContent = 'Cook & use Pantry';
    button.title = 'Explicitly consume tracked Pantry quantities for this recipe. Planning a meal never consumes inventory.';
    const status = document.createElement('span');
    status.className = 'recipe-inventory-action__status';
    status.setAttribute('aria-live', 'polite');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const result = cookRecipe(recipe);
      status.textContent = summarizeConsumption(result);
    });
    wrapper.addEventListener('click', (event) => event.stopPropagation());
    wrapper.append(button, status);
    card.appendChild(wrapper);
  };

  const api = { getServingScale, summarizeConsumption, cookRecipe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulRecipeInventory = Object.assign({}, global.BlissfulRecipeInventory || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;
  const sync = () => document.querySelectorAll('#meal-grid .meal-card').forEach(enhanceCard);
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      sync();
    });
  };
  const start = () => {
    sync();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
