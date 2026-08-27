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

  // Compatibility-preserving refinements for legacy generic slugs. Existing saved
  // pantry state keeps the same slug; the display becomes an intentional default
  // form while more-specific additions below win recipe matching when present.
  const INGREDIENT_SPECIFICITY_OVERRIDES = Object.freeze({
    'seafood-tuna': {
      name: 'Canned Tuna (Solid White)',
      matchName: 'Tuna',
      aliases: ['Canned Tuna', 'Solid White Tuna'],
      packageUnit: 'can',
    },
    'seafood-salmon': {
      name: 'Fresh Salmon Fillets',
      matchName: 'Salmon',
      aliases: ['Salmon Fillets', 'Fresh Salmon'],
      packageUnit: 'pack',
    },
    'seafood-crab': {
      name: 'Lump Crab Meat',
      matchName: 'Crab',
      aliases: ['Crab Meat', 'Lump Crab Meat'],
      packageUnit: 'can',
    },
    'seafood-lobster': {
      name: 'Lobster Meat',
      matchName: 'Lobster',
      aliases: ['Lobster Meat'],
      packageUnit: 'pack',
    },
    'veg-mushroom': {
      name: 'Cremini Mushrooms (Baby Bella)',
      matchName: 'Mushrooms',
      aliases: ['Cremini Mushrooms', 'Baby Bella Mushrooms'],
      packageUnit: 'pack',
    },
    'veg-bell-pepper': {
      name: 'Bell Pepper (Any Color)',
      matchName: 'Bell Pepper',
      aliases: ['Bell Peppers'],
      packageUnit: 'each',
    },
    'veg-corn': {
      name: 'Corn Kernels (Any Form)',
      matchName: 'Corn',
      aliases: ['Corn Kernels', 'Sweet Corn Kernels', 'Roasted Corn Kernels'],
      packageUnit: 'bag',
    },
    'veg-spinach': {
      name: 'Baby Spinach (Fresh)',
      matchName: 'Spinach',
      aliases: ['Baby Spinach', 'Fresh Spinach'],
      packageUnit: 'bag',
    },
    'veg-green-beans': {
      name: 'Green Beans (Fresh)',
      matchName: 'Green Beans',
      aliases: ['Fresh Green Beans'],
      packageUnit: 'bag',
    },
    'veg-artichoke': {
      name: 'Artichoke Hearts (Canned)',
      matchName: 'Artichoke Hearts',
      aliases: ['Canned Artichoke Hearts'],
      packageUnit: 'can',
    },
    'veg-pimento': {
      name: 'Pimento Peppers (Jarred)',
      matchName: 'Pimento Peppers',
      aliases: ['Pimentos', 'Pimento Peppers'],
      packageUnit: 'jar',
    },
    'veg-hearts-of-palm': {
      name: 'Hearts of Palm (Canned)',
      matchName: 'Hearts of Palm',
      aliases: ['Hearts of Palm'],
      packageUnit: 'can',
    },
    'fruit-mixed-berries': {
      name: 'Mixed Berries (Fresh)',
      matchName: 'Mixed Berries',
      aliases: ['Fresh Mixed Berries'],
      packageUnit: 'clamshell',
    },
    'baking-chocolate-chips': {
      name: 'Semi-Sweet Chocolate Chips',
      matchName: 'Chocolate Chips',
      aliases: ['Chocolate Chips', 'Semi-Sweet Chocolate Chips'],
      packageUnit: 'bag',
    },
    'meat-bacon': {
      name: 'Pork Bacon',
      matchName: 'Bacon',
      aliases: ['Bacon', 'Pork Bacon'],
      packageUnit: 'pack',
    },
    'meat-ham': {
      name: 'Diced Ham',
      matchName: 'Ham',
      aliases: ['Ham', 'Diced Ham'],
      packageUnit: 'pack',
    },
    'grain-rice-cooked': {
      name: 'Ready-to-Eat Cooked Rice',
      matchName: 'Cooked Rice',
      aliases: ['Cooked Rice', 'Ready Rice'],
      packageUnit: 'pouch',
    },
    'bev-coconut-milk': {
      name: 'Coconut Milk (Canned, Culinary)',
      matchName: 'Coconut Milk',
      aliases: ['Canned Coconut Milk', 'Full-Fat Coconut Milk'],
      packageUnit: 'can',
    },
    'bev-bone-broth': {
      name: 'Chicken Bone Broth',
      matchName: 'Bone Broth',
      aliases: ['Bone Broth', 'Chicken Bone Broth'],
      packageUnit: 'carton',
    },
    'bev-seafood-stock': {
      name: 'Seafood Stock (Mixed/Fish)',
      matchName: 'Seafood Stock',
      aliases: ['Seafood Stock'],
      packageUnit: 'carton',
    },
    'legume-kidney-beans': {
      name: 'Kidney Beans (Dark Red)',
      matchName: 'Kidney Beans',
      aliases: ['Dark Red Kidney Beans', 'Kidney Beans'],
      packageUnit: 'can',
    },
    'legume-chickpea': {
      aliases: ['Garbanzo Beans', 'Garbanzo', 'Chickpeas'],
      packageUnit: 'can',
    },
    'dairy-powdered-milk': {
      packageUnit: 'box',
    },
  });

  const INGREDIENT_SPECIFICITY_ADDITIONS = Object.freeze([
    {
      slug: 'seafood-tuna-ahi',
      name: 'Ahi Tuna Loin',
      category: 'Seafood',
      tags: ['Pescatarian', 'Gluten-Free'],
      aliases: ['Ahi Tuna', 'Tuna Loin'],
      packageUnit: 'pack',
    },
    {
      slug: 'seafood-salmon-smoked',
      name: 'Smoked Salmon',
      category: 'Seafood',
      tags: ['Pescatarian', 'Gluten-Free'],
      aliases: ['Smoked Salmon Slices'],
      packageUnit: 'pack',
    },
    {
      slug: 'mushroom-shiitake',
      name: 'Shiitake Mushrooms',
      category: 'Mushrooms & Fungi',
      tags: ['Gluten-Free', 'Vegetarian', 'Vegan'],
      packageUnit: 'pack',
    },
    {
      slug: 'mushroom-mixed-wild',
      name: 'Mixed Wild Mushrooms',
      category: 'Mushrooms & Fungi',
      tags: ['Gluten-Free', 'Vegetarian', 'Vegan'],
      aliases: ['Wild Mushrooms'],
      packageUnit: 'pack',
    },
    {
      slug: 'veg-bell-pepper-green',
      name: 'Bell Pepper (Green)',
      matchName: 'Green Bell Pepper',
      category: 'Vegetable',
      tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Nightshade'],
      aliases: ['Green Bell Pepper'],
      packageUnit: 'each',
    },
    {
      slug: 'veg-corn-kernels-frozen',
      name: 'Corn Kernels (Frozen)',
      matchName: 'Frozen Corn Kernels',
      category: 'Vegetable',
      tags: ['Gluten-Free', 'Vegan', 'Vegetarian'],
      aliases: ['Frozen Corn', 'Frozen Sweet Corn'],
      packageUnit: 'bag',
    },
    {
      slug: 'veg-corn-kernels-canned',
      name: 'Corn Kernels (Canned)',
      matchName: 'Canned Corn',
      category: 'Vegetable',
      tags: ['Gluten-Free', 'Vegan', 'Vegetarian'],
      aliases: ['Canned Corn Kernels'],
      packageUnit: 'can',
    },
    {
      slug: 'veg-corn-ear-fresh',
      name: 'Corn on the Cob (Fresh)',
      matchName: 'Corn on the Cob',
      category: 'Vegetable',
      tags: ['Gluten-Free', 'Vegan', 'Vegetarian'],
      aliases: ['Fresh Corn Ears', 'Corn Ears'],
      packageUnit: 'pack',
    },
    {
      slug: 'veg-spinach-frozen-chopped',
      name: 'Spinach (Frozen Chopped)',
      matchName: 'Frozen Chopped Spinach',
      category: 'Vegetable',
      tags: ['Gluten-Free', 'Vegan', 'Vegetarian'],
      aliases: ['Frozen Spinach'],
      packageUnit: 'bag',
    },
    {
      slug: 'veg-artichoke-hearts-marinated',
      name: 'Artichoke Hearts (Marinated)',
      matchName: 'Marinated Artichoke Hearts',
      category: 'Vegetable',
      tags: ['Gluten-Free', 'Vegan', 'Vegetarian'],
      packageUnit: 'jar',
    },
    {
      slug: 'veg-roasted-red-peppers-jarred',
      name: 'Roasted Red Peppers (Jarred)',
      matchName: 'Roasted Red Peppers',
      category: 'Vegetable',
      tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Nightshade'],
      aliases: ['Jarred Roasted Red Peppers'],
      packageUnit: 'jar',
    },
    {
      slug: 'fruit-mixed-berries-frozen',
      name: 'Mixed Berries (Frozen)',
      matchName: 'Frozen Mixed Berries',
      category: 'Fruit',
      tags: ['Gluten-Free', 'Vegan', 'Vegetarian'],
      packageUnit: 'bag',
    },
    {
      slug: 'baking-chocolate-chips-dark',
      name: 'Dark Chocolate Chips',
      category: 'Baking',
      tags: ['Vegetarian'],
      packageUnit: 'bag',
    },
    {
      slug: 'baking-chocolate-chips-dark-dairy-free',
      name: 'Dark Chocolate Chips (Dairy-Free)',
      matchName: 'Dairy-Free Dark Chocolate Chips',
      category: 'Baking',
      tags: ['Dairy-Free', 'Vegetarian', 'Vegan'],
      aliases: ['Vegan Dark Chocolate Chips'],
      packageUnit: 'bag',
    },
    {
      slug: 'baking-chocolate-chips-milk',
      name: 'Milk Chocolate Chips',
      category: 'Baking',
      tags: ['Contains Dairy', 'Vegetarian'],
      packageUnit: 'bag',
    },
    {
      slug: 'baking-chocolate-chips-white',
      name: 'White Chocolate Chips',
      category: 'Baking',
      tags: ['Contains Dairy', 'Vegetarian'],
      packageUnit: 'bag',
    },
    {
      slug: 'baking-chocolate-chips-mini',
      name: 'Mini Chocolate Chips',
      category: 'Baking',
      tags: ['Contains Dairy', 'Vegetarian'],
      packageUnit: 'bag',
    },
    {
      slug: 'meat-turkey-bacon',
      name: 'Turkey Bacon',
      category: 'Meat',
      tags: ['Halal-Friendly', 'Kosher-Friendly', 'Paleo'],
      packageUnit: 'pack',
    },
    {
      slug: 'meat-ham-spiral-cut',
      name: 'Spiral-Cut Ham',
      category: 'Meat',
      tags: [],
      aliases: ['Spiral Ham'],
      packageUnit: 'each',
    },
    {
      slug: 'meat-ham-smoked-sliced',
      name: 'Smoked Ham Slices',
      category: 'Meat',
      tags: [],
      aliases: ['Sliced Smoked Ham'],
      packageUnit: 'pack',
    },
    {
      slug: 'legume-kidney-beans-light-red',
      name: 'Kidney Beans (Light Red)',
      matchName: 'Light Red Kidney Beans',
      category: 'Legume',
      tags: ['Gluten-Free', 'Vegetarian', 'Vegan'],
      packageUnit: 'can',
    },
    {
      slug: 'legume-baked-beans',
      name: 'Baked Beans',
      category: 'Legume',
      tags: ['Gluten-Free*', 'Vegetarian*'],
      packageUnit: 'can',
    },
    {
      slug: 'grain-rice-jasmine',
      name: 'Rice (Jasmine)',
      matchName: 'Jasmine Rice',
      category: 'Grain',
      tags: ['Gluten-Free', 'Vegetarian', 'Vegan'],
      aliases: ['Jasmine Rice'],
      packageUnit: 'bag',
    },
    {
      slug: 'grain-rice-arborio',
      name: 'Rice (Arborio)',
      matchName: 'Arborio Rice',
      category: 'Grain',
      tags: ['Gluten-Free', 'Vegetarian', 'Vegan'],
      aliases: ['Arborio Rice', 'Risotto Rice'],
      packageUnit: 'bag',
    },
    {
      slug: 'bev-bone-broth-beef',
      name: 'Beef Bone Broth',
      category: 'Beverage',
      tags: ['Gluten-Free*', 'Stock', 'Paleo'],
      packageUnit: 'carton',
    },
    {
      slug: 'bev-shellfish-stock',
      name: 'Shellfish Stock',
      category: 'Beverage',
      tags: ['Gluten-Free*', 'Pescatarian', 'Stock', 'Shellfish'],
      packageUnit: 'carton',
    },
  ]);

  const mergeAliases = (...values) =>
    Array.from(
      new Set(
        values
          .flatMap((value) => (Array.isArray(value) ? value : []))
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      ),
    );

  const applyIngredientSpecificity = (ingredientList) => {
    const input = Array.isArray(ingredientList) ? ingredientList : [];
    const result = [];
    const seen = new Set();

    input.forEach((ingredient) => {
      if (!ingredient || typeof ingredient !== 'object' || !ingredient.slug) return;
      const override = INGREDIENT_SPECIFICITY_OVERRIDES[ingredient.slug] || null;
      const next = override
        ? {
            ...ingredient,
            ...override,
            aliases: mergeAliases(ingredient.aliases, override.aliases),
          }
        : { ...ingredient, aliases: mergeAliases(ingredient.aliases) };
      if (!next.aliases.length) delete next.aliases;
      result.push(next);
      seen.add(next.slug);
    });

    INGREDIENT_SPECIFICITY_ADDITIONS.forEach((ingredient) => {
      if (!ingredient?.slug || seen.has(ingredient.slug)) return;
      const next = { ...ingredient, aliases: mergeAliases(ingredient.aliases) };
      if (!next.aliases.length) delete next.aliases;
      result.push(next);
      seen.add(next.slug);
    });

    return result;
  };

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
    const matcherLabel = ingredient?.matchName || ingredient?.name;
    const nameTokens = buildTokenSet(matcherLabel);
    const slugText = ingredient?.matchSlug === false
      ? ''
      : String(ingredient.slug || '')
          .split('-')
          .slice(1)
          .join(' ');
    const slugTokens = buildTokenSet(slugText);
    const tokens = new Set([...nameTokens, ...slugTokens]);
    if (!tokens.size) {
      const fallback = sanitizeComparisonText(matcherLabel);
      if (fallback) {
        fallback.split(/\s+/).forEach((token) => {
          if (token) tokens.add(token);
        });
      }
    }
    const variants = new Set();
    const normalizedName = sanitizeMatcherText(matcherLabel);
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
      if (!ingredient || !ingredient.slug || ingredient.matchDisabled === true) return;
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
    token: typeof rawEntry?.token === 'string' ? rawEntry.token.trim() : '',
    text: sanitizeComparisonText(rawEntry ? rawEntry.item : ''),
    tokens: buildTokenSet(rawEntry ? rawEntry.item : ''),
  });

  const findMatchesForEntries = (entries, index) => {
    const matchedSlugs = new Set();
    if (!entries.length) return matchedSlugs;

    entries.forEach((entry) => {
      if (!entry) return;
      if (entry.token) {
        if (index.matchers.has(entry.token)) matchedSlugs.add(entry.token);
        return;
      }
      if (!(entry.tokens instanceof Set)) return;
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

  if (Array.isArray(global.BLISSFUL_INGREDIENTS)) {
    const refined = applyIngredientSpecificity(global.BLISSFUL_INGREDIENTS);
    global.BLISSFUL_INGREDIENTS.splice(0, global.BLISSFUL_INGREDIENTS.length, ...refined);
  }

  const api = {
    INGREDIENT_SPECIFICITY_OVERRIDES,
    INGREDIENT_SPECIFICITY_ADDITIONS,
    applyIngredientSpecificity,
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
