;(function (global) {
  const DESCRIPTOR_TOKENS = new Set([
    'and',
    'or',
    'with',
    'plus',
    'to',
    'of',
    'the',
    'a',
    'an',
    'for',
    'into',
    'divided',
    'peeled',
    'seeded',
    'fresh',
    'dried',
    'large',
    'small',
    'medium',
    'boneless',
    'skinless',
    'extra',
    'virgin',
    'chopped',
    'minced',
    'sliced',
    'diced',
    'shredded',
    'crushed',
    'grated',
    'finely',
    'roughly',
    'coarsely',
    'warm',
    'cold',
    'hot',
    'room',
    'temperature',
    'packed',
    'ripe',
    'lean',
    'optional',
    'halved',
    'quartered',
    'trimmed',
    'rinsed',
    'drained',
    'thawed',
    'softened',
    'melted',
    'crumbled',
    'mashed',
    'beaten',
    'zested',
    'juiced',
    'wedges',
    'pieces',
    'chunks',
    'strips',
  ]);
  const LOW_SPECIFICITY_TOKENS = new Set(['cooked']);

  const sanitizeComparisonText = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const sanitizeMatcherText = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[()]/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const expandTokenForms = (token) => {
    const forms = new Set([token]);
    if (token.length > 4 && token.endsWith('ies')) {
      forms.add(`${token.slice(0, -3)}y`);
    }
    if (token.length > 4 && token.endsWith('ves')) {
      forms.add(`${token.slice(0, -3)}f`);
      forms.add(`${token.slice(0, -3)}fe`);
    }
    if (token.length > 3 && token.endsWith('es')) {
      forms.add(token.slice(0, -2));
    }
    if (token.length > 3 && token.endsWith('s')) {
      forms.add(token.slice(0, -1));
    }
    return Array.from(forms);
  };

  const buildTokenSet = (text) => {
    const normalized = sanitizeComparisonText(text);
    if (!normalized) return new Set();
    const tokens = normalized.split(/\s+/);
    const result = new Set();
    tokens.forEach((token) => {
      if (!token || DESCRIPTOR_TOKENS.has(token)) return;
      expandTokenForms(token).forEach((form) => result.add(form));
    });
    return result;
  };

  const createIngredientMatcher = (ingredient) => {
    const nameTokens = buildTokenSet(ingredient.name);
    const slugText = String(ingredient.slug || '')
      .split('-')
      .slice(1)
      .join(' ');
    const slugTokens = buildTokenSet(slugText);
    const tokens = new Set([...nameTokens, ...slugTokens]);
    if (!tokens.size) {
      const fallback = sanitizeComparisonText(ingredient.name);
      if (fallback) {
        fallback.split(/\s+/).forEach((token) => {
          if (token) tokens.add(token);
        });
      }
    }
    const variants = new Set();
    const normalizedName = sanitizeMatcherText(ingredient.name);
    if (normalizedName && normalizedName.includes(' ')) {
      variants.add(normalizedName);
    }
    const normalizedSlug = sanitizeComparisonText(slugText);
    if (normalizedSlug && (normalizedSlug.includes(' ') || tokens.size <= 1)) {
      variants.add(normalizedSlug);
    }
    const essentialTokens = Array.from(tokens);
    if (essentialTokens.length > 1) {
      variants.add(essentialTokens.join(' '));
    } else if (essentialTokens.length === 1) {
      variants.add(essentialTokens[0]);
    }
    if (Array.isArray(ingredient.aliases)) {
      ingredient.aliases
        .map((alias) => sanitizeMatcherText(alias))
        .filter(Boolean)
        .forEach((alias) => variants.add(alias));
    }
    return { slug: ingredient.slug, label: ingredient.name, tokens, variants };
  };

  const containsPhrase = (text, phrase) =>
    Boolean(text && phrase && ` ${text} `.includes(` ${phrase} `));

  const doesEntryMatchIngredient = (entry, matcher) => {
    if (!entry || !matcher) return false;
    if (matcher.variants) {
      for (const variant of matcher.variants) {
        if (!variant) continue;
        if (containsPhrase(entry.text, variant) || containsPhrase(variant, entry.text)) {
          return true;
        }
      }
    }
    if (matcher.tokens && matcher.tokens.size) {
      const entryTokens = entry.tokens instanceof Set ? entry.tokens : new Set();
      if (Array.from(matcher.tokens).every((token) => entryTokens.has(token))) {
        return true;
      }
    }
    return false;
  };

  const createIngredientMatcherIndex = (ingredients) => {
    const matchers = new Map();
    const tokenIndex = new Map();
    const slugsWithoutTokens = new Set();

    (Array.isArray(ingredients) ? ingredients : []).forEach((ingredient) => {
      if (!ingredient || !ingredient.slug) return;
      const matcher = createIngredientMatcher(ingredient);
      matchers.set(ingredient.slug, matcher);
      const matcherTokens = matcher.tokens instanceof Set ? Array.from(matcher.tokens) : [];
      if (matcherTokens.length) {
        matcherTokens.forEach((token) => {
          if (!token) return;
          let slugs = tokenIndex.get(token);
          if (!slugs) {
            slugs = new Set();
            tokenIndex.set(token, slugs);
          }
          slugs.add(ingredient.slug);
        });
      } else {
        slugsWithoutTokens.add(ingredient.slug);
      }
    });

    return { matchers, tokenIndex, slugsWithoutTokens };
  };

  const prepareEntry = (rawEntry) => ({
    text: sanitizeComparisonText(rawEntry ? rawEntry.item : ''),
    tokens: buildTokenSet(rawEntry ? rawEntry.item : ''),
  });

  const findMatchesForEntries = (entries, index) => {
    const matchedSlugs = new Set();
    if (!entries.length) return matchedSlugs;

    entries.forEach((entry) => {
      if (!entry || !(entry.tokens instanceof Set)) return;
      const candidateSlugs = new Set(index.slugsWithoutTokens);
      entry.tokens.forEach((token) => {
        const slugsForToken = index.tokenIndex.get(token);
        if (slugsForToken) {
          slugsForToken.forEach((slug) => candidateSlugs.add(slug));
        }
      });

      const entryMatches = Array.from(candidateSlugs)
        .map((slug) => index.matchers.get(slug))
        .filter((matcher) => matcher && doesEntryMatchIngredient(entry, matcher));
      entryMatches.forEach((matcher) => {
        const isLessSpecific = entryMatches.some((other) => {
          if (other === matcher) return false;
          const matcherTokens = Array.from(matcher.tokens)
            .filter((token) => !LOW_SPECIFICITY_TOKENS.has(token));
          const otherTokens = new Set(
            Array.from(other.tokens).filter((token) => !LOW_SPECIFICITY_TOKENS.has(token)),
          );
          if (matcherTokens.length >= otherTokens.size) return false;
          if (!Array.from(otherTokens).every((token) => entry.tokens.has(token))) return false;
          return matcherTokens.every((token) => otherTokens.has(token));
        });
        if (!isLessSpecific) {
          matchedSlugs.add(matcher.slug);
        }
      });
    });

    return matchedSlugs;
  };

  const mapRecipesToIngredientMatches = (recipes, index) => {
    const recipeIngredientMatches = new Map();
    const ingredientUsage = new Map();
    index.matchers.forEach((_, slug) => ingredientUsage.set(slug, false));

    (Array.isArray(recipes) ? recipes : []).forEach((recipe) => {
      if (!recipe || !recipe.id) return;
      const entries = (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).map(prepareEntry);
      const matchedSlugs = findMatchesForEntries(entries, index);
      matchedSlugs.forEach((slug) => ingredientUsage.set(slug, true));
      recipeIngredientMatches.set(recipe.id, matchedSlugs);
    });

    return { recipeIngredientMatches, ingredientUsage };
  };

  const api = {
    sanitizeComparisonText,
    buildTokenSet,
    createIngredientMatcher,
    doesEntryMatchIngredient,
    createIngredientMatcherIndex,
    mapRecipesToIngredientMatches,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  const existing = global.BlissfulMatching || {};
  global.BlissfulMatching = Object.assign({}, existing, api);
})(typeof window !== 'undefined' ? window : globalThis);
