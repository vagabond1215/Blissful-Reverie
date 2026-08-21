;(function (global) {
  const STORAGE_KEY = 'blissful-family-dislikes';
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

  const api = { normalizeToken, normalizeTokens, recipeConflictsWithTokens, filterRecipesForActiveDislikes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulFamilyPagination = Object.assign({}, global.BlissfulFamilyPagination || {}, api);
  if (typeof document === 'undefined') return;

  const recipes = Array.isArray(global.BLISSFUL_RECIPES) ? global.BLISSFUL_RECIPES : [];
  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const ingredientBySlug = new Map(ingredients.filter((item) => item?.slug).map((item) => [item.slug, item]));
  let recipeIngredientMatches = new Map();
  let installed = false;
  let rerenderScheduled = false;
  let attempts = 0;

  const buildRecipeMatches = () => {
    const matching = global.BlissfulMatching || {};
    if (typeof matching.createIngredientMatcherIndex !== 'function' || typeof matching.mapRecipesToIngredientMatches !== 'function') return;
    try {
      const index = matching.createIngredientMatcherIndex(ingredients);
      const mapped = matching.mapRecipesToIngredientMatches(recipes, index);
      if (mapped?.recipeIngredientMatches instanceof Map) recipeIngredientMatches = mapped.recipeIngredientMatches;
    } catch (error) {}
  };

  const readState = () => {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem?.(STORAGE_KEY) || '{}');
      return isRecord(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  };

  const getActiveMemberIds = () => {
    const cards = Array.from(document.querySelectorAll('#family-member-list .family-member-card'))
      .filter((card) => card instanceof HTMLElement && card.dataset.familyId);
    return Array.from(document.querySelectorAll('#recipe-family-filter .recipe-family-filter__button'))
      .reduce((ids, button, index) => {
        if (!(button instanceof HTMLButtonElement) || button.getAttribute('aria-pressed') !== 'true') return ids;
        const id = String(cards[index]?.dataset.familyId || '').trim();
        if (id) ids.push(id);
        return ids;
      }, []);
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
      const allowed = filterRecipesForActiveDislikes({
        recipes: items,
        memberIds: getActiveMemberIds(),
        state: readState(),
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
      if (event.key === STORAGE_KEY) requestRecipeRerender();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
