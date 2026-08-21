;(function (global) {
  const STORAGE_KEY = 'blissful-family-dislikes';
  const APP_STATE_KEY = 'blissful-app-state';
  const normalizeText = (value) => String(value || '').trim().toLowerCase();
  const slugify = (value) => normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);

  const normalizeToken = (value) => {
    const source = isRecord(value) ? value : {};
    const kind = source.kind === 'category' ? 'category' : source.kind === 'ingredient' ? 'ingredient' : '';
    const key = String(source.key || '').trim();
    const label = String(source.label || '').trim();
    return kind && key && label ? { kind, key, label } : null;
  };

  const normalizeTokens = (values) => {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).reduce((result, value) => {
      const token = normalizeToken(value);
      if (!token) return result;
      const signature = `${token.kind}:${token.key}`;
      if (seen.has(signature)) return result;
      seen.add(signature);
      result.push(token);
      return result;
    }, []);
  };

  const hasUnindexedRecipes = (recipes, indexedRecipeIds) => {
    const indexed = indexedRecipeIds instanceof Set ? indexedRecipeIds : new Set();
    return (Array.isArray(recipes) ? recipes : []).some((recipe) => {
      const id = String(recipe?.id || '').trim();
      return Boolean(id) && !indexed.has(id);
    });
  };

  const resolveActiveMemberIds = (pressedStates, familyMembers) => {
    const members = Array.isArray(familyMembers) ? familyMembers : [];
    return (Array.isArray(pressedStates) ? pressedStates : []).reduce((ids, pressed, index) => {
      if (!pressed) return ids;
      const id = String(members[index]?.id || '').trim();
      if (id) ids.push(id);
      return ids;
    }, []);
  };

  const recipeConflictsWithTokens = ({ recipe, tokens, recipeIngredientMatches, ingredientBySlug } = {}) => {
    if (!recipe?.id) return false;
    const slugs = recipeIngredientMatches instanceof Map
      ? recipeIngredientMatches.get(recipe.id)
      : null;
    if (!(slugs instanceof Set) || !slugs.size) return false;
    for (const token of normalizeTokens(tokens)) {
      if (token.kind === 'ingredient' && slugs.has(token.key)) return true;
      if (token.kind === 'category') {
        for (const ingredientSlug of slugs) {
          const ingredient = ingredientBySlug instanceof Map ? ingredientBySlug.get(ingredientSlug) : null;
          if (ingredient && slugify(ingredient.category) === token.key) return true;
        }
      }
    }
    return false;
  };

  const filterRecipesForActiveDislikes = ({ recipes, memberIds, state, recipeIngredientMatches, ingredientBySlug } = {}) => {
    const source = Array.isArray(recipes) ? recipes : [];
    const members = isRecord(state?.members) ? state.members : {};
    const tokens = normalizeTokens((Array.isArray(memberIds) ? memberIds : [])
      .flatMap((memberId) => Array.isArray(members[String(memberId || '')]) ? members[String(memberId || '')] : []));
    if (!tokens.length) return source.slice();
    return source.filter((recipe) => !recipeConflictsWithTokens({
      recipe,
      tokens,
      recipeIngredientMatches,
      ingredientBySlug,
    }));
  };

  const api = {
    normalizeToken,
    normalizeTokens,
    hasUnindexedRecipes,
    resolveActiveMemberIds,
    recipeConflictsWithTokens,
    filterRecipesForActiveDislikes,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulFamilyPagination = Object.assign({}, global.BlissfulFamilyPagination || {}, api);
  if (typeof document === 'undefined') return;

  const recipes = Array.isArray(global.BLISSFUL_RECIPES) ? global.BLISSFUL_RECIPES : [];
  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const ingredientBySlug = new Map(ingredients.filter((item) => item?.slug).map((item) => [item.slug, item]));
  let recipeIngredientMatches = new Map();
  let indexedRecipeIds = new Set();
  let installed = false;
  let rerenderScheduled = false;
  let attempts = 0;

  const buildRecipeMatches = () => {
    const matching = global.BlissfulMatching || {};
    if (typeof matching.createIngredientMatcherIndex !== 'function' || typeof matching.mapRecipesToIngredientMatches !== 'function') return false;
    try {
      const index = matching.createIngredientMatcherIndex(ingredients);
      const mapped = matching.mapRecipesToIngredientMatches(recipes, index);
      if (!(mapped?.recipeIngredientMatches instanceof Map)) return false;
      recipeIngredientMatches = mapped.recipeIngredientMatches;
      indexedRecipeIds = new Set(
        recipes.map((recipe) => String(recipe?.id || '').trim()).filter(Boolean),
      );
      return true;
    } catch (error) {
      return false;
    }
  };

  const readDislikeState = () => {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem?.(STORAGE_KEY) || '{}');
      return isRecord(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  };

  const readFamilyMembers = () => {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem?.(APP_STATE_KEY) || '{}');
      return Array.isArray(parsed?.familyMembers) ? parsed.familyMembers : [];
    } catch (error) {
      return [];
    }
  };

  const getActiveMemberIds = () => {
    const pressedStates = Array.from(document.querySelectorAll('#recipe-family-filter .recipe-family-filter__button'))
      .map((button) => button instanceof HTMLButtonElement && button.getAttribute('aria-pressed') === 'true');
    return resolveActiveMemberIds(pressedStates, readFamilyMembers());
  };

  const requestRecipeRerender = () => {
    if (rerenderScheduled) return;
    rerenderScheduled = true;
    global.requestAnimationFrame(() => {
      rerenderScheduled = false;
      const input = document.getElementById('filter-search');
      if (!(input instanceof HTMLInputElement)) return;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };

  const install = () => {
    if (installed) return true;
    const pagination = global.BlissfulRecipePagination;
    if (!pagination || typeof pagination.paginateItems !== 'function') return false;
    buildRecipeMatches();
    const original = pagination.paginateItems.bind(pagination);
    pagination.paginateItems = (items, page, pageSize) => {
      if (hasUnindexedRecipes(items, indexedRecipeIds)) buildRecipeMatches();
      const allowed = filterRecipesForActiveDislikes({
        recipes: items,
        memberIds: getActiveMemberIds(),
        state: readDislikeState(),
        recipeIngredientMatches,
        ingredientBySlug,
      });
      return original(allowed, page, pageSize);
    };
    pagination.__familyDislikesIntegrated = true;
    installed = true;
    return true;
  };

  const ensureInstalled = () => {
    if (install() || attempts >= 60) return;
    attempts += 1;
    global.requestAnimationFrame(ensureInstalled);
  };

  const start = () => {
    ensureInstalled();
    global.addEventListener('blissful-family-dislikes-change', (event) => {
      if (event instanceof CustomEvent && event.detail?.memberId) requestRecipeRerender();
    });
    document.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('#recipe-family-filter .recipe-family-filter__button')) {
        global.requestAnimationFrame(requestRecipeRerender);
      }
    }, true);
    global.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY || event.key === APP_STATE_KEY) requestRecipeRerender();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
