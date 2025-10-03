
;(function () {
  const recipes = Array.isArray(window.BLISSFUL_RECIPES) ? window.BLISSFUL_RECIPES : [];
  const ingredients = Array.isArray(window.BLISSFUL_INGREDIENTS) ? window.BLISSFUL_INGREDIENTS : [];

  if (!recipes.length || !ingredients.length) {
    console.error('Blissful Reverie data could not be loaded.');
    return;
  }

  const matching = window.BlissfulMatching || {};
  const {
    createIngredientMatcherIndex,
    mapRecipesToIngredientMatches,
    buildTokenSet: matchingBuildTokenSet,
  } = matching;

  const getIngredientTokens =
    typeof matchingBuildTokenSet === 'function'
      ? (value) => matchingBuildTokenSet(value)
      : (value) => {
          const normalized = String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
          if (!normalized) {
            return new Set();
          }
          return new Set(normalized.split(/\s+/));
        };

  const formatProteinLabel = (value) =>
    String(value || '')
      .replace(/[-_/]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const PROTEIN_CATEGORY_SET = new Set(['Meat', 'Seafood']);
  const PROTEIN_SECTION_PRIORITY = new Map([
    ['Meat', 0],
    ['Fish', 1],
    ['Shellfish', 2],
  ]);
  const PROTEIN_SECTION_ORDER = ['Meat', 'Fish', 'Shellfish'];
  const getProteinSectionLabel = (category) =>
    ({ Meat: 'Meat', Fish: 'Fish', Shellfish: 'Shellfish' }[category] || 'Protein');

  const classifyProteinCategory = (ingredient) => {
    if (!ingredient || typeof ingredient !== 'object') {
      return 'Meat';
    }
    if (ingredient.category === 'Seafood') {
      const tags = Array.isArray(ingredient.tags) ? ingredient.tags : [];
      return tags.some((tag) => String(tag || '').toLowerCase() === 'shellfish')
        ? 'Shellfish'
        : 'Fish';
    }
    return 'Meat';
  };
  const PROTEIN_BASE_OVERRIDES = new Map([
    ['meat-bacon', 'pork'],
    ['bacon', 'pork'],
  ]);
  const PROTEIN_BASE_KEYWORD_CONFIG = new Map([
    [
      'chicken',
      {
        label: 'Chicken',
        keywords: [
          'chicken',
          'breast',
          'thigh',
          'wing',
          'leg',
          'drumstick',
          'tender',
          'tenderloin',
          'cutlet',
          'rotisserie',
        ],
      },
    ],
    [
      'beef',
      {
        label: 'Beef',
        keywords: ['beef', 'steak', 'ground', 'ribeye', 'roast', 'short rib', 'sirloin'],
      },
    ],
    [
      'pork',
      {
        label: 'Pork',
        keywords: ['pork', 'bacon', 'shoulder', 'loin', 'chop', 'rib', 'tenderloin'],
      },
    ],
    [
      'turkey',
      {
        label: 'Turkey',
        keywords: ['turkey', 'ground', 'breast', 'thigh', 'drumstick', 'wing', 'tenderloin'],
      },
    ],
    [
      'lamb',
      {
        label: 'Lamb',
        keywords: ['lamb', 'leg', 'chop', 'shoulder', 'shank'],
      },
    ],
    [
      'venison',
      {
        label: 'Venison',
        keywords: ['venison', 'deer', 'backstrap', 'loin', 'steak'],
      },
    ],
    [
      'bison',
      {
        label: 'Bison',
        keywords: ['bison', 'buffalo', 'ground', 'steak'],
      },
    ],
    [
      'veal',
      {
        label: 'Veal',
        keywords: ['veal', 'cutlet', 'chop'],
      },
    ],
    [
      'goat',
      {
        label: 'Goat',
        keywords: ['goat', 'chevon', 'shoulder', 'curry'],
      },
    ],
    [
      'duck',
      {
        label: 'Duck',
        keywords: ['duck', 'breast', 'leg', 'confit'],
      },
    ],
    [
      'goose',
      {
        label: 'Goose',
        keywords: ['goose', 'breast', 'leg'],
      },
    ],
    [
      'chorizo',
      {
        label: 'Chorizo',
        keywords: ['chorizo', 'mexican chorizo', 'spanish chorizo'],
      },
    ],
    [
      'andouille',
      {
        label: 'Andouille',
        keywords: ['andouille'],
      },
    ],
    [
      'prosciutto',
      {
        label: 'Prosciutto',
        keywords: ['prosciutto'],
      },
    ],
    [
      'salami',
      {
        label: 'Salami',
        keywords: ['salami'],
      },
    ],
    ['salmon', { label: 'Salmon', keywords: ['salmon'] }],
    ['tuna', { label: 'Tuna', keywords: ['tuna'] }],
    ['shrimp', { label: 'Shrimp', keywords: ['shrimp', 'prawn'] }],
    ['cod', { label: 'Cod', keywords: ['cod'] }],
    ['scallops', { label: 'Scallops', keywords: ['scallop'] }],
    ['mussels', { label: 'Mussels', keywords: ['mussel'] }],
  ]);

  const createProteinBaseDefinitions = (ingredientList) => {
    const baseLookup = new Map();
    (Array.isArray(ingredientList) ? ingredientList : []).forEach((ingredient) => {
      if (!ingredient || !PROTEIN_CATEGORY_SET.has(ingredient.category)) {
        return;
      }
      const slug = String(ingredient.slug || '');
      if (!slug) return;
      const slugParts = slug.split('-').slice(1);
      if (!slugParts.length) return;
      const primaryToken = slugParts[0];
      const baseKey = String(
        PROTEIN_BASE_OVERRIDES.get(slug)
          || PROTEIN_BASE_OVERRIDES.get(primaryToken)
          || primaryToken,
      ).toLowerCase();
      if (!baseKey) return;
      let entry = baseLookup.get(baseKey);
      if (!entry) {
        const config = PROTEIN_BASE_KEYWORD_CONFIG.get(baseKey) || {};
        entry = {
          key: baseKey,
          label: config.label || formatProteinLabel(baseKey),
          category: ingredient.category === 'Seafood' ? 'Seafood' : 'Meat',
          keywords: new Set(
            Array.isArray(config.keywords)
              ? config.keywords
                  .map((keyword) => String(keyword || '').toLowerCase())
                  .filter(Boolean)
              : [],
          ),
          names: new Set(),
        };
        baseLookup.set(baseKey, entry);
      }
      const proteinCategory = classifyProteinCategory(ingredient);
      const existingPriority = PROTEIN_SECTION_PRIORITY.get(entry.category || 'Meat') || 0;
      const nextPriority = PROTEIN_SECTION_PRIORITY.get(proteinCategory) || 0;
      if (!entry.category || nextPriority >= existingPriority) {
        entry.category = proteinCategory;
      }
      entry.names.add(String(ingredient.name || '').toLowerCase());
      entry.names.add(slugParts.join(' '));
      entry.keywords.add(baseKey);
      slugParts.slice(1).forEach((part) => entry.keywords.add(String(part || '').toLowerCase()));
      const nameTokens = getIngredientTokens(ingredient.name);
      if (nameTokens && typeof nameTokens.forEach === 'function') {
        nameTokens.forEach((token) => entry.keywords.add(String(token || '').toLowerCase()));
      }
    });

    return Array.from(baseLookup.values()).map((entry) => {
      const slug = `protein-${entry.key}`;
      const phraseSet = new Set();
      const labelLower = entry.label.toLowerCase();
      phraseSet.add(labelLower);
      entry.names.forEach((name) => {
        const normalized = String(name || '')
          .toLowerCase()
          .replace(/[-_/]+/g, ' ')
          .trim();
        if (normalized) {
          phraseSet.add(normalized);
        }
      });
      entry.keywords.forEach((keyword) => {
        const normalized = String(keyword || '')
          .toLowerCase()
          .replace(/[-_/]+/g, ' ')
          .trim();
        if (!normalized) return;
        phraseSet.add(normalized);
        if (normalized !== labelLower) {
          phraseSet.add(`${labelLower} ${normalized}`);
        }
      });
    const searchPhrases = Array.from(phraseSet);
    const matcherName = entry.label;
    const matcherAliases = Array.from(
      new Set(
        searchPhrases
          .map((phrase) => formatProteinLabel(phrase))
          .filter((phrase) => phrase.toLowerCase() !== labelLower),
      ),
    );
    return {
      key: entry.key,
      slug,
      label: entry.label,
      category: entry.category,
      matcherIngredient: {
        slug,
        name: matcherName,
        category: entry.category,
        aliases: matcherAliases,
      },
    };
  });
};

  const toTitleCase = (value) =>
    String(value || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const slugify = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim();

  const getIngredientDisplayName = (ingredient) =>
    toTitleCase(
      String(ingredient && ingredient.name ? ingredient.name : '')
        .replace(/\s*\([^)]*\)\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );

  const formatTagFromIngredient = (tag) => {
    const normalized = String(tag || '')
      .replace(/[*]+/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return null;
    return toTitleCase(normalized);
  };

  const deriveAllergensFromIngredients = (ingredientList) => {
    const allergens = new Set();
    (Array.isArray(ingredientList) ? ingredientList : []).forEach((ingredient) => {
      const tags = Array.isArray(ingredient && ingredient.tags) ? ingredient.tags : [];
      tags.forEach((tag) => {
        const value = String(tag || '').toLowerCase();
        if (value.includes('contains dairy')) allergens.add('dairy');
        if (value.includes('contains gluten')) allergens.add('gluten');
        if (value.includes('contains nuts')) allergens.add('nuts');
        if (value.includes('contains soy')) allergens.add('soy');
        if (value.includes('contains eggs')) allergens.add('eggs');
        if (value.includes('shellfish')) allergens.add('shellfish');
      });
    });
    return Array.from(allergens);
  };

  const deriveDietTagsForIngredient = (ingredient) => {
    const tags = new Set();
    const ingredientTags = Array.isArray(ingredient && ingredient.tags) ? ingredient.tags : [];
    ingredientTags
      .map((tag) => formatTagFromIngredient(tag))
      .filter(Boolean)
      .forEach((tag) => tags.add(tag));

    const category = ingredient ? ingredient.category : '';
    const vegetarianFriendlyCategories = new Set([
      'Vegetable',
      'Fruit',
      'Herb',
      'Spice',
      'Grain',
      'Pasta',
      'Legume',
      'Plant Protein',
      'Nut/Seed',
      'Baking',
      'Sweetener',
      'Beverage',
      'Condiment/Sauce',
      'Oil/Fat',
      'Baked Goods & Doughs',
    ]);

    if (vegetarianFriendlyCategories.has(category)) {
      tags.add('Vegetarian');
      if (category !== 'Dairy' && category !== 'Baked Goods & Doughs') {
        tags.add('Vegan');
      }
    }
    if (category === 'Dairy') {
      tags.add('Vegetarian');
    }
    if (category === 'Legume' || category === 'Plant Protein' || category === 'Nut/Seed') {
      tags.add('High Protein');
    }
    if (category === 'Grain' || category === 'Pasta') {
      tags.add('Whole Grains');
    }
    if (category === 'Meat' || category === 'Seafood') {
      tags.add('High Protein');
      tags.add('Low Carb');
      tags.add('Low Sodium');
    }
    if (category !== 'Dairy') {
      tags.add('No Dairy');
      tags.add('Dairy Free');
    }
    if (category === 'Vegetable' || category === 'Fruit' || category === 'Herb' || category === 'Spice') {
      tags.add('Low Sodium');
    }

    if (!ingredientTags.some((tag) => /contains gluten/i.test(String(tag || '')))) {
      tags.add('Gluten Free');
    }

    return Array.from(tags);
  };

  const deriveSpotlightNutrition = (ingredient) => {
    const category = ingredient ? ingredient.category : '';
    switch (category) {
      case 'Meat':
      case 'Seafood':
        return { calories: 320, protein: 32, carbs: 6, fat: 16, fiber: 1, sugar: 2, sodium: 360 };
      case 'Legume':
      case 'Plant Protein':
      case 'Nut/Seed':
        return { calories: 280, protein: 18, carbs: 24, fat: 12, fiber: 8, sugar: 4, sodium: 220 };
      case 'Grain':
      case 'Pasta':
      case 'Baked Goods & Doughs':
        return { calories: 300, protein: 10, carbs: 52, fat: 6, fiber: 6, sugar: 6, sodium: 260 };
      case 'Dairy':
        return { calories: 260, protein: 14, carbs: 10, fat: 18, fiber: 0, sugar: 8, sodium: 240 };
      default:
        return { calories: 220, protein: 6, carbs: 26, fat: 8, fiber: 5, sugar: 6, sodium: 180 };
    }
  };

  const defaultEquipmentForIngredient = (ingredient) => {
    const category = ingredient ? ingredient.category : '';
    if (category === 'Beverage') {
      return ['Pitcher', 'Mixing Spoon', 'Citrus Juicer'];
    }
    if (category === 'Baking' || category === 'Baked Goods & Doughs') {
      return ['Mixing Bowls', 'Baking Sheet', 'Parchment Paper'];
    }
    if (category === 'Meat' || category === 'Seafood') {
      return ['Skillet', 'Tongs', 'Instant-Read Thermometer'];
    }
    return ['Skillet', "Chef's Knife", 'Cutting Board'];
  };

  const ensureUniqueRecipeId = (baseId, lookup) => {
    let candidate = baseId;
    let counter = 2;
    while (lookup.has(candidate)) {
      candidate = `${baseId}-${counter++}`;
    }
    return candidate;
  };

  const ensureUniqueRecipeName = (baseName, lookup) => {
    let candidate = baseName;
    let counter = 2;
    while (lookup.has(candidate.toLowerCase())) {
      candidate = `${baseName} ${counter++}`;
    }
    return candidate;
  };

  const createIngredientSpotlightRecipe = (ingredient) => {
    if (!ingredient || !ingredient.slug) return null;
    const baseId = `ingredient-spotlight-${ingredient.slug}`;
    const displayName = getIngredientDisplayName(ingredient);
    const baseName = `${displayName} Spotlight Skillet`;
    const heroLower = displayName.toLowerCase();
    const tags = new Set(['Quick', 'Weeknight', 'Ingredient Spotlight']);
    deriveDietTagsForIngredient(ingredient).forEach((tag) => tags.add(tag));

    const ingredientsList = [
      { item: displayName },
      { item: 'olive oil (or preferred cooking fat)' },
      { item: 'fresh herbs or spices of choice' },
      { item: 'kosher salt and black pepper' },
    ];

    const instructions = [
      `Prep the ${heroLower} by rinsing and trimming as needed for quick cooking.`,
      `Heat a skillet over medium heat with a drizzle of olive oil and add the ${heroLower}.`,
      `Season generously with salt, pepper, and your favorite herbs or spices, tossing until aromatic.`,
      `Serve the warm ${heroLower} as a simple main feature or fold into salads, grains, and bowls.`,
    ];

    const equipment = defaultEquipmentForIngredient(ingredient);
    const nutritionPerServing = deriveSpotlightNutrition(ingredient);
    const allergens = deriveAllergensFromIngredients([ingredient]);

    return {
      id: baseId,
      name: baseName,
      category: 'Ingredient Spotlight',
      description: `A quick, versatile preparation that highlights ${heroLower} with everyday pantry flavors.`,
      baseServings: 2,
      ingredients: ingredientsList,
      instructions,
      equipment,
      tags: Array.from(tags),
      nutritionPerServing,
      allergens,
    };
  };

  const ensureIngredientCoverage = (
    recipesList,
    ingredientList,
    ingredientUsage,
    recipeLookupById,
    recipeLookupByName,
  ) => {
    const generated = [];
    (Array.isArray(ingredientList) ? ingredientList : []).forEach((ingredient) => {
      if (ingredientUsage.get(ingredient.slug)) {
        return;
      }
      const recipe = createIngredientSpotlightRecipe(ingredient);
      if (!recipe) return;
      recipe.id = ensureUniqueRecipeId(recipe.id, recipeLookupById);
      recipe.name = ensureUniqueRecipeName(recipe.name, recipeLookupByName);
      recipeLookupById.set(recipe.id, recipe);
      recipeLookupByName.set(recipe.name.toLowerCase(), recipe);
      generated.push(recipe);
    });
    return generated;
  };

  const REQUIRED_DIET_TAGS = [
    'Vegetarian',
    'Vegan',
    'Gluten Free',
    'Dairy Free',
    'No Dairy',
    'Low Carb',
    'Low Sodium',
    'Whole Grains',
    'High Protein',
  ];

  const MIN_DIET_RECIPES = 5;

  const DIET_TEMPLATE_INGREDIENTS = new Map([
    ['Vegetarian', ['veg-spinach', 'veg-tomato-roma', 'dairy-cheese-feta', 'grain-quinoa']],
    ['Vegan', ['veg-kale', 'legume-chickpea', 'grain-quinoa', 'veg-bell-pepper-red']],
    ['Gluten Free', ['veg-zucchini', 'veg-broccoli', 'meat-chicken-breast', 'grain-rice-brown']],
    ['Dairy Free', ['seafood-salmon', 'veg-asparagus', 'fruit-lemon']],
    ['No Dairy', ['veg-sweet-potato', 'legume-black-beans', 'herb-cilantro']],
    ['Low Carb', ['meat-chicken-thigh', 'veg-cauliflower', 'veg-broccoli']],
    ['Low Sodium', ['veg-green-beans', 'veg-carrot', 'veg-bok-choy']],
    ['Whole Grains', ['grain-quinoa', 'grain-rice-brown', 'veg-mushroom-button']],
    ['High Protein', ['meat-chicken-breast', 'legume-lentil-brown', 'veg-spinach']],
  ]);

  const countDietTagUsage = (recipesList) => {
    const counts = new Map();
    (Array.isArray(recipesList) ? recipesList : []).forEach((recipe) => {
      const tags = Array.isArray(recipe && recipe.tags) ? recipe.tags : [];
      tags.forEach((tag) => {
        if (!REQUIRED_DIET_TAGS.includes(tag)) return;
        counts.set(tag, (counts.get(tag) || 0) + 1);
      });
    });
    REQUIRED_DIET_TAGS.forEach((tag) => {
      if (!counts.has(tag)) counts.set(tag, 0);
    });
    return counts;
  };

  const createDietTemplateRecipe = (
    dietTag,
    sequenceNumber,
    ingredientOptions,
    recipeLookupById,
    recipeLookupByName,
  ) => {
    if (!ingredientOptions.length) return null;
    const primaryIndex = sequenceNumber % ingredientOptions.length;
    const primaryIngredient = ingredientOptions[primaryIndex];
    const supporting = ingredientOptions.filter((_, index) => index !== primaryIndex).slice(0, 2);
    const baseId = `diet-${slugify(dietTag)}-${sequenceNumber}`;
    const baseName = `${dietTag} Pantry Power Bowl ${sequenceNumber}`;

    const description = `A flexible ${dietTag.toLowerCase()} bowl featuring ${getIngredientDisplayName(
      primaryIngredient,
    ).toLowerCase()} with vibrant seasonal produce.`;

    const ingredientsList = [
      { item: getIngredientDisplayName(primaryIngredient) },
      ...supporting.map((ingredient) => ({ item: getIngredientDisplayName(ingredient) })),
      { item: 'olive oil' },
      { item: 'lemon juice' },
      { item: 'fresh herbs of choice' },
    ];

    const instructions = [
      'Chop all produce into bite-sized pieces for even cooking.',
      `Toss the ingredients with olive oil, salt, pepper, and lemon juice, keeping the ${dietTag.toLowerCase()} focus in mind.`,
      'Roast or sauté until the vegetables are tender and lightly caramelized.',
      'Finish with fresh herbs and serve warm over greens or grains as desired.',
    ];

    const baseTags = new Set(['Dinner', 'Meal Prep', 'Quick', dietTag]);
    supporting
      .concat(primaryIngredient)
      .forEach((ingredient) => deriveDietTagsForIngredient(ingredient).forEach((tag) => baseTags.add(tag)));

    const allergens = deriveAllergensFromIngredients([primaryIngredient].concat(supporting));

    const nutritionPerServing = (() => {
      switch (dietTag) {
        case 'High Protein':
          return { calories: 420, protein: 32, carbs: 24, fat: 18, fiber: 7, sugar: 6, sodium: 540 };
        case 'Low Carb':
          return { calories: 360, protein: 28, carbs: 16, fat: 20, fiber: 6, sugar: 5, sodium: 420 };
        case 'Whole Grains':
          return { calories: 440, protein: 16, carbs: 58, fat: 12, fiber: 9, sugar: 7, sodium: 480 };
        default:
          return { calories: 400, protein: 18, carbs: 42, fat: 16, fiber: 8, sugar: 8, sodium: 460 };
      }
    })();

    const recipe = {
      id: ensureUniqueRecipeId(baseId, recipeLookupById),
      name: ensureUniqueRecipeName(baseName, recipeLookupByName),
      category: 'Diet Collection',
      description,
      baseServings: 4,
      ingredients: ingredientsList,
      instructions,
      equipment: ['Sheet Pan', 'Mixing Bowls', "Chef's Knife"],
      tags: Array.from(baseTags),
      nutritionPerServing,
      allergens,
    };

    recipeLookupById.set(recipe.id, recipe);
    recipeLookupByName.set(recipe.name.toLowerCase(), recipe);
    return recipe;
  };

  const ensureDietTemplateRecipes = (recipesList, recipeLookupById, recipeLookupByName, ingredientBySlug) => {
    const counts = countDietTagUsage(recipesList);
    const generated = [];
    REQUIRED_DIET_TAGS.forEach((dietTag) => {
      const current = counts.get(dietTag) || 0;
      const required = Math.max(0, MIN_DIET_RECIPES - current);
      if (!required) return;
      const ingredientSlugs = DIET_TEMPLATE_INGREDIENTS.get(dietTag) || [];
      const ingredientOptions = ingredientSlugs
        .map((slug) => ingredientBySlug.get(slug))
        .filter(Boolean);
      if (!ingredientOptions.length) return;
      for (let index = 0; index < required; index += 1) {
        const recipe = createDietTemplateRecipe(
          dietTag,
          current + index + 1,
          ingredientOptions,
          recipeLookupById,
          recipeLookupByName,
        );
        if (recipe) {
          generated.push(recipe);
        }
      }
    });
    return generated;
  };

  const MIN_PROTEIN_RECIPES = 3;

  const MIN_MENU_RECIPES = 3;
  const MIN_REGIONAL_RECIPES = 4;

  const MENU_TEMPLATE_DEFINITIONS = [
    {
      key: 'garden-brunch',
      name: 'Garden Brunch Menu',
      focus: 'Brunch',
      mealTag: 'Brunch',
      heroIngredient: 'baking-egg',
      description:
        'A breezy weekend spread celebrating market vegetables, bright herbs, and a sparkling refresher.',
      courses: [
        {
          label: 'Main',
          ingredientSlugs: ['baking-egg', 'veg-spinach', 'veg-bell-pepper-red', 'herb-basil'],
        },
        {
          label: 'Side Salad',
          ingredientSlugs: ['grain-quinoa', 'veg-asparagus', 'fruit-lemon', 'oil-olive-extra-virgin'],
        },
        {
          label: 'Sweet Finish',
          ingredientSlugs: ['fruit-strawberry', 'dairy-yogurt-greek', 'sweetener-honey'],
        },
        {
          label: 'Refreshment',
          ingredientSlugs: ['bev-sparkling-water', 'fruit-lemon', 'herb-mint'],
        },
      ],
      tags: ['Entertaining', 'Vegetarian Friendly'],
      baseServings: 6,
      nutritionPerServing: {
        calories: 640,
        protein: 32,
        carbs: 68,
        fat: 24,
        fiber: 11,
        sugar: 18,
        sodium: 720,
      },
    },
    {
      key: 'cozy-harvest-supper',
      name: 'Cozy Harvest Supper Menu',
      focus: 'Dinner',
      mealTag: 'Dinner',
      heroIngredient: 'meat-beef-steak-ribeye',
      description:
        'An autumnal supper anchored by seared beef, roasted roots, and maple-brushed greens.',
      courses: [
        {
          label: 'Main',
          ingredientSlugs: ['meat-beef-steak-ribeye', 'herb-rosemary', 'oil-olive-extra-virgin'],
        },
        {
          label: 'Roasted Vegetables',
          ingredientSlugs: ['veg-sweet-potato', 'veg-brussels-sprouts', 'sweetener-maple-syrup'],
        },
        {
          label: 'Comforting Grain',
          ingredientSlugs: ['grain-rice-brown', 'dairy-butter-unsalted', 'herb-thyme'],
        },
        {
          label: 'Table Garnish',
          ingredientSlugs: ['herb-parsley', 'fruit-orange'],
        },
      ],
      tags: ['Entertaining', 'Comfort Food'],
      baseServings: 6,
      nutritionPerServing: {
        calories: 780,
        protein: 38,
        carbs: 64,
        fat: 36,
        fiber: 9,
        sugar: 17,
        sodium: 810,
      },
    },
    {
      key: 'global-street-feast',
      name: 'Global Street Feast Menu',
      focus: 'Dinner',
      mealTag: 'Dinner',
      heroIngredient: 'meat-chicken-thigh',
      description:
        'A shareable menu inspired by bustling street markets with grilled chicken, smoky legumes, and bold sauces.',
      courses: [
        {
          label: 'Charred Skewers',
          ingredientSlugs: ['meat-chicken-thigh', 'herb-cilantro', 'fruit-lime', 'oil-olive-extra-virgin'],
        },
        {
          label: 'Warm Sides',
          ingredientSlugs: ['legume-chickpea', 'grain-rice-basmati', 'veg-bell-pepper-red'],
        },
        {
          label: 'Sauce Bar',
          ingredientSlugs: ['condiment-peanut-satay', 'fruit-lime', 'herb-parsley'],
        },
        {
          label: 'Crunchy Finish',
          ingredientSlugs: ['seed-sesame', 'veg-cucumber'],
        },
      ],
      tags: ['Entertaining', 'High Protein', 'Global'],
      baseServings: 6,
      nutritionPerServing: {
        calories: 710,
        protein: 40,
        carbs: 62,
        fat: 28,
        fiber: 12,
        sugar: 16,
        sodium: 760,
      },
    },
    {
      key: 'summer-picnic-spread',
      name: 'Summer Picnic Spread',
      focus: 'Lunch',
      mealTag: 'Lunch',
      heroIngredient: 'meat-chicken-breast',
      description:
        'A chill picnic basket lineup with citrusy grilled chicken, crisp produce, and cooling sips.',
      courses: [
        {
          label: 'Grill Basket',
          ingredientSlugs: ['meat-chicken-breast', 'veg-corn', 'fruit-lime'],
        },
        {
          label: 'Chilled Salad',
          ingredientSlugs: ['veg-cucumber', 'fruit-watermelon', 'herb-mint'],
        },
        {
          label: 'Snack Board',
          ingredientSlugs: ['nut-almond', 'veg-carrot', 'dairy-cheese-feta'],
        },
        {
          label: 'Coolers',
          ingredientSlugs: ['bev-sparkling-water', 'sweetener-honey', 'fruit-lemon'],
        },
      ],
      tags: ['Entertaining', 'Outdoor', 'Meal Prep'],
      baseServings: 6,
      nutritionPerServing: {
        calories: 600,
        protein: 34,
        carbs: 58,
        fat: 22,
        fiber: 9,
        sugar: 19,
        sodium: 650,
      },
    },
  ];

  const REGIONAL_TEMPLATE_DEFINITIONS = [
    {
      key: 'mediterranean-market',
      name: 'Mediterranean Market Platter',
      region: 'Mediterranean',
      heroIngredient: 'veg-eggplant',
      supportingIngredients: [
        'veg-zucchini',
        'herb-oregano',
        'dairy-cheese-feta',
        'fruit-lemon',
        'oil-olive-extra-virgin',
      ],
      accompaniments: ['grain-farro', 'herb-basil'],
      tags: ['Regional', 'Mediterranean', 'Vegetarian'],
      description:
        'Charred eggplant and zucchini layered with briny feta, warm farro, and citrus olive oil.',
      nutritionPerServing: {
        calories: 520,
        protein: 18,
        carbs: 54,
        fat: 26,
        fiber: 11,
        sugar: 12,
        sodium: 740,
      },
    },
    {
      key: 'andes-campfire',
      name: 'Andean Campfire Bowl',
      region: 'Latin American',
      heroIngredient: 'legume-black-beans',
      supportingIngredients: [
        'veg-sweet-potato',
        'grain-quinoa',
        'veg-bell-pepper-red',
        'fruit-lime',
        'herb-cilantro',
      ],
      accompaniments: ['fruit-avocado', 'veg-corn'],
      tags: ['Regional', 'Latin American', 'Vegan'],
      description: 'Smoky beans and roasted tubers with quinoa, lime, and crisp vegetables.',
      nutritionPerServing: {
        calories: 480,
        protein: 20,
        carbs: 62,
        fat: 14,
        fiber: 13,
        sugar: 11,
        sodium: 600,
      },
    },
    {
      key: 'spice-route-lentils',
      name: 'Spice Route Lentil Supper',
      region: 'South Asian',
      heroIngredient: 'legume-lentil-red',
      supportingIngredients: [
        'veg-cauliflower',
        'veg-carrot',
        'spice-garam-masala',
        'herb-curry-leaves',
        'oil-coconut',
      ],
      accompaniments: ['grain-rice-basmati', 'herb-mint'],
      tags: ['Regional', 'South Asian', 'Vegetarian'],
      description: 'Silky red lentils simmered with garam masala, coconut oil, and fragrant curry leaves.',
      nutritionPerServing: {
        calories: 460,
        protein: 22,
        carbs: 58,
        fat: 12,
        fiber: 14,
        sugar: 10,
        sodium: 580,
      },
    },
    {
      key: 'pacific-harvest',
      name: 'Pacific Harvest Salmon Set',
      region: 'Pacific Rim',
      heroIngredient: 'seafood-salmon',
      supportingIngredients: [
        'veg-bok-choy',
        'veg-carrot',
        'veg-scallion',
        'spice-ginger-ground',
        'oil-sesame',
      ],
      accompaniments: ['grain-rice-brown', 'seed-sesame', 'fruit-lime'],
      tags: ['Regional', 'Pacific Rim', 'Seafood'],
      description: 'Seared salmon with sesame vegetables, gingered rice, and citrus finish.',
      nutritionPerServing: {
        calories: 540,
        protein: 34,
        carbs: 44,
        fat: 20,
        fiber: 6,
        sugar: 8,
        sodium: 640,
      },
    },
  ];

  const getProteinRecipeCounts = (matches) => {
    const counts = new Map();
    matches.forEach((matchedSlugs) => {
      if (!(matchedSlugs instanceof Set)) return;
      matchedSlugs.forEach((slug) => {
        if (typeof slug === 'string' && slug.startsWith('protein-')) {
          counts.set(slug, (counts.get(slug) || 0) + 1);
        }
      });
    });
    return counts;
  };

  const getRepresentativeIngredientsForProtein = (baseKey, ingredientBySlug) => {
    const normalizedKey = String(baseKey || '').toLowerCase();
    const matches = [];
    ingredientBySlug.forEach((ingredient) => {
      const haystack = `${ingredient.slug} ${ingredient.name}`.toLowerCase();
      if (haystack.includes(normalizedKey)) {
        matches.push(ingredient);
      }
    });
    return matches;
  };

  const createProteinTemplateRecipe = (
    definition,
    candidateIngredients,
    sequenceNumber,
    recipeLookupById,
    recipeLookupByName,
  ) => {
    if (!candidateIngredients.length) return null;
    const selected = candidateIngredients[sequenceNumber % candidateIngredients.length];
    if (!selected) return null;
    const displayName = getIngredientDisplayName(selected);
    const heroLower = displayName.toLowerCase();
    const baseId = `protein-${definition.key}-favourite-${sequenceNumber}`;
    const baseName = `${definition.label} Weeknight Favourite ${sequenceNumber}`;

    const tags = new Set(['Dinner', 'High Protein', 'Low Carb', definition.label]);
    deriveDietTagsForIngredient(selected).forEach((tag) => tags.add(tag));

    const ingredientsList = [
      { item: displayName },
      { item: 'olive oil' },
      { item: 'garlic cloves, minced' },
      { item: 'fresh herbs such as rosemary or thyme' },
      { item: 'lemon zest' },
      { item: 'kosher salt and cracked black pepper' },
    ];

    const instructions = [
      `Marinate the ${heroLower} with olive oil, garlic, herbs, lemon zest, salt, and pepper for 10 minutes.`,
      `Heat a skillet over medium-high heat and sear the ${heroLower} on both sides until deeply golden.`,
      `Finish cooking to your preferred doneness, letting the ${heroLower} rest briefly to retain juices.`,
      'Slice and serve with crisp vegetables or a simple salad for a satisfying plate.',
    ];

    const nutritionPerServing = { calories: 380, protein: 34, carbs: 10, fat: 22, fiber: 2, sugar: 3, sodium: 520 };
    const allergens = deriveAllergensFromIngredients([selected]);

    const recipe = {
      id: ensureUniqueRecipeId(baseId, recipeLookupById),
      name: ensureUniqueRecipeName(baseName, recipeLookupByName),
      category: 'Protein Favorites',
      description: `A dependable ${definition.label.toLowerCase()} preparation with bright herbs and citrus.`,
      baseServings: 4,
      ingredients: ingredientsList,
      instructions,
      equipment: ['Skillet', 'Tongs', 'Instant-Read Thermometer'],
      tags: Array.from(tags),
      nutritionPerServing,
      allergens,
    };

    recipeLookupById.set(recipe.id, recipe);
    recipeLookupByName.set(recipe.name.toLowerCase(), recipe);
    return recipe;
  };

  const ensureProteinTemplateRecipes = (
    recipesList,
    proteinDefinitions,
    recipeIngredientMatches,
    recipeLookupById,
    recipeLookupByName,
    ingredientBySlug,
  ) => {
    const counts = getProteinRecipeCounts(recipeIngredientMatches);
    const generated = [];
    proteinDefinitions.forEach((definition) => {
      const slug = definition.slug;
      const current = counts.get(slug) || 0;
      const required = Math.max(0, MIN_PROTEIN_RECIPES - current);
      if (!required) return;
      const candidates = getRepresentativeIngredientsForProtein(definition.key, ingredientBySlug);
      if (!candidates.length) return;
      for (let index = 0; index < required; index += 1) {
        const recipe = createProteinTemplateRecipe(
          definition,
          candidates,
          current + index + 1,
          recipeLookupById,
          recipeLookupByName,
        );
        if (recipe) {
          generated.push(recipe);
        }
      }
    });
    return generated;
  };

  const countRecipesMatchingKeyword = (recipesList, keyword) => {
    const normalizedKeyword = String(keyword || '').toLowerCase();
    if (!normalizedKeyword) return 0;
    return (Array.isArray(recipesList) ? recipesList : []).reduce((count, recipe) => {
      if (!recipe || typeof recipe !== 'object') {
        return count;
      }
      const category = String(recipe.category || '').toLowerCase();
      if (category.includes(normalizedKeyword)) {
        return count + 1;
      }
      const tags = Array.isArray(recipe.tags) ? recipe.tags : [];
      if (
        tags.some((tag) => String(tag || '').toLowerCase().includes(normalizedKeyword))
      ) {
        return count + 1;
      }
      return count;
    }, 0);
  };

  const resolveIngredientList = (slugs, ingredientBySlug) =>
    (Array.isArray(slugs) ? slugs : [])
      .map((slug) => ingredientBySlug.get(slug))
      .filter(Boolean);

  const createMenuTemplateRecipe = (
    definition,
    recipeLookupById,
    recipeLookupByName,
    ingredientBySlug,
  ) => {
    if (!definition) return null;
    const courses = Array.isArray(definition.courses) ? definition.courses : [];
    const resolvedCourses = courses.map((course) => ({
      label: course.label || 'Course',
      ingredients: resolveIngredientList(course.ingredientSlugs, ingredientBySlug),
    }));

    const allIngredients = resolvedCourses.flatMap((course) => course.ingredients);
    if (!allIngredients.length) {
      return null;
    }

    const heroIngredientSlug =
      definition.heroIngredient || (courses[0] && courses[0].ingredientSlugs
        ? courses[0].ingredientSlugs[0]
        : null);
    const heroIngredient = heroIngredientSlug
      ? ingredientBySlug.get(heroIngredientSlug)
      : allIngredients[0];
    const heroName = heroIngredient
      ? getIngredientDisplayName(heroIngredient)
      : definition.name;
    const heroLower = String(heroName || '').toLowerCase();

    const ingredientsList = resolvedCourses.map((course) => {
      const names = course.ingredients.map((ingredient) => getIngredientDisplayName(ingredient));
      const details = names.length ? `${course.label}: ${names.join(', ')}` : course.label;
      return { item: details };
    });

    const instructions = [
      `Organize mise en place for the ${heroLower} centerpiece and supporting courses.`,
    ];
    resolvedCourses.forEach((course) => {
      const names = course.ingredients.map((ingredient) => getIngredientDisplayName(ingredient));
      const labelLower = String(course.label || '').toLowerCase();
      if (names.length) {
        instructions.push(`Prepare the ${labelLower} featuring ${names.join(', ')}.`);
      } else {
        instructions.push(`Prepare the ${labelLower}.`);
      }
    });
    instructions.push('Plate everything family-style and garnish just before serving.');

    const tags = new Set(['Menu']);
    if (definition.focus) {
      tags.add(definition.focus);
    }
    if (definition.mealTag) {
      tags.add(definition.mealTag);
    }
    if (Array.isArray(definition.tags)) {
      definition.tags.forEach((tag) => {
        if (tag) tags.add(tag);
      });
    }
    allIngredients.forEach((ingredient) => {
      deriveDietTagsForIngredient(ingredient).forEach((tag) => tags.add(tag));
    });

    const allergens = deriveAllergensFromIngredients(allIngredients);
    const nutrition = definition.nutritionPerServing || {
      calories: 650,
      protein: 30,
      carbs: 66,
      fat: 24,
      fiber: 10,
      sugar: 16,
      sodium: 700,
    };

    const baseId = `menu-${slugify(definition.key || definition.name || heroName)}`;
    const baseName = definition.name || `${heroName} Menu`;

    const recipe = {
      id: ensureUniqueRecipeId(baseId, recipeLookupById),
      name: ensureUniqueRecipeName(baseName, recipeLookupByName),
      category: 'Menu Collection',
      description:
        definition.description ||
        `A composed menu highlighting ${heroLower} with complementary sides and sips.`,
      baseServings: definition.baseServings || 6,
      ingredients: ingredientsList,
      instructions,
      equipment: ['Serving Platters', 'Mixing Bowls', "Chef's Knife"],
      tags: Array.from(tags),
      nutritionPerServing: nutrition,
      allergens,
    };

    recipeLookupById.set(recipe.id, recipe);
    recipeLookupByName.set(recipe.name.toLowerCase(), recipe);
    return recipe;
  };

  const createRegionalTemplateRecipe = (
    definition,
    recipeLookupById,
    recipeLookupByName,
    ingredientBySlug,
  ) => {
    if (!definition) return null;
    const heroIngredient = ingredientBySlug.get(definition.heroIngredient);
    if (!heroIngredient) {
      return null;
    }
    const supporting = resolveIngredientList(definition.supportingIngredients, ingredientBySlug);
    const accompaniments = resolveIngredientList(definition.accompaniments, ingredientBySlug);
    const allIngredients = [heroIngredient]
      .concat(supporting)
      .concat(accompaniments)
      .filter(Boolean);

    const heroName = getIngredientDisplayName(heroIngredient);
    const heroLower = heroName.toLowerCase();
    const supportingNames = supporting.map((ingredient) => getIngredientDisplayName(ingredient));
    const accompanimentNames = accompaniments.map((ingredient) => getIngredientDisplayName(ingredient));

    const ingredientsList = allIngredients.map((ingredient) => ({
      item: getIngredientDisplayName(ingredient),
    }));
    if (accompanimentNames.length) {
      ingredientsList.push({ item: `To serve: ${accompanimentNames.join(', ')}` });
    }

    const marinadeHighlights = supportingNames.slice(0, 2);
    const finishingHighlights = supportingNames.slice(2);

    const instructions = [
      marinadeHighlights.length
        ? `Marinate the ${heroLower} with ${marinadeHighlights.join(', ')} for a ${definition.region} profile.`
        : `Season the ${heroLower} generously for a ${definition.region} profile.`,
      finishingHighlights.length
        ? `Cook until the ${heroLower} is tender, then fold in ${finishingHighlights.join(', ')} for texture.`
        : `Cook until the ${heroLower} is tender and aromatic.`,
      accompanimentNames.length
        ? `Serve over ${accompanimentNames.join(', ')} and finish with fresh herbs.`
        : 'Plate immediately and garnish with fresh herbs.',
      'Share family-style to highlight the regional inspiration.',
    ];

    const tags = new Set(['Regional']);
    if (definition.region) {
      tags.add(definition.region);
    }
    if (Array.isArray(definition.tags)) {
      definition.tags.forEach((tag) => {
        if (tag) tags.add(tag);
      });
    }
    allIngredients.forEach((ingredient) => {
      deriveDietTagsForIngredient(ingredient).forEach((tag) => tags.add(tag));
    });

    const allergens = deriveAllergensFromIngredients(allIngredients);
    const nutrition = definition.nutritionPerServing || {
      calories: 500,
      protein: 24,
      carbs: 56,
      fat: 18,
      fiber: 10,
      sugar: 9,
      sodium: 620,
    };

    const baseId = `regional-${slugify(definition.key || definition.name || definition.region)}`;
    const baseName = definition.name || `${definition.region} Feature`;

    const recipe = {
      id: ensureUniqueRecipeId(baseId, recipeLookupById),
      name: ensureUniqueRecipeName(baseName, recipeLookupByName),
      category: 'Regional Collection',
      description:
        definition.description ||
        `A ${definition.region.toLowerCase()} inspired plate built around ${heroLower}.`,
      baseServings: definition.baseServings || 4,
      ingredients: ingredientsList,
      instructions,
      equipment: ['Skillet', 'Dutch Oven', 'Serving Platter'],
      tags: Array.from(tags),
      nutritionPerServing: nutrition,
      allergens,
    };

    recipeLookupById.set(recipe.id, recipe);
    recipeLookupByName.set(recipe.name.toLowerCase(), recipe);
    return recipe;
  };

  const ensureMenuRegionalTemplateRecipes = (
    recipesList,
    recipeLookupById,
    recipeLookupByName,
    ingredientBySlug,
  ) => {
    const generated = [];

    const menuCount = countRecipesMatchingKeyword(recipesList, 'menu');
    const requiredMenu = Math.max(0, MIN_MENU_RECIPES - menuCount);
    if (requiredMenu > 0) {
      const availableDefinitions = MENU_TEMPLATE_DEFINITIONS.filter((definition) => {
        const baseId = `menu-${slugify(definition.key || definition.name)}`;
        return !recipeLookupById.has(baseId);
      });
      for (let index = 0; index < requiredMenu && index < availableDefinitions.length; index += 1) {
        const recipe = createMenuTemplateRecipe(
          availableDefinitions[index],
          recipeLookupById,
          recipeLookupByName,
          ingredientBySlug,
        );
        if (recipe) {
          generated.push(recipe);
        }
      }
    }

    const regionalCount = countRecipesMatchingKeyword(recipesList, 'regional');
    const requiredRegional = Math.max(0, MIN_REGIONAL_RECIPES - regionalCount);
    if (requiredRegional > 0) {
      const availableRegional = REGIONAL_TEMPLATE_DEFINITIONS.filter((definition) => {
        const baseId = `regional-${slugify(definition.key || definition.name || definition.region)}`;
        return !recipeLookupById.has(baseId);
      });
      for (let index = 0; index < requiredRegional && index < availableRegional.length; index += 1) {
        const recipe = createRegionalTemplateRecipe(
          availableRegional[index],
          recipeLookupById,
          recipeLookupByName,
          ingredientBySlug,
        );
        if (recipe) {
          generated.push(recipe);
        }
      }
    }

    return generated;
  };

  const recipeLookupById = new Map();
  const recipeLookupByName = new Map();
  recipes.forEach((recipe) => {
    if (!recipe || typeof recipe !== 'object') return;
    if (typeof recipe.id === 'string' && recipe.id) {
      recipeLookupById.set(recipe.id, recipe);
    }
    if (typeof recipe.name === 'string' && recipe.name) {
      recipeLookupByName.set(recipe.name.toLowerCase(), recipe);
    }
  });
  if (
    typeof createIngredientMatcherIndex !== 'function'
    || typeof mapRecipesToIngredientMatches !== 'function'
  ) {
    console.error('Blissful Reverie ingredient matching utilities are unavailable.');
    return;
  }

  const THEME_STORAGE_KEY = 'blissful-theme';
  const HOLIDAY_THEME_STORAGE_KEY = 'blissful-holiday-themes';
  let lastPersistedHolidayThemes = null;
  const THEME_OPTIONS = {
    light: [
      {
        id: 'serene',
        label: 'Serene',
        preview: 'linear-gradient(135deg, #4453d6, #f59e0b)',
      },
      {
        id: 'sunrise',
        label: 'Sunrise',
        preview: 'linear-gradient(135deg, #f97316, #0ea5e9)',
      },
      {
        id: 'meadow',
        label: 'Meadow',
        preview: 'linear-gradient(135deg, #2f855a, #6366f1)',
      },
      {
        id: 'mist',
        label: 'Misty Morning',
        preview: 'linear-gradient(135deg, #38bdf8, #a855f7)',
      },
      {
        id: 'blossom',
        label: 'Blossom',
        preview: 'linear-gradient(135deg, #ec4899, #22d3ee)',
      },
      {
        id: 'citrine',
        label: 'Citrine Glow',
        preview: 'linear-gradient(135deg, #facc15, #3b82f6)',
      },
    ],
    dark: [
      {
        id: 'midnight',
        label: 'Midnight',
        preview: 'linear-gradient(135deg, #2f6df0, #f472b6)',
      },
      {
        id: 'nebula',
        label: 'Nebula',
        preview: 'linear-gradient(135deg, #a855f7, #22d3ee)',
      },
      {
        id: 'forest',
        label: 'Forest',
        preview: 'linear-gradient(135deg, #34d399, #fbbf24)',
      },
      {
        id: 'ember',
        label: 'Ember',
        preview: 'linear-gradient(135deg, #f97316, #2563eb)',
      },
      {
        id: 'abyss',
        label: 'Abyss',
        preview: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
      },
      {
        id: 'velvet',
        label: 'Velvet Night',
        preview: 'linear-gradient(135deg, #f472b6, #14b8a6)',
      },
    ],
    sepia: [
      {
        id: 'classic',
        label: 'Classic Sepia',
        preview: 'linear-gradient(135deg, #b7791f, #2f855a)',
      },
      {
        id: 'copper',
        label: 'Copper Glow',
        preview: 'linear-gradient(135deg, #c26a3d, #0f766e)',
      },
      {
        id: 'umber',
        label: 'Deep Umber',
        preview: 'linear-gradient(135deg, #8a4b2a, #3b82f6)',
      },
    ],
  };

  const DEFAULT_THEME_SELECTIONS = {
    light: 'serene',
    dark: 'midnight',
    sepia: 'classic',
  };

  const DEFAULT_MODE = 'light';
  const AVAILABLE_MODES = Object.keys(THEME_OPTIONS);

  const MEASUREMENT_STORAGE_KEY = 'blissful-measurement';
  const MEASUREMENT_SYSTEMS = ['imperial', 'metric'];
  const DEFAULT_MEASUREMENT_SYSTEM = 'imperial';

  const APP_STATE_STORAGE_KEY = 'blissful-app-state';
  const MEAL_PLAN_STORAGE_KEY = 'blissful-meal-plan';
  const MEAL_PLAN_VIEW_MODES = ['day', 'week', 'month'];
  const DEFAULT_MEAL_PLAN_MODE = 'month';
  const AVAILABLE_VIEWS = ['meals', 'kitchen', 'pantry', 'meal-plan'];
  const MEAL_PLAN_ENTRY_TYPES = [
    { value: 'meal', label: 'Meal' },
    { value: 'drink', label: 'Drink' },
    { value: 'snack', label: 'Snack' },
  ];
  const FAMILY_ICON_OPTIONS = [
    '🧑',
    '👩',
    '👨',
    '🧑‍🍳',
    '🧑‍🌾',
    '🧑‍🎓',
    '🧑‍🔬',
    '🧑‍💻',
    '🧑‍🦽',
    '👵',
    '👴',
    '🧒',
    '👧',
    '👦',
    '👶',
    '🐾',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '🔴',
    '🟠',
    '🟡',
    '🟢',
    '🔵',
    '🟣',
    '🟤',
    '⚫',
    '⚪',
    '🐶',
    '🐱',
    '🐭',
    '🐹',
    '🐰',
    '🦊',
    '🐻',
    '🐼',
    '🐨',
    '🐯',
    '🦁',
    '🐮',
    '🐷',
    '🐸',
    '🐵',
    '🐤',
    '🐧',
    '🐦',
    '🦄',
    '🐢',
    '🦕',
    '🦖',
  ];

  const FAMILY_DIET_OPTIONS = [
    'Vegetarian',
    'Vegan',
    'Gluten Free',
    'Dairy Free',
    'Low Carb',
    'Low Sodium',
    'Whole Grains',
    'High Protein',
    'Pescatarian',
    'Keto',
  ];

  const createFamilyMemberId = () =>
    `member_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const createFamilyMember = (overrides = {}) => ({
    id:
      typeof overrides.id === 'string' && overrides.id
        ? overrides.id
        : createFamilyMemberId(),
    name: typeof overrides.name === 'string' && overrides.name ? overrides.name : 'Guest',
    icon:
      typeof overrides.icon === 'string' && overrides.icon
        ? overrides.icon
        : FAMILY_ICON_OPTIONS[0],
    targetCalories:
      Number.isFinite(overrides.targetCalories) && overrides.targetCalories >= 0
        ? Math.round(overrides.targetCalories)
        : null,
    allergies: Array.isArray(overrides.allergies) ? overrides.allergies : [],
    diets: Array.isArray(overrides.diets) ? overrides.diets : [],
    birthday: typeof overrides.birthday === 'string' ? overrides.birthday : '',
    preferences:
      typeof overrides.preferences === 'string' ? overrides.preferences.trim() : '',
  });

  const createDefaultFamilyMembers = () => [
    createFamilyMember({ name: 'Alex', icon: '🧑', targetCalories: 2100 }),
    createFamilyMember({ name: 'Riley', icon: '🧑‍🍳', targetCalories: 1800 }),
  ];
  const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fat'];
  const MACRO_PRECISION = {
    calories: 0,
    protein: 1,
    carbs: 1,
    fat: 1,
  };
  const MACRO_LABELS = {
    calories: 'Calories',
    protein: 'Protein',
    carbs: 'Carbs',
    fat: 'Fat',
  };
  const MEAL_PLAN_WEEK_START = 0;
  const MEAL_PLAN_DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const resolveFallbackMode = () =>
    AVAILABLE_MODES.includes(DEFAULT_MODE) ? DEFAULT_MODE : AVAILABLE_MODES[0];

  const loadThemePreferences = () => {
    const fallbackMode = resolveFallbackMode();
    const fallback = { mode: fallbackMode, selections: { ...DEFAULT_THEME_SELECTIONS } };
    try {
      const stored = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY));
      if (!stored || typeof stored !== 'object') {
        return fallback;
      }
      const mode = AVAILABLE_MODES.includes(stored.mode) ? stored.mode : fallbackMode;
      const selections = { ...DEFAULT_THEME_SELECTIONS, ...(stored.selections || {}) };
      AVAILABLE_MODES.forEach((key) => {
        const options = Array.isArray(THEME_OPTIONS[key]) ? THEME_OPTIONS[key] : [];
        if (!options.length) return;
        if (!options.some((option) => option.id === selections[key])) {
          const fallbackSelection =
            DEFAULT_THEME_SELECTIONS[key] || (options[0] ? options[0].id : undefined);
          if (fallbackSelection) {
            selections[key] = fallbackSelection;
          }
        }
      });
      return { mode, selections };
    } catch (error) {
      console.warn('Unable to read saved theme preferences.', error);
      return fallback;
    }
  };

  const themePreferences = loadThemePreferences();

  const loadMeasurementPreference = () => {
    try {
      const stored = localStorage.getItem(MEASUREMENT_STORAGE_KEY);
      if (typeof stored === 'string' && MEASUREMENT_SYSTEMS.includes(stored)) {
        return stored;
      }
    } catch (error) {
      console.warn('Unable to read measurement preference.', error);
    }
    return DEFAULT_MEASUREMENT_SYSTEM;
  };

  const padNumber = (value) => String(value).padStart(2, '0');

  const toISODateString = (date) => {
    if (!(date instanceof Date)) {
      return '';
    }
    return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
  };

  const isValidISODateString = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

  const parseISODateString = (value) => {
    if (!isValidISODateString(value)) {
      return null;
    }
    const [yearStr, monthStr, dayStr] = value.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return null;
    }
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year
      || date.getMonth() !== month - 1
      || date.getDate() !== day
    ) {
      return null;
    }
    return date;
  };

  const getStartOfDay = (date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  };

  const getNthWeekdayOfMonth = (year, monthIndex, weekday, occurrence) => {
    if (
      !Number.isFinite(year)
      || !Number.isFinite(monthIndex)
      || !Number.isFinite(weekday)
      || !Number.isFinite(occurrence)
    ) {
      return null;
    }
    const firstDay = new Date(year, monthIndex, 1);
    const offset = (weekday - firstDay.getDay() + 7) % 7;
    const day = 1 + offset + (occurrence - 1) * 7;
    return new Date(year, monthIndex, day);
  };

  const getLastWeekdayOfMonth = (year, monthIndex, weekday) => {
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(weekday)) {
      return null;
    }
    const lastDay = new Date(year, monthIndex + 1, 0);
    const diff = (lastDay.getDay() - weekday + 7) % 7;
    const day = lastDay.getDate() - diff;
    return new Date(year, monthIndex, day);
  };

  const HOLIDAY_DEFINITIONS = [
    { id: 'new-years-day', label: "New Year's Day", getDate: (year) => new Date(year, 0, 1) },
    {
      id: 'martin-luther-king-jr-day',
      label: 'Martin Luther King Jr. Day',
      getDate: (year) => getNthWeekdayOfMonth(year, 0, 1, 3),
    },
    { id: 'valentines-day', label: "Valentine's Day", getDate: (year) => new Date(year, 1, 14) },
    {
      id: 'presidents-day',
      label: "Presidents' Day",
      getDate: (year) => getNthWeekdayOfMonth(year, 1, 1, 3),
    },
    { id: 'st-patricks-day', label: "St. Patrick's Day", getDate: (year) => new Date(year, 2, 17) },
    {
      id: 'mothers-day',
      label: "Mother's Day",
      getDate: (year) => getNthWeekdayOfMonth(year, 4, 0, 2),
    },
    {
      id: 'memorial-day',
      label: 'Memorial Day',
      getDate: (year) => getLastWeekdayOfMonth(year, 4, 1),
    },
    { id: 'juneteenth', label: 'Juneteenth', getDate: (year) => new Date(year, 5, 19) },
    {
      id: 'independence-day',
      label: 'Independence Day',
      getDate: (year) => new Date(year, 6, 4),
    },
    {
      id: 'labor-day',
      label: 'Labor Day',
      getDate: (year) => getNthWeekdayOfMonth(year, 8, 1, 1),
    },
    { id: 'halloween', label: 'Halloween', getDate: (year) => new Date(year, 9, 31) },
    {
      id: 'thanksgiving-day',
      label: 'Thanksgiving',
      getDate: (year) => getNthWeekdayOfMonth(year, 10, 4, 4),
    },
    { id: 'christmas-eve', label: 'Christmas Eve', getDate: (year) => new Date(year, 11, 24) },
    { id: 'christmas-day', label: 'Christmas Day', getDate: (year) => new Date(year, 11, 25) },
    { id: 'new-years-eve', label: "New Year's Eve", getDate: (year) => new Date(year, 11, 31) },
  ];

  const holidayDefinitionLookup = new Map(
    HOLIDAY_DEFINITIONS.map((definition) => [definition.id, definition]),
  );
  const HOLIDAY_DEFAULT_SELECTIONS = HOLIDAY_DEFINITIONS.map((definition) => definition.id);

  const loadHolidayThemePreferences = () => {
    const fallback = { enabled: false, holidays: HOLIDAY_DEFAULT_SELECTIONS.slice() };
    try {
      const storedRaw = localStorage.getItem(HOLIDAY_THEME_STORAGE_KEY);
      if (!storedRaw) {
        lastPersistedHolidayThemes = null;
        return fallback;
      }
      const stored = JSON.parse(storedRaw);
      if (!stored || typeof stored !== 'object') {
        return fallback;
      }
      const enabled = stored.enabled === true;
      const holidays = Array.isArray(stored.holidays)
        ? stored.holidays.filter((id) => holidayDefinitionLookup.has(id))
        : fallback.holidays.slice();
      lastPersistedHolidayThemes = storedRaw;
      return { enabled, holidays };
    } catch (error) {
      console.warn('Unable to read holiday theme preferences.', error);
      return fallback;
    }
  };

  const holidayThemePreferences = loadHolidayThemePreferences();

  const HOLIDAY_THEME_OVERRIDES = {
    'new-years-day': { light: 'citrine', dark: 'nebula', sepia: 'copper' },
    'martin-luther-king-jr-day': { light: 'mist', dark: 'midnight', sepia: 'classic' },
    'valentines-day': { light: 'blossom', dark: 'velvet', sepia: 'copper' },
    'presidents-day': { light: 'serene', dark: 'midnight', sepia: 'classic' },
    'st-patricks-day': { light: 'meadow', dark: 'forest', sepia: 'umber' },
    'mothers-day': { light: 'blossom', dark: 'velvet', sepia: 'classic' },
    'memorial-day': { light: 'sunrise', dark: 'ember', sepia: 'copper' },
    'juneteenth': { light: 'sunrise', dark: 'ember', sepia: 'copper' },
    'independence-day': { light: 'citrine', dark: 'nebula', sepia: 'copper' },
    'labor-day': { light: 'meadow', dark: 'forest', sepia: 'classic' },
    'halloween': { light: 'sunrise', dark: 'abyss', sepia: 'umber' },
    'thanksgiving-day': { light: 'meadow', dark: 'forest', sepia: 'umber' },
    'christmas-eve': { light: 'mist', dark: 'abyss', sepia: 'classic' },
    'christmas-day': { light: 'mist', dark: 'abyss', sepia: 'classic' },
    'new-years-eve': { light: 'citrine', dark: 'nebula', sepia: 'copper' },
  };

  const holidayCache = new Map();

  const getHolidaysForDate = (date) => {
    if (!(date instanceof Date)) {
      return [];
    }
    const year = date.getFullYear();
    if (!holidayCache.has(year)) {
      const yearMap = new Map();
      HOLIDAY_DEFINITIONS.forEach((definition) => {
        if (!definition || typeof definition.getDate !== 'function') {
          return;
        }
        const resolved = definition.getDate(year);
        if (!(resolved instanceof Date) || Number.isNaN(resolved.getTime())) {
          return;
        }
        const iso = toISODateString(resolved);
        if (!iso) {
          return;
        }
        const entries = yearMap.get(iso) || [];
        entries.push(definition);
        yearMap.set(iso, entries);
      });
      holidayCache.set(year, yearMap);
    }
    const iso = toISODateString(date);
    const entries = holidayCache.get(year).get(iso);
    return Array.isArray(entries) ? entries.slice() : [];
  };

  const getHolidayLabelsForDate = (date) =>
    getHolidaysForDate(date).map((holiday) => holiday.label);

  const getStartOfWeek = (date) => {
    const start = getStartOfDay(date);
    const diff = (start.getDay() - MEAL_PLAN_WEEK_START + 7) % 7;
    return addDays(start, -diff);
  };

  const getEndOfWeek = (date) => addDays(getStartOfWeek(date), 6);

  const getTodayIsoDate = () => toISODateString(new Date());

  const MEAL_PLAN_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

  const normalizeMealPlanTime = (value) => {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!MEAL_PLAN_TIME_PATTERN.test(trimmed)) {
      return null;
    }
    return trimmed;
  };

  const formatMealPlanTime = (value) => {
    const normalized = normalizeMealPlanTime(value);
    if (!normalized) {
      return '';
    }
    const [hourStr, minuteStr] = normalized.split(':');
    const hours = Number(hourStr);
    const minutes = Number(minuteStr);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return '';
    }
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minuteStr} ${period}`;
  };

  const sortMealPlanEntries = (entries) => {
    if (!Array.isArray(entries)) {
      return [];
    }
    return entries.slice().sort((a, b) => {
      const timeA = normalizeMealPlanTime(a?.time);
      const timeB = normalizeMealPlanTime(b?.time);
      if (timeA && timeB && timeA !== timeB) {
        return timeA.localeCompare(timeB);
      }
      if (timeA && !timeB) {
        return -1;
      }
      if (!timeA && timeB) {
        return 1;
      }
      const titleA = typeof a?.title === 'string' ? a.title : '';
      const titleB = typeof b?.title === 'string' ? b.title : '';
      return titleA.localeCompare(titleB);
    });
  };

  const mealPlanEntryTypeLookup = new Map(
    MEAL_PLAN_ENTRY_TYPES.map(({ value, label }) => [value, label]),
  );

  const createMealPlanEntryId = () =>
    `entry_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const loadMealPlan = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(MEAL_PLAN_STORAGE_KEY));
      if (!stored || typeof stored !== 'object') {
        return {};
      }
      const normalized = {};
      Object.entries(stored).forEach(([dateKey, entries]) => {
        if (!isValidISODateString(dateKey)) {
          return;
        }
        const parsedDate = parseISODateString(dateKey);
        if (!parsedDate) {
          return;
        }
        const list = Array.isArray(entries) ? entries : [];
        const cleaned = [];
        list.forEach((entry) => {
          if (!entry || typeof entry !== 'object') return;
          const title = typeof entry.title === 'string' ? entry.title.trim() : '';
          if (!title) return;
          const type = mealPlanEntryTypeLookup.has(entry.type) ? entry.type : 'meal';
          const id = typeof entry.id === 'string' && entry.id ? entry.id : createMealPlanEntryId();
          const time = normalizeMealPlanTime(entry.time);
          const cleanedEntry = { id, type, title };
          if (time) {
            cleanedEntry.time = time;
          }
          let recipeId = typeof entry.recipeId === 'string' ? entry.recipeId : '';
          if (recipeId && !recipeLookupById.has(recipeId)) {
            recipeId = '';
          }
          if (!recipeId) {
            const matchedRecipe = recipeLookupByName.get(title.toLowerCase());
            if (matchedRecipe?.id) {
              recipeId = matchedRecipe.id;
            }
          }
          if (recipeId) {
            cleanedEntry.recipeId = recipeId;
          }
          cleanedEntry.attendance = sanitizeMealPlanAttendance(
            entry.attendance ?? entry.servings,
          );
          cleaned.push(cleanedEntry);
        });
        if (cleaned.length) {
          normalized[dateKey] = sortMealPlanEntries(cleaned);
        }
      });
      return normalized;
    } catch (error) {
      console.warn('Unable to read saved meal plan.', error);
      return {};
    }
  };

  const measurementPreference = loadMeasurementPreference();

  const FAVORITES_STORAGE_KEY = 'blissful-favorites';
  const PANTRY_FAVORITES_STORAGE_KEY = 'blissful-pantry-favorites';

  const recipeIdSet = new Set(recipes.map((recipe) => recipe.id));
  const ingredientSlugSet = new Set(
    ingredients.map((ingredient) => (ingredient && ingredient.slug ? ingredient.slug : null)).filter(Boolean),
  );

  const loadFavoriteRecipeIds = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY));
      if (!Array.isArray(stored)) {
        return [];
      }
      const filtered = new Set();
      stored.forEach((id) => {
        if (recipeIdSet.has(id)) {
          filtered.add(id);
        }
      });
      return Array.from(filtered);
    } catch (error) {
      console.warn('Unable to read favorite recipes.', error);
      return [];
    }
  };

  const favoriteRecipeIds = loadFavoriteRecipeIds();

  const loadFavoritePantrySlugs = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(PANTRY_FAVORITES_STORAGE_KEY));
      if (!Array.isArray(stored)) {
        return [];
      }
      const filtered = new Set();
      stored.forEach((slug) => {
        if (ingredientSlugSet.has(slug)) {
          filtered.add(slug);
        }
      });
      return Array.from(filtered);
    } catch (error) {
      console.warn('Unable to read favorite pantry items.', error);
      return [];
    }
  };

  const favoritePantrySlugs = loadFavoritePantrySlugs();

  const getDefaultMealFilters = () => ({
    search: '',
    ingredients: [],
    ingredientsExcluded: [],
    tags: [],
    tagsExcluded: [],
    allergies: [],
    allergiesExcluded: [],
    equipment: [],
    equipmentExcluded: [],
    favoritesOnly: false,
    familyMembers: [],
    pantryOnly: false,
    substitutionsAllowed: false,
  });

  const getDefaultPantryFilters = () => ({
    search: '',
    categories: [],
    tags: [],
    allergens: [],
  });

  const getDefaultKitchenFilters = () => ({
    search: '',
  });

  const toUniqueStringArray = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }
    const unique = new Set();
    value.forEach((entry) => {
      if (typeof entry !== 'string') return;
      const trimmed = entry.trim();
      if (trimmed) {
        unique.add(trimmed);
      }
    });
    return Array.from(unique);
  };

  const normalizeTriStatePair = (includeList, excludeList) => {
    const includeSet = new Set(includeList);
    const excludeSet = new Set();
    excludeList.forEach((value) => {
      if (includeSet.has(value)) {
        includeSet.delete(value);
      } else {
        excludeSet.add(value);
      }
    });
    return { include: Array.from(includeSet), exclude: Array.from(excludeSet) };
  };

  const TRI_STATE_FILTER_KEYS = {
    ingredients: { include: 'ingredients', exclude: 'ingredientsExcluded' },
    tags: { include: 'tags', exclude: 'tagsExcluded' },
    allergies: { include: 'allergies', exclude: 'allergiesExcluded' },
    equipment: { include: 'equipment', exclude: 'equipmentExcluded' },
  };

  const getTriStateConfig = (field) => TRI_STATE_FILTER_KEYS[field] || null;

  const getTriStateState = (filters, field, value) => {
    const config = getTriStateConfig(field);
    if (!config) {
      return filters[field] && Array.isArray(filters[field]) && filters[field].includes(value)
        ? 'include'
        : 'off';
    }
    const includeSet = new Set(Array.isArray(filters[config.include]) ? filters[config.include] : []);
    if (includeSet.has(value)) {
      return 'include';
    }
    const excludeSet = new Set(Array.isArray(filters[config.exclude]) ? filters[config.exclude] : []);
    if (excludeSet.has(value)) {
      return 'exclude';
    }
    return 'off';
  };

  const setTriStateState = (filters, field, value, state) => {
    const config = getTriStateConfig(field);
    if (!config) {
      return;
    }
    if (!Array.isArray(filters[config.include])) {
      filters[config.include] = [];
    }
    if (!Array.isArray(filters[config.exclude])) {
      filters[config.exclude] = [];
    }
    const includeSet = new Set(filters[config.include]);
    const excludeSet = new Set(filters[config.exclude]);
    includeSet.delete(value);
    excludeSet.delete(value);
    if (state === 'include') {
      includeSet.add(value);
    } else if (state === 'exclude') {
      excludeSet.add(value);
    }
    filters[config.include] = Array.from(includeSet);
    filters[config.exclude] = Array.from(excludeSet);
  };

  const cycleTriStateState = (current) => {
    if (current === 'include') {
      return 'exclude';
    }
    if (current === 'exclude') {
      return 'off';
    }
    return 'include';
  };

  const describeTriStateState = (state) => {
    if (state === 'include') {
      return 'included';
    }
    if (state === 'exclude') {
      return 'excluded';
    }
    return 'not selected';
  };

  const updateTriStateButtonState = (button, state) => {
    if (!(button instanceof HTMLElement)) {
      return;
    }
    const normalizedState = state === 'include' || state === 'exclude' ? state : 'off';
    button.dataset.filterState = normalizedState;
    const ariaChecked = normalizedState === 'include' ? 'true' : normalizedState === 'exclude' ? 'mixed' : 'false';
    button.setAttribute('aria-checked', ariaChecked);
    const labelText = button.dataset.filterLabel || '';
    const title = labelText ? `${labelText}: ${describeTriStateState(normalizedState)}` : describeTriStateState(normalizedState);
    button.setAttribute('title', title);
    button.setAttribute('aria-label', title);
    const icon = button.querySelector('.filter-toggle__icon');
    if (icon) {
      if (normalizedState === 'include') {
        icon.textContent = '✓';
      } else if (normalizedState === 'exclude') {
        icon.textContent = '✕';
      } else {
        icon.textContent = '';
      }
    }
  };

  const createTriStateButton = (option, labelText, field, filters, onChange) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'checkbox-option filter-toggle';
    button.dataset.filterMode = 'tri';
    button.dataset.filterField = field;
    button.dataset.filterValue = option;
    button.dataset.filterLabel = labelText;
    button.setAttribute('role', 'checkbox');
    button.setAttribute('aria-checked', 'false');
    const icon = document.createElement('span');
    icon.className = 'filter-toggle__icon';
    button.appendChild(icon);
    const labelSpan = document.createElement('span');
    labelSpan.className = 'filter-toggle__label';
    labelSpan.textContent = labelText;
    button.appendChild(labelSpan);
    button.addEventListener('click', () => {
      if (button.disabled) {
        return;
      }
      const current = button.dataset.filterState || 'off';
      const next = cycleTriStateState(current);
      setTriStateState(filters, field, option, next);
      updateTriStateButtonState(button, next);
      if (typeof onChange === 'function') {
        onChange(next);
      }
    });
    return button;
  };

  const getTriStateSets = (filters, field) => {
    const config = getTriStateConfig(field);
    if (!config) {
      return { include: new Set(), exclude: new Set() };
    }
    const include = new Set(Array.isArray(filters[config.include]) ? filters[config.include] : []);
    const exclude = new Set(Array.isArray(filters[config.exclude]) ? filters[config.exclude] : []);
    return { include, exclude };
  };

  const sanitizeMealFilters = (value, members = []) => {
    const defaults = getDefaultMealFilters();
    if (!value || typeof value !== 'object') {
      return defaults;
    }
    const ingredientSelections = normalizeTriStatePair(
      toUniqueStringArray(value.ingredients),
      toUniqueStringArray(value.ingredientsExcluded),
    );
    const tagSelections = normalizeTriStatePair(
      toUniqueStringArray(value.tags),
      toUniqueStringArray(value.tagsExcluded),
    );
    const allergySelections = normalizeTriStatePair(
      toUniqueStringArray(value.allergies),
      toUniqueStringArray(value.allergiesExcluded),
    );
    const equipmentSelections = normalizeTriStatePair(
      toUniqueStringArray(value.equipment),
      toUniqueStringArray(value.equipmentExcluded),
    );
    return {
      search: typeof value.search === 'string' ? value.search : defaults.search,
      ingredients: ingredientSelections.include,
      ingredientsExcluded: ingredientSelections.exclude,
      tags: tagSelections.include,
      tagsExcluded: tagSelections.exclude,
      allergies: allergySelections.include,
      allergiesExcluded: allergySelections.exclude,
      equipment: equipmentSelections.include,
      equipmentExcluded: equipmentSelections.exclude,
      favoritesOnly: Boolean(value.favoritesOnly),
      familyMembers: sanitizeMealFilterFamilyMembers(value.familyMembers, members),
      pantryOnly: Boolean(value.pantryOnly),
      substitutionsAllowed: Boolean(value.substitutionsAllowed),
    };
  };

  const sanitizePantryFilters = (value) => {
    const defaults = getDefaultPantryFilters();
    if (!value || typeof value !== 'object') {
      return defaults;
    }
    return {
      search: typeof value.search === 'string' ? value.search : defaults.search,
      categories: toUniqueStringArray(value.categories),
      tags: toUniqueStringArray(value.tags),
      allergens: toUniqueStringArray(value.allergens),
    };
  };

  const sanitizeKitchenFilters = (value) => {
    const defaults = getDefaultKitchenFilters();
    if (!value || typeof value !== 'object') {
      return defaults;
    }
    return {
      search: typeof value.search === 'string' ? value.search : defaults.search,
    };
  };

  const sanitizeServingOverrides = (value) => {
    if (!value || typeof value !== 'object') {
      return {};
    }
    const overrides = {};
    Object.entries(value).forEach(([key, raw]) => {
      if (typeof key !== 'string' || !key) {
        return;
      }
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) {
        overrides[key] = Math.max(1, Math.round(parsed));
      }
    });
    return overrides;
  };

  const sanitizeNotes = (value) => {
    if (!value || typeof value !== 'object') {
      return {};
    }
    const notes = {};
    Object.entries(value).forEach(([key, raw]) => {
      if (typeof key !== 'string' || !key || typeof raw !== 'string') {
        return;
      }
      notes[key] = raw;
    });
    return notes;
  };

  const sanitizeOpenNotes = (value) => {
    if (!value || typeof value !== 'object') {
      return {};
    }
    const open = {};
    Object.entries(value).forEach(([key, raw]) => {
      if (typeof key !== 'string' || !key) {
        return;
      }
      if (Boolean(raw)) {
        open[key] = true;
      }
    });
    return open;
  };

  const sanitizePantryInventory = (value) => {
    if (!value || typeof value !== 'object') {
      return {};
    }
    const inventory = {};
    Object.entries(value).forEach(([slug, entry]) => {
      if (typeof slug !== 'string' || !slug || !entry || typeof entry !== 'object') {
        return;
      }
      const quantityRaw = entry.quantity;
      const unitRaw = entry.unit;
      const quantity =
        quantityRaw === null || quantityRaw === undefined
          ? ''
          : typeof quantityRaw === 'string'
            ? quantityRaw.trim()
            : String(quantityRaw);
      const unit = typeof unitRaw === 'string' ? unitRaw.trim() : '';
      const hasQuantity = quantity !== '';
      const isDefaultUnit = unit.toLowerCase() === 'each';
      if (!hasQuantity && (!unit || isDefaultUnit)) {
        return;
      }
      inventory[slug] = {
        quantity: hasQuantity ? quantity : '',
        unit: unit || 'each',
      };
    });
    return inventory;
  };

  const normalizeStringArray = (value) => {
    const normalized = [];
    const pushValue = (input) => {
      if (typeof input !== 'string') return;
      const trimmed = input.trim();
      if (!trimmed) return;
      if (!normalized.includes(trimmed)) {
        normalized.push(trimmed);
      }
    };
    if (Array.isArray(value)) {
      value.forEach((entry) => pushValue(entry));
    } else if (typeof value === 'string') {
      value
        .split(/[\n,;]/)
        .map((item) => item.trim())
        .forEach((item) => pushValue(item));
    }
    return normalized;
  };

  const sanitizeFamilyMember = (value, fallbackName = 'Family member') => {
    const member = createFamilyMember({ id: value?.id });
    const preferredName =
      typeof value?.name === 'string' && value.name.trim() ? value.name.trim() : fallbackName;
    member.name = preferredName;
    const icon = typeof value?.icon === 'string' ? value.icon : '';
    member.icon = FAMILY_ICON_OPTIONS.includes(icon) ? icon : FAMILY_ICON_OPTIONS[0];
    const calories = Number(value?.targetCalories);
    member.targetCalories =
      Number.isFinite(calories) && calories >= 0 ? Math.round(calories) : null;
    const normalizeWithCanonical = (list, options = []) => {
      const normalizedList = normalizeStringArray(list);
      const result = [];
      const seen = new Set();
      normalizedList.forEach((entry) => {
        const key = typeof entry === 'string' ? entry.trim().toLowerCase() : '';
        if (!key || seen.has(key)) {
          return;
        }
        seen.add(key);
        if (Array.isArray(options) && options.length) {
          const match = options.find((option) => option.toLowerCase() === key);
          result.push(match || entry);
        } else {
          result.push(entry);
        }
      });
      return result;
    };
    member.allergies = normalizeWithCanonical(value?.allergies);
    member.diets = normalizeWithCanonical(value?.diets, FAMILY_DIET_OPTIONS);
    member.birthday = isValidISODateString(value?.birthday) ? value.birthday : '';
    member.preferences = typeof value?.preferences === 'string' ? value.preferences.trim() : '';
    return member;
  };

  const sanitizeFamilyMembers = (value) => {
    const list = Array.isArray(value) ? value : [];
    const sanitized = [];
    const usedIds = new Set();
    list.forEach((entry, index) => {
      const fallbackName = `Member ${index + 1}`;
      const member = sanitizeFamilyMember(entry, fallbackName);
      if (usedIds.has(member.id)) {
        member.id = createFamilyMemberId();
      }
      usedIds.add(member.id);
      sanitized.push(member);
    });
    if (!sanitized.length) {
      return createDefaultFamilyMembers();
    }
    return sanitized;
  };

  const sanitizeMealFilterFamilyMembers = (value, members) => {
    const availableIds = new Set(
      (Array.isArray(members) ? members : [])
        .map((member) => (member && member.id ? member.id : null))
        .filter(Boolean),
    );
    if (!Array.isArray(value) || !availableIds.size) {
      return [];
    }
    const unique = [];
    value.forEach((entry) => {
      if (typeof entry !== 'string') return;
      const trimmed = entry.trim();
      if (!trimmed || !availableIds.has(trimmed) || unique.includes(trimmed)) {
        return;
      }
      unique.push(trimmed);
    });
    return unique;
  };

  const sanitizeMealPlanMemberFilter = (value, members) => {
    const sourceMembers = Array.isArray(members)
      ? members
      : typeof state !== 'undefined' && Array.isArray(state.familyMembers)
        ? state.familyMembers
        : [];
    const availableIds = new Set(
      sourceMembers
        .map((member) => (typeof member?.id === 'string' ? member.id : ''))
        .filter(Boolean),
    );
    if (!availableIds.size) {
      return [];
    }
    const list = Array.isArray(value) ? value : [];
    const sanitized = [];
    list.forEach((entry) => {
      if (typeof entry !== 'string') return;
      const trimmed = entry.trim();
      if (!trimmed || sanitized.includes(trimmed) || !availableIds.has(trimmed)) {
        return;
      }
      sanitized.push(trimmed);
    });
    return sanitized;
  };

  const sanitizeMealPlanMacroSelection = (value, members) => {
    const sourceMembers = Array.isArray(members)
      ? members
      : typeof state !== 'undefined' && Array.isArray(state.familyMembers)
        ? state.familyMembers
        : [];
    const availableIds = new Set(['overall', 'guests']);
    sourceMembers.forEach((member) => {
      if (member && typeof member.id === 'string' && member.id) {
        availableIds.add(member.id);
      }
    });
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (availableIds.has(trimmed)) {
        return trimmed;
      }
    }
    const fallback = sourceMembers.find((member) => member && member.id);
    return fallback && fallback.id ? fallback.id : 'overall';
  };

  const sanitizeMealPlanAttendance = (value) => {
    const attendance = { members: [], guests: 0 };
    if (!value) {
      return attendance;
    }
    const uniqueMembers = new Set();
    const collectMember = (id) => {
      if (typeof id !== 'string' || !id.trim()) return;
      uniqueMembers.add(id.trim());
    };
    if (Array.isArray(value)) {
      value.forEach((item) => collectMember(item));
    }
    if (Array.isArray(value?.members)) {
      value.members.forEach((item) => collectMember(item));
    }
    attendance.members = Array.from(uniqueMembers);
    let guests = 0;
    if (value && typeof value === 'object') {
      guests += parseNonNegativeInteger(value.guests, 0);
      if ('adults' in value || 'kids' in value) {
        guests += parseNonNegativeInteger(value.adults, 0);
        guests += parseNonNegativeInteger(value.kids, 0);
      }
    } else if (typeof value === 'number') {
      guests += Math.max(0, Math.round(value));
    }
    attendance.guests = guests;
    return attendance;
  };

  const ensureFamilySanitized = () => {
    const sanitized = sanitizeFamilyMembers(state.familyMembers);
    const previousMembersSerialized = JSON.stringify(state.familyMembers);
    const sanitizedMembersSerialized = JSON.stringify(sanitized);
    const nextFilter = sanitizeMealPlanMemberFilter(state.mealPlanMemberFilter, sanitized);
    const previousFilterSerialized = JSON.stringify(state.mealPlanMemberFilter || []);
    const sanitizedFilterSerialized = JSON.stringify(nextFilter);
    const previousMealFilterFamily = JSON.stringify(state.mealFilters?.familyMembers || []);
    const nextMealFilterFamily = sanitizeMealFilterFamilyMembers(
      state.mealFilters?.familyMembers,
      sanitized,
    );
    const sanitizedMealFilterFamilySerialized = JSON.stringify(nextMealFilterFamily);
    const nextMacroSelection = sanitizeMealPlanMacroSelection(
      state.mealPlanMacroSelection,
      sanitized,
    );
    const selectionChanged = nextMacroSelection !== state.mealPlanMacroSelection;
    state.familyMembers = sanitized;
    state.mealPlanMemberFilter = nextFilter;
    state.mealPlanMacroSelection = nextMacroSelection;
    if (state.mealFilters) {
      state.mealFilters.familyMembers = nextMealFilterFamily;
    }
    if (
      sanitizedMembersSerialized !== previousMembersSerialized
      || sanitizedFilterSerialized !== previousFilterSerialized
      || sanitizedMealFilterFamilySerialized !== previousMealFilterFamily
      || selectionChanged
    ) {
      persistAppState();
    }
    return state.familyMembers;
  };

  const parseNonNegativeInteger = (value, fallback = 0) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return fallback;
    }
    return Math.round(parsed);
  };

  const formatMacroValue = (value, macroKey) => {
    const numeric = Number(value);
    const safe = Number.isFinite(numeric) ? numeric : 0;
    const decimals = MACRO_PRECISION[macroKey] ?? 0;
    return safe.toLocaleString(undefined, {
      minimumFractionDigits: decimals > 0 ? 1 : 0,
      maximumFractionDigits: decimals,
    });
  };

  const loadAppState = () => {
    const fallback = {
      activeView: 'meals',
      mealFilters: getDefaultMealFilters(),
      pantryFilters: getDefaultPantryFilters(),
      kitchenFilters: getDefaultKitchenFilters(),
      mealPlanViewMode: DEFAULT_MEAL_PLAN_MODE,
      mealPlanSelectedDate: getTodayIsoDate(),
      mealPlanMemberFilter: [],
      mealPlanMacroSelection: 'overall',
      servingOverrides: {},
      notes: {},
      openNotes: {},
      pantryInventory: {},
      familyMembers: createDefaultFamilyMembers(),
    };
    try {
      const stored = JSON.parse(localStorage.getItem(APP_STATE_STORAGE_KEY));
      if (!stored || typeof stored !== 'object') {
        return fallback;
      }
      const result = { ...fallback };
      if (AVAILABLE_VIEWS.includes(stored.activeView)) {
        result.activeView = stored.activeView;
      }
      if (stored.pantryFilters) {
        result.pantryFilters = sanitizePantryFilters(stored.pantryFilters);
      }
      if (stored.kitchenFilters) {
        result.kitchenFilters = sanitizeKitchenFilters(stored.kitchenFilters);
      }
      if (MEAL_PLAN_VIEW_MODES.includes(stored.mealPlanViewMode)) {
        result.mealPlanViewMode = stored.mealPlanViewMode;
      }
      if (isValidISODateString(stored.mealPlanSelectedDate)) {
        result.mealPlanSelectedDate = stored.mealPlanSelectedDate;
      }
      result.familyMembers = sanitizeFamilyMembers(stored.familyMembers);
      if (stored.mealFilters) {
        result.mealFilters = sanitizeMealFilters(stored.mealFilters, result.familyMembers);
      } else {
        result.mealFilters = sanitizeMealFilters(result.mealFilters, result.familyMembers);
      }
      result.mealPlanMemberFilter = sanitizeMealPlanMemberFilter(
        stored.mealPlanMemberFilter,
        result.familyMembers,
      );
      result.mealPlanMacroSelection = sanitizeMealPlanMacroSelection(
        stored.mealPlanMacroSelection,
        result.familyMembers,
      );
      result.servingOverrides = sanitizeServingOverrides(stored.servingOverrides);
      result.notes = sanitizeNotes(stored.notes);
      result.openNotes = sanitizeOpenNotes(stored.openNotes);
      result.pantryInventory = sanitizePantryInventory(stored.pantryInventory);
      return result;
    } catch (error) {
      console.warn('Unable to read saved application state.', error);
      return fallback;
    }
  };

  const storedAppState = loadAppState();

  const sanitizedFamilyMembers = sanitizeFamilyMembers(storedAppState.familyMembers);

  const state = {
    activeView: storedAppState.activeView,
    mealFilters: sanitizeMealFilters(storedAppState.mealFilters, sanitizedFamilyMembers),
    pantryFilters: sanitizePantryFilters(storedAppState.pantryFilters),
    kitchenFilters: sanitizeKitchenFilters(storedAppState.kitchenFilters),
    mealPlanViewMode: storedAppState.mealPlanViewMode,
    mealPlanSelectedDate: storedAppState.mealPlanSelectedDate,
    mealPlanMemberFilter: sanitizeMealPlanMemberFilter(
      storedAppState.mealPlanMemberFilter,
      sanitizedFamilyMembers,
    ),
    mealPlanMacroSelection: sanitizeMealPlanMacroSelection(
      storedAppState.mealPlanMacroSelection,
      sanitizedFamilyMembers,
    ),
    mealPlan: loadMealPlan(),
    servingOverrides: sanitizeServingOverrides(storedAppState.servingOverrides),
    notes: sanitizeNotes(storedAppState.notes),
    openNotes: sanitizeOpenNotes(storedAppState.openNotes),
    pantryInventory: sanitizePantryInventory(storedAppState.pantryInventory),
    familyMembers: sanitizedFamilyMembers,
    themeMode: themePreferences.mode,
    themeSelections: { ...themePreferences.selections },
    holidayThemesEnabled: holidayThemePreferences.enabled,
    holidayThemeAllowList: new Set(holidayThemePreferences.holidays),
    measurementSystem: measurementPreference,
    favoriteRecipes: new Set(favoriteRecipeIds),
    favoritePantryItems: new Set(favoritePantrySlugs),
  };

  const equipmentOptions = Array.from(
    new Set(
      recipes.flatMap((recipe) => Array.isArray(recipe.equipment) ? recipe.equipment : []),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const equipmentEntries = new Map();
  recipes.forEach((recipe) => {
    const recipeEquipment = Array.isArray(recipe.equipment) ? recipe.equipment : [];
    recipeEquipment.forEach((raw) => {
      const normalized = String(raw || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!normalized) {
        return;
      }
      const key = normalized.toLowerCase();
      const displayName = toTitleCase(normalized);
      const entry = equipmentEntries.get(key);
      if (entry) {
        entry.count += 1;
      } else {
        equipmentEntries.set(key, {
          id: slugify(normalized),
          name: displayName,
          count: 1,
          searchText: `${displayName.toLowerCase()} ${slugify(normalized).replace(/-/g, ' ')}`,
        });
      }
    });
  });

  const kitchenItems = Array.from(equipmentEntries.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const TAG_SYNONYM_DEFINITIONS = [
    { canonical: 'Autumn / Fall', tags: ['Autumn', 'Fall'] },
    { canonical: 'Bright', tags: ['Citrus'] },
    { canonical: 'Earthy', tags: ['Coffee', 'Matcha', 'Tea'] },
    { canonical: 'Nutty', tags: ['Nuts', 'Sesame'] },
    { canonical: 'Rich', tags: ['Dairy'] },
    { canonical: 'Savory', tags: ['Vegetable', 'Potato', 'Seafood'] },
    { canonical: 'Spicy', tags: ['Spicy'] },
    { canonical: 'Sweet', tags: ['Chocolate', 'Fruit'] },
    { canonical: 'Sweet & Savory', tags: ['Sweet Savory'] },
    { canonical: 'Tropical', tags: ['Tropical'] },
  ];

  const ALWAYS_AVAILABLE_TAGS = ['Spring', 'Winter'];

  const canonicalTagLookup = new Map();
  const tagToCanonical = new Map();

  const registerCanonicalTag = (canonical, tags) => {
    const normalizedCanonical = typeof canonical === 'string' ? canonical : '';
    if (!normalizedCanonical) return;
    let set = canonicalTagLookup.get(normalizedCanonical);
    if (!set) {
      set = new Set();
      canonicalTagLookup.set(normalizedCanonical, set);
    }
    (Array.isArray(tags) ? tags : []).forEach((tag) => {
      if (typeof tag !== 'string' || !tag) return;
      set.add(tag);
      tagToCanonical.set(tag, normalizedCanonical);
    });
  };

  TAG_SYNONYM_DEFINITIONS.forEach(({ canonical, tags }) => registerCanonicalTag(canonical, tags));

  const rawTagSet = new Set(
    recipes.flatMap((recipe) => (Array.isArray(recipe.tags) ? recipe.tags : [])),
  );
  ALWAYS_AVAILABLE_TAGS.forEach((tag) => rawTagSet.add(tag));
  TAG_SYNONYM_DEFINITIONS.forEach(({ canonical }) => rawTagSet.add(canonical));
  const rawTagOptions = Array.from(rawTagSet).sort((a, b) => a.localeCompare(b));

  const TAG_CATEGORY_DEFINITIONS = [
    {
      id: 'meal-time',
      label: 'Meal & Course',
      tags: ['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Snack', 'Side', 'Dessert', 'Tea Time'],
    },
    {
      id: 'seasonal',
      label: 'Seasonal',
      tags: ['Spring', 'Summer', 'Autumn / Fall', 'Winter'],
    },
    {
      id: 'cuisine',
      label: 'Cuisine & Region',
      tags: ['Asian Inspired', 'Indian', 'Italian', 'Mediterranean', 'North African', 'Tex-Mex', 'Tacos'],
    },
    {
      id: 'diet',
      label: 'Diet & Nutrition',
      tags: [
        'Vegetarian',
        'Vegan',
        'Gluten Free',
        'Dairy Free',
        'No Dairy',
        'Low Carb',
        'Low Sodium',
        'Whole Grains',
        'High Protein',
      ],
    },
    {
      id: 'occasion',
      label: 'Occasion & Lifestyle',
      tags: [
        'Comfort Food',
        'Elegant',
        'Freezer Friendly',
        'Make Ahead',
        'Meal Prep',
        'Party',
        'Picnic',
        'Quick',
        'Weeknight',
        'Kid Friendly',
        'Holiday',
      ],
    },
    {
      id: 'holiday',
      label: 'Holidays & Celebrations',
      tags: [
        'Christmas',
        'Thanksgiving',
        'Hanukkah',
        "New Year's",
        'Easter',
        "Valentine's Day",
        'Halloween',
        'Fourth of July',
        "Mother's Day",
        "Father's Day",
      ],
    },
    {
      id: 'technique',
      label: 'Technique & Prep',
      tags: ['Baked', 'Baking', 'No Bake', 'One Pan', 'One Pot', 'Stir Fry', 'Crispy', 'Frozen'],
    },
    {
      id: 'dish',
      label: 'Dish & Format',
      tags: ['Casserole', 'Pasta', 'Baked Pasta', 'Rice Bowl', 'Sandwich', 'Soup', 'Flatbread', 'Warm Salad', 'Cookies'],
    },
    {
      id: 'ingredients',
      label: 'Flavor',
      tags: ['Bright', 'Earthy', 'Nutty', 'Rich', 'Savory', 'Spicy', 'Sweet', 'Sweet & Savory', 'Tropical'],
    },
  ];

  const TAG_CATEGORY_LOOKUP = new Map();
  TAG_CATEGORY_DEFINITIONS.forEach((group) => {
    group.tags.forEach((tag) => {
      if (!TAG_CATEGORY_LOOKUP.has(tag)) {
        TAG_CATEGORY_LOOKUP.set(tag, group.id);
      }
      registerCanonicalTag(tag, [tag]);
    });
  });

  TAG_SYNONYM_DEFINITIONS.forEach(({ canonical, tags }) => {
    const groupId = TAG_CATEGORY_LOOKUP.get(canonical);
    if (!groupId) return;
    tags.forEach((tag) => {
      if (!TAG_CATEGORY_LOOKUP.has(tag)) {
        TAG_CATEGORY_LOOKUP.set(tag, groupId);
      }
    });
  });

  const ensureCanonicalTag = (value) => {
    const mapped = tagToCanonical.get(value);
    if (mapped) {
      registerCanonicalTag(mapped, [value]);
      return mapped;
    }
    registerCanonicalTag(value, [value]);
    return value;
  };

  const createTagGroups = (options) => {
    const baseGroups = TAG_CATEGORY_DEFINITIONS.map((group) => ({
      id: group.id,
      label: group.label,
      options: [],
    }));
    const defaultGroup = { id: 'other', label: 'Other Tags', options: [] };
    const groupIndex = new Map(baseGroups.map((group) => [group.id, group]));
    const canonicalEntries = new Map();

    const recordCanonicalOption = (canonical, tag, groupId) => {
      if (!canonical) return;
      const entry = canonicalEntries.get(canonical) || {
        tags: new Set(),
        groupIds: new Set(),
      };
      if (tag) entry.tags.add(tag);
      if (groupId) entry.groupIds.add(groupId);
      canonicalEntries.set(canonical, entry);
    };

    options.forEach((tag) => {
      const canonical = ensureCanonicalTag(tag);
      const groupId = TAG_CATEGORY_LOOKUP.get(tag);
      recordCanonicalOption(canonical, tag, groupId);
    });

    TAG_SYNONYM_DEFINITIONS.forEach(({ canonical, tags }) => {
      const groupId = TAG_CATEGORY_LOOKUP.get(canonical);
      tags.forEach((tag) => {
        recordCanonicalOption(canonical, tag, groupId);
      });
    });

    ALWAYS_AVAILABLE_TAGS.forEach((tag) => {
      const canonical = ensureCanonicalTag(tag);
      const groupId = TAG_CATEGORY_LOOKUP.get(canonical) || TAG_CATEGORY_LOOKUP.get(tag);
      recordCanonicalOption(canonical, tag, groupId);
    });

    canonicalEntries.forEach((entry, canonical) => {
      const actualTags = Array.from(canonicalTagLookup.get(canonical) || entry.tags || []);
      if (!actualTags.length) return;
      const preferredGroupId = Array.from(entry.groupIds).find((id) => groupIndex.has(id));
      const fallbackGroupId = actualTags
        .map((tag) => TAG_CATEGORY_LOOKUP.get(tag))
        .find((id) => id && groupIndex.has(id));
      const target = (preferredGroupId && groupIndex.get(preferredGroupId))
        || (fallbackGroupId && groupIndex.get(fallbackGroupId))
        || defaultGroup;
      if (!target) return;
      target.options.push({ value: canonical, label: canonical, tags: actualTags });
    });

    const populatedGroups = baseGroups
      .filter((group) => group.options.length > 0)
      .map((group) => ({
        ...group,
        options: group.options.sort((a, b) => a.label.localeCompare(b.label)),
      }));
    if (defaultGroup.options.length) {
      populatedGroups.push({
        ...defaultGroup,
        options: defaultGroup.options.sort((a, b) => a.label.localeCompare(b.label)),
      });
    }
    return populatedGroups;
  };

  const excludedTags = new Set();
  equipmentOptions.forEach((item) => excludedTags.add(item));
  const tagOptions = rawTagOptions.filter((tag) => !excludedTags.has(tag));
  const mealTagGroups = createTagGroups(tagOptions);

  const allergyDefaults = ['dairy', 'gluten', 'eggs', 'nuts', 'soy', 'fish', 'shellfish'];
  const allergyOptions = Array.from(
    new Set([
      ...allergyDefaults,
      ...recipes.flatMap((recipe) => (Array.isArray(recipe.allergens) ? recipe.allergens : [])),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const categoryOrder = (() => {
    const seen = new Set();
    const order = ['All'];
    ingredients.forEach((ingredient) => {
      if (!seen.has(ingredient.category)) {
        seen.add(ingredient.category);
        order.push(ingredient.category);
      }
    });
    return order;
  })();

  const categoryRanks = new Map();
  categoryOrder.slice(1).forEach((category, index) => {
    categoryRanks.set(category, index);
  });

  const ingredientCategoryOptions = categoryOrder.slice(1);
  const ingredientTagSet = new Set(
    ingredients.flatMap((ingredient) =>
      Array.isArray(ingredient.tags) ? ingredient.tags.map((tag) => String(tag)) : [],
    ),
  );
  const ingredientTagsSorted = Array.from(ingredientTagSet).sort((a, b) => a.localeCompare(b));
  const allergenTagPattern = /(contains|free)/i;
  const pantryAllergenOptions = ingredientTagsSorted.filter((tag) => allergenTagPattern.test(tag));
  const pantryTagOptions = ingredientTagsSorted.filter((tag) => !allergenTagPattern.test(tag));

  const INGREDIENT_FILTER_GROUPS = [
    { id: 'protein', label: 'Protein', categories: ['Meat', 'Seafood'] },
    { id: 'legumes', label: 'Legumes and Plant Proteins', categories: ['Legume', 'Plant Protein'] },
    { id: 'vegetables', label: 'Vegetables', categories: ['Vegetable'] },
    { id: 'fruits', label: 'Fruits', categories: ['Fruit'] },
    { id: 'pasta-grains', label: 'Pasta & Grains', categories: ['Pasta', 'Grain'] },
    { id: 'dairy-eggs', label: 'Dairy & Eggs', categories: ['Dairy', 'Dairy Alternative'] },
    { id: 'baking', label: 'Baking Essentials', categories: ['Baking', 'Baking Alternative'] },
    { id: 'herbs-spices', label: 'Herbs & Spices', categories: ['Herb', 'Spice'] },
    { id: 'nuts-seeds', label: 'Nuts & Seeds', categories: ['Nut/Seed'] },
    { id: 'oils-condiments', label: 'Oils & Condiments', categories: ['Oil/Fat', 'Condiment/Sauce'] },
    { id: 'sweeteners', label: 'Sweeteners', categories: ['Sweetener'] },
    { id: 'broths-beverages', label: 'Broths & Beverages', categories: ['Beverage'] },
  ];

  const proteinFilterDefinitions = createProteinBaseDefinitions(ingredients);
  const proteinMatcherIngredients = proteinFilterDefinitions.map((definition) => definition.matcherIngredient);
  const matcherIngredients = ingredients.concat(proteinMatcherIngredients);
  const ingredientMatcherIndex = createIngredientMatcherIndex(matcherIngredients);
  let { recipeIngredientMatches, ingredientUsage } = mapRecipesToIngredientMatches(
    recipes,
    ingredientMatcherIndex,
  );
  const ingredientBySlug = new Map(
    ingredients.map((ingredient) => (ingredient && ingredient.slug ? [ingredient.slug, ingredient] : null)).filter(
      Boolean,
    ),
  );

  const SUBSTITUTION_DEFINITIONS = [
    {
      id: 'dairy-milk-alternatives',
      label: 'Milk & Dairy-Free Alternatives',
      primary: ['dairy-milk-whole', 'dairy-milk-2', 'dairy-milk-skim', 'dairy-lactose-free-milk', 'dairy-goat-milk'],
      alternatives: ['bev-coconut-milk', 'alt-milk-almond', 'alt-milk-oat', 'alt-milk-soy', 'alt-milk-pea'],
      bidirectional: true,
    },
    {
      id: 'dairy-butter-alternatives',
      label: 'Butter & Plant Fats',
      primary: ['dairy-butter-unsalted', 'dairy-butter-salted', 'dairy-ghee'],
      alternatives: ['alt-butter-vegan', 'oil-coconut', 'oil-olive-extra-virgin', 'oil-avocado'],
      bidirectional: true,
    },
    {
      id: 'dairy-cream-alternatives',
      label: 'Cream & Dairy-Free Alternatives',
      primary: ['dairy-cream-heavy', 'dairy-cream-sour', 'dairy-half-and-half', 'dairy-yogurt-plain', 'dairy-yogurt-greek'],
      alternatives: ['alt-cream-cashew', 'alt-yogurt-coconut', 'bev-coconut-milk'],
      bidirectional: true,
    },
    {
      id: 'dairy-cheese-alternatives',
      label: 'Cheese & Vegan Alternatives',
      primary: [
        'dairy-cheese-cheddar',
        'dairy-cheese-mozzarella',
        'dairy-cheese-parmesan',
        'dairy-cheese-ricotta',
        'dairy-cheese-feta',
        'dairy-cheese-monterey-jack',
        'dairy-cheese-queso-fresco',
      ],
      alternatives: ['alt-cheese-vegan', 'alt-cream-cashew'],
      bidirectional: true,
    },
    {
      id: 'egg-alternatives',
      label: 'Egg Substitutions',
      primary: ['baking-egg'],
      alternatives: ['alt-egg-flax', 'alt-egg-chia', 'alt-egg-applesauce', 'alt-egg-aquafaba'],
    },
    {
      id: 'flour-alternatives',
      label: 'Flour & Gluten-Free Alternatives',
      primary: ['grain-wheat-flour-ap'],
      alternatives: ['alt-flour-almond', 'alt-flour-coconut', 'alt-flour-cassava', 'grain-quinoa', 'grain-rice-basmati', 'grain-rice-brown', 'grain-oats-gf', 'veg-cauliflower-rice'],
    },
    {
      id: 'pasta-alternatives',
      label: 'Pasta & Grain Alternatives',
      primary: [
        'pasta-spaghetti',
        'pasta-penne',
        'pasta-fusilli',
        'pasta-linguine',
        'pasta-macaroni',
        'pasta-egg-noodles',
        'pasta-farfalle',
        'pasta-lasagna-noodles',
        'pasta-orzo',
        'pasta-campanelle',
        'pasta-bucatini',
        'pasta-tagliatelle',
        'pasta-gemelli',
        'pasta-cavatappi',
        'pasta-ditalini',
        'pasta-rice-noodles',
        'pasta-gluten-free-blend',
        'pasta-chickpea',
        'noodle-glass',
        'noodle-udon',
        'noodle-somen',
      ],
      alternatives: ['grain-quinoa', 'veg-cauliflower-rice', 'grain-rice-basmati', 'grain-rice-brown'],
    },
    {
      id: 'soy-sauce-alternatives',
      label: 'Soy Sauce Alternatives',
      primary: ['condiment-soy-sauce', 'condiment-tamari-gf'],
      alternatives: ['condiment-coconut-aminos', 'condiment-worcestershire'],
    },
    {
      id: 'nut-seed-spreads',
      label: 'Nut & Seed Spreads',
      primary: ['nut-peanut', 'legume-peanut', 'nuts-cashew-butter', 'nuts-hazelnut-butter'],
      alternatives: ['nuts-sunflower-butter', 'condiment-sunflower-seed-butter', 'seed-sunflower', 'seed-flax', 'seed-chia', 'nut-almond'],
      bidirectional: true,
    },
    {
      id: 'shellfish-alternatives',
      label: 'Shellfish Alternatives',
      primary: [
        'seafood-shrimp',
        'seafood-scallops',
        'seafood-mussels',
        'seafood-crab',
        'seafood-lobster',
        'seafood-clams',
        'seafood-calamari',
        'seafood-octopus',
      ],
      alternatives: ['seafood-cod', 'seafood-salmon', 'veg-hearts-of-palm', 'fruit-jackfruit-young', 'legume-chickpea'],
    },
    {
      id: 'fish-alternatives',
      label: 'Fish Alternatives',
      primary: [
        'seafood-salmon',
        'seafood-tuna',
        'seafood-halibut',
        'seafood-tilapia',
        'seafood-cod',
        'seafood-arctic-char',
        'seafood-rainbow-trout',
        'seafood-barramundi',
        'seafood-swordfish',
        'seafood-monkfish',
      ],
      alternatives: ['veg-hearts-of-palm', 'fruit-jackfruit-young', 'legume-chickpea'],
    },
    {
      id: 'soy-protein-alternatives',
      label: 'Soy Proteins & Alternatives',
      primary: ['legume-tofu-extra-firm', 'legume-tempeh', 'legume-textured-vegetable-protein'],
      alternatives: ['legume-chickpea', 'legume-black-beans', 'fruit-jackfruit-young', 'veg-hearts-of-palm'],
    },
  ];

  const substitutionGraph = (() => {
    const graph = new Map();
    SUBSTITUTION_DEFINITIONS.forEach(({ label, primary, alternatives, bidirectional }) => {
      const validPrimary = (Array.isArray(primary) ? primary : [])
        .map((slug) => (ingredientBySlug.has(slug) ? slug : null))
        .filter(Boolean);
      const validAlternatives = (Array.isArray(alternatives) ? alternatives : [])
        .map((slug) => (ingredientBySlug.has(slug) ? slug : null))
        .filter(Boolean);
      if (!validPrimary.length || (validPrimary.length + validAlternatives.length) < 2) {
        return;
      }
      const membersForPrimary = new Set([...validPrimary, ...validAlternatives]);
      validPrimary.forEach((slug) => {
        let entry = graph.get(slug);
        if (!entry) {
          entry = { label, members: new Set() };
          graph.set(slug, entry);
        }
        membersForPrimary.forEach((member) => entry.members.add(member));
        if (!entry.label && label) {
          entry.label = label;
        }
      });
      if (bidirectional && validAlternatives.length) {
        const membersForAlternatives = new Set([...validAlternatives, ...validPrimary]);
        validAlternatives.forEach((slug) => {
          let entry = graph.get(slug);
          if (!entry) {
            entry = { label, members: new Set() };
            graph.set(slug, entry);
          }
          membersForAlternatives.forEach((member) => entry.members.add(member));
          if (!entry.label && label) {
            entry.label = label;
          }
        });
      }
    });
    return graph;
  })();

  const generatedIngredientCoverage = ensureIngredientCoverage(
    recipes,
    ingredients,
    ingredientUsage,
    recipeLookupById,
    recipeLookupByName,
  );
  if (generatedIngredientCoverage.length) {
    recipes.push(...generatedIngredientCoverage);
    ({ recipeIngredientMatches, ingredientUsage } = mapRecipesToIngredientMatches(
      recipes,
      ingredientMatcherIndex,
    ));
  }

  const generatedDietCoverage = ensureDietTemplateRecipes(
    recipes,
    recipeLookupById,
    recipeLookupByName,
    ingredientBySlug,
  );
  if (generatedDietCoverage.length) {
    recipes.push(...generatedDietCoverage);
    ({ recipeIngredientMatches, ingredientUsage } = mapRecipesToIngredientMatches(
      recipes,
      ingredientMatcherIndex,
    ));
  }

  const generatedProteinCoverage = ensureProteinTemplateRecipes(
    recipes,
    proteinFilterDefinitions,
    recipeIngredientMatches,
    recipeLookupById,
    recipeLookupByName,
    ingredientBySlug,
  );
  if (generatedProteinCoverage.length) {
    recipes.push(...generatedProteinCoverage);
    ({ recipeIngredientMatches, ingredientUsage } = mapRecipesToIngredientMatches(
      recipes,
      ingredientMatcherIndex,
    ));
  }

  const generatedMenuRegionalCoverage = ensureMenuRegionalTemplateRecipes(
    recipes,
    recipeLookupById,
    recipeLookupByName,
    ingredientBySlug,
  );
  if (generatedMenuRegionalCoverage.length) {
    recipes.push(...generatedMenuRegionalCoverage);
    ({ recipeIngredientMatches, ingredientUsage } = mapRecipesToIngredientMatches(
      recipes,
      ingredientMatcherIndex,
    ));
  }

  const proteinOptionsByCategory = new Map();
  proteinFilterDefinitions
    .filter((definition) => ingredientUsage.get(definition.slug))
    .forEach(({ slug, label, category }) => {
      const key = category || 'Meat';
      if (!proteinOptionsByCategory.has(key)) {
        proteinOptionsByCategory.set(key, []);
      }
      proteinOptionsByCategory.get(key).push({ slug, label });
    });

  const proteinFilterSections = PROTEIN_SECTION_ORDER.map((category) => {
    const options = (proteinOptionsByCategory.get(category) || []).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
    return { id: category.toLowerCase(), label: getProteinSectionLabel(category), options };
  }).filter((section) => section.options.length);

  const ingredientFilterGroups = INGREDIENT_FILTER_GROUPS.map((group) => {
    if (group.id === 'protein') {
      return { id: group.id, label: group.label, sections: proteinFilterSections };
    }
    const options = ingredients
      .filter(
        (ingredient) =>
          group.categories.includes(ingredient.category) && ingredientUsage.get(ingredient.slug),
      )
      .map((ingredient) => ({ slug: ingredient.slug, label: ingredient.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return { id: group.id, label: group.label, options };
  }).filter((group) => {
    if (Array.isArray(group.sections)) {
      return group.sections.some((section) => Array.isArray(section.options) && section.options.length);
    }
    return Array.isArray(group.options) && group.options.length;
  });

  const PANTRY_UNITS = [
    'each',
    'oz',
    'gram',
    'kilogram',
    'pound',
    'tsp',
    'tbsp',
    'cup',
    'quart',
    'liter',
    'ml',
    'jar',
    'box',
    'bag',
    'can',
    'bottle',
    'pack',
  ];

  const DEFAULT_PANTRY_UNIT = 'each';

  const MEASUREMENT_CONVERSIONS = {
    metric: {
      cup: { unit: 'mL', factor: 240 },
      cups: { unit: 'mL', factor: 240 },
      tablespoon: { unit: 'mL', factor: 15 },
      tablespoons: { unit: 'mL', factor: 15 },
      tbsp: { unit: 'mL', factor: 15 },
      teaspoon: { unit: 'mL', factor: 5 },
      teaspoons: { unit: 'mL', factor: 5 },
      tsp: { unit: 'mL', factor: 5 },
      ounce: { unit: 'g', factor: 28.3495 },
      ounces: { unit: 'g', factor: 28.3495 },
      oz: { unit: 'g', factor: 28.3495 },
      pound: { unit: 'g', factor: 453.592 },
      pounds: { unit: 'g', factor: 453.592 },
      lb: { unit: 'g', factor: 453.592 },
      lbs: { unit: 'g', factor: 453.592 },
      quart: { unit: 'mL', factor: 946.353 },
      quarts: { unit: 'mL', factor: 946.353 },
      pint: { unit: 'mL', factor: 473.176 },
      pints: { unit: 'mL', factor: 473.176 },
      gallon: { unit: 'L', factor: 3.78541 },
      gallons: { unit: 'L', factor: 3.78541 },
    },
    imperial: {
      gram: { unit: 'oz', factor: 0.035274 },
      grams: { unit: 'oz', factor: 0.035274 },
      g: { unit: 'oz', factor: 0.035274 },
      kilogram: { unit: 'lb', factor: 2.20462 },
      kilograms: { unit: 'lb', factor: 2.20462 },
      kg: { unit: 'lb', factor: 2.20462 },
      liter: { unit: 'cups', factor: 4.22675 },
      liters: { unit: 'cups', factor: 4.22675 },
      l: { unit: 'cups', factor: 4.22675 },
      milliliter: { unit: 'tsp', factor: 0.202884 },
      milliliters: { unit: 'tsp', factor: 0.202884 },
      ml: { unit: 'tsp', factor: 0.202884 },
    },
  };

  const MEASUREMENT_DISPLAY_PRECISION = {
    g: 0,
    ml: 1,
    l: 2,
    oz: 2,
    lb: 2,
    cups: 2,
    tsp: 1,
  };

  const checkboxRegistry = {
    meals: {
      ingredients: new Map(),
      tags: new Map(),
      allergies: new Map(),
      equipment: new Map(),
    },
    pantry: {
      categories: new Map(),
      tags: new Map(),
      allergens: new Map(),
    },
    kitchen: {},
  };

  const tagGroupSummaryRegistry = {
    meals: [],
    pantry: [],
    kitchen: [],
  };

  const elements = {};

  const holidayThemeDialogState = {
    root: null,
    panel: null,
    list: null,
    checkboxes: new Map(),
    previousFocus: null,
    backdrop: null,
    cancelButton: null,
    saveButton: null,
  };

  const scheduleDialogState = {
    root: null,
    form: null,
    recipeLabel: null,
    dateInput: null,
    timeInput: null,
    lastTimeValue: '',
    memberContainer: null,
    guestInput: null,
    selectedMembers: null,
    lastSelectedMembers: null,
    lastGuestCount: 0,
    currentRecipe: null,
  };

  const dayModalState = {
    root: null,
    backdrop: null,
    closeButton: null,
    body: null,
    title: null,
    subtitle: null,
    previousFocus: null,
    isOpen: false,
    requestedIso: null,
  };

  const closeRecipeScheduleDialog = () => {
    if (!scheduleDialogState.root) {
      return;
    }
    scheduleDialogState.root.hidden = true;
    scheduleDialogState.root.removeAttribute('data-open');
    scheduleDialogState.currentRecipe = null;
    document.removeEventListener('keydown', handleScheduleDialogKeydown);
  };

  const handleScheduleDialogKeydown = (event) => {
    if (event.key === 'Escape') {
      closeRecipeScheduleDialog();
    }
  };

  const renderScheduleDialogMembers = () => {
    const container = scheduleDialogState.memberContainer;
    if (!container) {
      return;
    }
    container.innerHTML = '';
    const members = Array.isArray(state.familyMembers) ? state.familyMembers : [];
    if (scheduleDialogState.selectedMembers instanceof Set) {
      const availableIds = new Set(members.map((member) => member?.id).filter(Boolean));
      scheduleDialogState.selectedMembers = new Set(
        Array.from(scheduleDialogState.selectedMembers).filter((id) => availableIds.has(id)),
      );
    }
    if (!members.length) {
      const empty = document.createElement('p');
      empty.className = 'schedule-dialog__members-empty';
      empty.textContent = 'Add family members from the Family menu to assign meals.';
      container.appendChild(empty);
      return;
    }
    members.forEach((member) => {
      if (!member || !member.id) {
        return;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'schedule-dialog__member';
      button.dataset.scheduleMember = member.id;
      button.title = member.name;
      const icon = document.createElement('span');
      icon.className = 'schedule-dialog__member-icon';
      icon.textContent = member.icon || '👤';
      const name = document.createElement('span');
      name.className = 'schedule-dialog__member-name';
      name.textContent = member.name;
      if (scheduleDialogState.selectedMembers instanceof Set && scheduleDialogState.selectedMembers.has(member.id)) {
        button.classList.add('schedule-dialog__member--active');
      }
      button.appendChild(icon);
      button.appendChild(name);
      container.appendChild(button);
    });
  };

  const submitRecipeScheduleDialog = () => {
    const { currentRecipe, dateInput, timeInput, guestInput } = scheduleDialogState;
    if (!currentRecipe || !dateInput || !timeInput) {
      return;
    }
    const dateValue = dateInput.value;
    if (!isValidISODateString(dateValue)) {
      dateInput.focus();
      return;
    }
    const timeValue = normalizeMealPlanTime(timeInput.value);
    if (!timeValue) {
      timeInput.focus();
      return;
    }
    const recipeTitle = typeof currentRecipe.name === 'string' ? currentRecipe.name : '';
    const members = Array.from(scheduleDialogState.selectedMembers || []);
    const guests = guestInput
      ? Math.max(0, parseNonNegativeInteger(guestInput.value, 0))
      : 0;
    const metadata = {
      recipeId: typeof currentRecipe.id === 'string' ? currentRecipe.id : undefined,
      attendance: { members, guests },
    };
    const added = addMealPlanEntry(dateValue, 'meal', recipeTitle, timeValue, metadata);
    if (!added) {
      return;
    }
    scheduleDialogState.lastTimeValue = timeValue;
    scheduleDialogState.lastSelectedMembers = members;
    scheduleDialogState.lastGuestCount = guests;
    setMealPlanSelectedDate(dateValue);
    closeRecipeScheduleDialog();
    if (state.activeView === 'meal-plan') {
      renderMealPlan();
    }
  };

  const refreshScheduleDialogMembersIfOpen = () => {
    if (scheduleDialogState.root && scheduleDialogState.root.dataset.open === 'true') {
      renderScheduleDialogMembers();
    }
  };

  const renderFamilyPanel = () => {
    if (!elements.familyMemberList) {
      return;
    }
    let focusState = null;
    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLInputElement
      || activeElement instanceof HTMLTextAreaElement
      || activeElement instanceof HTMLSelectElement
    ) {
      const card = activeElement.closest('[data-family-id]');
      const field = activeElement.dataset.familyField;
      if (card && field) {
        focusState = {
          memberId: card.dataset.familyId,
          field,
          start: 'selectionStart' in activeElement ? activeElement.selectionStart ?? 0 : 0,
          end: 'selectionEnd' in activeElement ? activeElement.selectionEnd ?? 0 : 0,
        };
      }
    }
    const members = ensureFamilySanitized();
    elements.familyMemberList.innerHTML = '';
    if (!members.length) {
      const empty = document.createElement('p');
      empty.className = 'family-panel__empty';
      empty.textContent = 'No family members yet. Add someone to personalize your plans.';
      elements.familyMemberList.appendChild(empty);
      return;
    }
    const buildToggleField = (labelText, fieldName, optionList, selectedValues, formatExtraLabel) => {
      const field = document.createElement('div');
      field.className = 'family-member-card__field family-member-card__field--toggles';
      const label = document.createElement('span');
      label.textContent = labelText;
      field.appendChild(label);

      const group = document.createElement('div');
      group.className = 'family-toggle-group';
      field.appendChild(group);

      const selectedLookup = new Map();
      if (Array.isArray(selectedValues)) {
        selectedValues.forEach((entry) => {
          if (typeof entry !== 'string') {
            return;
          }
          const key = entry.trim().toLowerCase();
          if (key) {
            selectedLookup.set(key, entry);
          }
        });
      }

      const seen = new Set();
      const finalOptions = [];
      optionList.forEach((option) => {
        if (!option || typeof option.value !== 'string') {
          return;
        }
        const value = option.value;
        const key = value.trim().toLowerCase();
        if (!key || seen.has(key)) {
          return;
        }
        seen.add(key);
        finalOptions.push({
          value,
          label: typeof option.label === 'string' && option.label ? option.label : value,
        });
      });
      if (Array.isArray(selectedValues)) {
        selectedValues.forEach((entry) => {
          if (typeof entry !== 'string') {
            return;
          }
          const key = entry.trim().toLowerCase();
          if (!key || seen.has(key)) {
            return;
          }
          seen.add(key);
          finalOptions.push({
            value: entry,
            label:
              typeof formatExtraLabel === 'function'
                ? formatExtraLabel(entry)
                : entry,
          });
        });
      }

      finalOptions.forEach((option) => {
        const toggleLabel = document.createElement('label');
        toggleLabel.className = 'family-toggle';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'family-toggle__checkbox';
        checkbox.dataset.familyField = fieldName;
        checkbox.value = option.value;
        const normalizedKey = option.value.trim().toLowerCase();
        const isChecked = normalizedKey ? selectedLookup.has(normalizedKey) : false;
        checkbox.checked = isChecked;
        const text = document.createElement('span');
        text.className = 'family-toggle__label';
        text.textContent = option.label;
        toggleLabel.appendChild(checkbox);
        toggleLabel.appendChild(text);
        if (isChecked) {
          toggleLabel.classList.add('family-toggle--active');
        }
        group.appendChild(toggleLabel);
      });

      return field;
    };
    members.forEach((member, index) => {
      if (!member || !member.id) {
        return;
      }
      const card = document.createElement('article');
      card.className = 'family-member-card';
      card.dataset.familyId = member.id;

      const header = document.createElement('div');
      header.className = 'family-member-card__header';
      const avatar = document.createElement('span');
      avatar.className = 'family-member-card__avatar';
      avatar.textContent = member.icon || '👤';
      header.appendChild(avatar);

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'family-member-card__name';
      nameInput.value = member.name || `Member ${index + 1}`;
      nameInput.placeholder = 'Name';
      nameInput.dataset.familyField = 'name';
      card.appendChild(header);
      header.appendChild(nameInput);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'family-member-card__remove';
      removeButton.dataset.removeFamily = member.id;
      removeButton.textContent = 'Remove';
      header.appendChild(removeButton);

      const fieldGrid = document.createElement('div');
      fieldGrid.className = 'family-member-card__fields';

      const iconField = document.createElement('label');
      iconField.className = 'family-member-card__field';
      const iconLabel = document.createElement('span');
      iconLabel.textContent = 'Icon';
      const iconSelect = document.createElement('select');
      iconSelect.className = 'family-member-card__icon-select';
      iconSelect.dataset.familyField = 'icon';
      FAMILY_ICON_OPTIONS.forEach((icon) => {
        const option = document.createElement('option');
        option.value = icon;
        option.textContent = icon;
        if (icon === member.icon) {
          option.selected = true;
        }
        iconSelect.appendChild(option);
      });
      iconField.appendChild(iconLabel);
      iconField.appendChild(iconSelect);
      fieldGrid.appendChild(iconField);

      const caloriesField = document.createElement('label');
      caloriesField.className = 'family-member-card__field';
      const caloriesLabel = document.createElement('span');
      caloriesLabel.textContent = 'Target calories';
      const caloriesInput = document.createElement('input');
      caloriesInput.type = 'number';
      caloriesInput.min = '0';
      caloriesInput.step = '50';
      caloriesInput.placeholder = 'e.g. 2000';
      caloriesInput.value =
        typeof member.targetCalories === 'number' && Number.isFinite(member.targetCalories)
          ? String(member.targetCalories)
          : '';
      caloriesInput.dataset.familyField = 'targetCalories';
      caloriesField.appendChild(caloriesLabel);
      caloriesField.appendChild(caloriesInput);
      fieldGrid.appendChild(caloriesField);

      const birthdayField = document.createElement('label');
      birthdayField.className = 'family-member-card__field';
      const birthdayLabel = document.createElement('span');
      birthdayLabel.textContent = 'Birthday';
      const birthdayInput = document.createElement('input');
      birthdayInput.type = 'date';
      birthdayInput.dataset.familyField = 'birthday';
      birthdayInput.value = isValidISODateString(member.birthday) ? member.birthday : '';
      birthdayField.appendChild(birthdayLabel);
      birthdayField.appendChild(birthdayInput);
      fieldGrid.appendChild(birthdayField);

      const dietsField = buildToggleField(
        'Diets',
        'diets',
        FAMILY_DIET_OPTIONS.map((value) => ({ value, label: value })),
        Array.isArray(member.diets) ? member.diets : [],
      );
      fieldGrid.appendChild(dietsField);

      const allergiesField = buildToggleField(
        'Allergies',
        'allergies',
        allergyOptions.map((value) => ({ value, label: formatAllergenLabel(value) })),
        Array.isArray(member.allergies) ? member.allergies : [],
        formatAllergenLabel,
      );
      fieldGrid.appendChild(allergiesField);

      const preferencesField = document.createElement('label');
      preferencesField.className = 'family-member-card__field family-member-card__field--textarea';
      const preferencesLabel = document.createElement('span');
      preferencesLabel.textContent = 'Preferences & notes';
      const preferencesInput = document.createElement('textarea');
      preferencesInput.rows = 2;
      preferencesInput.placeholder = 'Favorite flavors, dislikes, or reminders';
      preferencesInput.value = member.preferences || '';
      preferencesInput.dataset.familyField = 'preferences';
      preferencesField.appendChild(preferencesLabel);
      preferencesField.appendChild(preferencesInput);
      fieldGrid.appendChild(preferencesField);

      card.appendChild(fieldGrid);
      elements.familyMemberList.appendChild(card);
    });

    if (focusState) {
      const selector = `.family-member-card[data-family-id="${focusState.memberId}"] [data-family-field="${focusState.field}"]`;
      const restored = elements.familyMemberList.querySelector(selector);
      if (restored instanceof HTMLInputElement || restored instanceof HTMLTextAreaElement) {
        restored.focus();
        if (typeof restored.setSelectionRange === 'function') {
          const start = focusState.start ?? restored.value.length;
          const end = focusState.end ?? start;
          try {
            restored.setSelectionRange(start, end);
          } catch (error) {
            // ignore selection errors for inputs that do not support it
          }
        }
      } else if (restored instanceof HTMLSelectElement) {
        restored.focus();
      }
    }
  };

  const handleFamilyPanelKeydown = (event) => {
    if (event.key === 'Escape') {
      closeFamilyPanel();
    }
  };

  const openFamilyPanel = () => {
    if (!elements.familyPanel) {
      return;
    }
    renderFamilyPanel();
    elements.familyPanel.hidden = false;
    elements.familyPanel.dataset.open = 'true';
    document.addEventListener('keydown', handleFamilyPanelKeydown);
    window.requestAnimationFrame(() => {
      const firstInput = elements.familyPanel?.querySelector('.family-member-card__name');
      if (firstInput instanceof HTMLElement) {
        firstInput.focus();
      } else {
        elements.familyAddButton?.focus();
      }
    });
  };

  const closeFamilyPanel = () => {
    if (!elements.familyPanel) {
      return;
    }
    elements.familyPanel.hidden = true;
    elements.familyPanel.removeAttribute('data-open');
    document.removeEventListener('keydown', handleFamilyPanelKeydown);
  };

  const applyFamilyUpdate = (updater) => {
    const members = Array.isArray(state.familyMembers) ? state.familyMembers.slice() : [];
    const updated = updater(members);
    if (!updated) {
      return false;
    }
    const sanitized = sanitizeFamilyMembers(updated);
    const beforeMembers = JSON.stringify(state.familyMembers);
    const beforeFilter = JSON.stringify(state.mealPlanMemberFilter || []);
    const beforeSelection = state.mealPlanMacroSelection;
    const afterMembers = JSON.stringify(sanitized);
    const nextFilter = sanitizeMealPlanMemberFilter(state.mealPlanMemberFilter, sanitized);
    const afterFilter = JSON.stringify(nextFilter);
    const nextSelection = sanitizeMealPlanMacroSelection(beforeSelection, sanitized);
    state.familyMembers = sanitized;
    state.mealPlanMemberFilter = nextFilter;
    state.mealPlanMacroSelection = nextSelection;
    const selectionChanged = nextSelection !== beforeSelection;
    if (afterMembers !== beforeMembers || afterFilter !== beforeFilter || selectionChanged) {
      persistAppState();
    }
    refreshScheduleDialogMembersIfOpen();
    return afterMembers !== beforeMembers || afterFilter !== beforeFilter || selectionChanged;
  };

  const addFamilyMember = () => {
    const newMember = createFamilyMember({ name: `Member ${state.familyMembers.length + 1}` });
    applyFamilyUpdate((members) => [...members, newMember]);
    renderFamilyPanel();
    if (state.activeView === 'meal-plan') {
      renderMealPlan();
    }
    window.requestAnimationFrame(() => {
      const selector = `.family-member-card[data-family-id="${newMember.id}"] .family-member-card__name`;
      const input = elements.familyPanel?.querySelector(selector);
      if (input instanceof HTMLElement) {
        input.focus();
        input.select?.();
      }
    });
  };

  const updateFamilyMember = (memberId, field, value, options = {}) => {
    if (!memberId || !field) {
      return;
    }
    const changed = applyFamilyUpdate((members) => {
      const index = members.findIndex((member) => member.id === memberId);
      if (index === -1) {
        return members;
      }
      const next = { ...members[index] };
      if (field === 'name') {
        next.name = typeof value === 'string' ? value : '';
      } else if (field === 'icon') {
        next.icon = typeof value === 'string' ? value : next.icon;
      } else if (field === 'targetCalories') {
        const numeric = Number(value);
        next.targetCalories = Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
      } else if (field === 'diets') {
        next.diets = normalizeStringArray(value);
      } else if (field === 'allergies') {
        next.allergies = normalizeStringArray(value);
      } else if (field === 'birthday') {
        next.birthday = typeof value === 'string' && isValidISODateString(value) ? value : '';
      } else if (field === 'preferences') {
        next.preferences = typeof value === 'string' ? value : '';
      }
      members[index] = next;
      return members;
    });
    if (options.skipRender) {
      return;
    }
    renderFamilyPanel();
    if (state.activeView === 'meal-plan') {
      renderMealPlan();
    }
  };

  const removeFamilyMember = (memberId) => {
    if (!memberId) {
      return;
    }
    const changed = applyFamilyUpdate((members) => members.filter((member) => member.id !== memberId));
    if (!changed) {
      renderFamilyPanel();
      return;
    }
    if (Array.isArray(scheduleDialogState.lastSelectedMembers)) {
      scheduleDialogState.lastSelectedMembers = scheduleDialogState.lastSelectedMembers.filter(
        (id) => id !== memberId,
      );
    }
    if (scheduleDialogState.selectedMembers instanceof Set) {
      scheduleDialogState.selectedMembers.delete(memberId);
    }
    let mealPlanChanged = false;
    Object.entries(state.mealPlan).forEach(([dateKey, entries]) => {
      if (!Array.isArray(entries)) {
        return;
      }
      let entryChanged = false;
      entries.forEach((entry) => {
        const attendance = sanitizeMealPlanAttendance(entry.attendance ?? entry.servings);
        if (attendance.members.includes(memberId)) {
          attendance.members = attendance.members.filter((id) => id !== memberId);
          entry.attendance = attendance;
          entry.servings = attendance;
          entryChanged = true;
        }
      });
      if (entryChanged) {
        state.mealPlan[dateKey] = sortMealPlanEntries(entries);
        mealPlanChanged = true;
      }
    });
    if (mealPlanChanged) {
      persistMealPlan();
    }
    renderFamilyPanel();
    if (state.activeView === 'meal-plan') {
      renderMealPlan();
    }
  };

  const ensureRecipeScheduleDialog = () => {
    if (scheduleDialogState.root) {
      return scheduleDialogState;
    }
    const root = document.createElement('div');
    root.className = 'schedule-dialog';
    root.hidden = true;

    const form = document.createElement('form');
    form.className = 'schedule-dialog__panel';
    form.setAttribute('role', 'dialog');
    form.setAttribute('aria-modal', 'true');

    const title = document.createElement('h3');
    title.className = 'schedule-dialog__title';
    title.id = 'schedule-dialog-title';
    title.textContent = 'Add to calendar';
    form.appendChild(title);

    const recipeLabel = document.createElement('p');
    recipeLabel.className = 'schedule-dialog__recipe';
    recipeLabel.id = 'schedule-dialog-recipe';
    form.appendChild(recipeLabel);
    form.setAttribute('aria-labelledby', 'schedule-dialog-title');
    form.setAttribute('aria-describedby', 'schedule-dialog-recipe');

    const dateField = document.createElement('div');
    dateField.className = 'schedule-dialog__field';
    const dateLabel = document.createElement('label');
    dateLabel.className = 'schedule-dialog__label';
    dateLabel.setAttribute('for', 'schedule-dialog-date');
    dateLabel.textContent = 'Date';
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.required = true;
    dateInput.id = 'schedule-dialog-date';
    dateInput.className = 'schedule-dialog__input';
    dateField.appendChild(dateLabel);
    dateField.appendChild(dateInput);
    form.appendChild(dateField);

    const timeField = document.createElement('div');
    timeField.className = 'schedule-dialog__field';
    const timeLabel = document.createElement('label');
    timeLabel.className = 'schedule-dialog__label';
    timeLabel.setAttribute('for', 'schedule-dialog-time');
    timeLabel.textContent = 'Time';
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.required = true;
    timeInput.id = 'schedule-dialog-time';
    timeInput.className = 'schedule-dialog__input';
    timeField.appendChild(timeLabel);
    timeField.appendChild(timeInput);
    form.appendChild(timeField);

    const attendanceFieldset = document.createElement('fieldset');
    attendanceFieldset.className = 'schedule-dialog__fieldset';
    const attendanceLegend = document.createElement('legend');
    attendanceLegend.className = 'schedule-dialog__label';
    attendanceLegend.textContent = "Who's eating?";
    attendanceFieldset.appendChild(attendanceLegend);

    const memberContainer = document.createElement('div');
    memberContainer.className = 'schedule-dialog__members';
    attendanceFieldset.appendChild(memberContainer);

    const guestField = document.createElement('label');
    guestField.className = 'schedule-dialog__guest-field';
    guestField.setAttribute('for', 'schedule-dialog-guests');
    const guestLabel = document.createElement('span');
    guestLabel.textContent = 'Guests';
    const guestInput = document.createElement('input');
    guestInput.type = 'number';
    guestInput.min = '0';
    guestInput.step = '1';
    guestInput.id = 'schedule-dialog-guests';
    guestInput.className = 'schedule-dialog__guest-input';
    guestField.appendChild(guestLabel);
    guestField.appendChild(guestInput);
    attendanceFieldset.appendChild(guestField);

    form.appendChild(attendanceFieldset);

    memberContainer.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-schedule-member]') : null;
      if (!target) {
        return;
      }
      event.preventDefault();
      const { scheduleMember } = target.dataset;
      if (!scheduleMember) {
        return;
      }
      if (!(scheduleDialogState.selectedMembers instanceof Set)) {
        scheduleDialogState.selectedMembers = new Set();
      }
      if (scheduleDialogState.selectedMembers.has(scheduleMember)) {
        scheduleDialogState.selectedMembers.delete(scheduleMember);
        target.classList.remove('schedule-dialog__member--active');
      } else {
        scheduleDialogState.selectedMembers.add(scheduleMember);
        target.classList.add('schedule-dialog__member--active');
      }
    });

    guestInput.addEventListener('input', () => {
      const normalized = Math.max(0, parseNonNegativeInteger(guestInput.value, 0));
      guestInput.value = String(normalized);
    });

    const actions = document.createElement('div');
    actions.className = 'schedule-dialog__actions';
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'schedule-dialog__button';
    cancelButton.textContent = 'Cancel';
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'schedule-dialog__button schedule-dialog__button--primary';
    submitButton.textContent = 'Add to calendar';
    actions.appendChild(cancelButton);
    actions.appendChild(submitButton);
    form.appendChild(actions);

    root.appendChild(form);
    document.body.appendChild(root);

    root.addEventListener('click', (event) => {
      if (event.target === root) {
        closeRecipeScheduleDialog();
      }
    });

    cancelButton.addEventListener('click', () => {
      closeRecipeScheduleDialog();
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitRecipeScheduleDialog();
    });

    scheduleDialogState.root = root;
    scheduleDialogState.form = form;
    scheduleDialogState.recipeLabel = recipeLabel;
    scheduleDialogState.dateInput = dateInput;
    scheduleDialogState.timeInput = timeInput;
    scheduleDialogState.memberContainer = memberContainer;
    scheduleDialogState.guestInput = guestInput;

    return scheduleDialogState;
  };

  const openRecipeScheduleDialog = (recipe) => {
    if (!recipe) {
      return;
    }
    const dialog = ensureRecipeScheduleDialog();
    dialog.currentRecipe = recipe;
    const recipeTitle = typeof recipe.name === 'string' ? recipe.name : 'Recipe';
    if (dialog.recipeLabel) {
      dialog.recipeLabel.textContent = recipeTitle;
    }
    const defaultDate = isValidISODateString(state.mealPlanSelectedDate)
      ? state.mealPlanSelectedDate
      : getTodayIsoDate();
    if (dialog.dateInput) {
      dialog.dateInput.value = defaultDate;
    }
    const defaultTime = normalizeMealPlanTime(dialog.lastTimeValue) || '18:00';
    if (dialog.timeInput) {
      dialog.timeInput.value = defaultTime;
    }
    const availableIds = state.familyMembers
      .map((member) => (member && member.id ? member.id : null))
      .filter(Boolean);
    let defaultMembers = Array.isArray(scheduleDialogState.lastSelectedMembers)
      ? scheduleDialogState.lastSelectedMembers.filter((id) => availableIds.includes(id))
      : [];
    if (!defaultMembers.length) {
      defaultMembers = availableIds.slice();
    }
    scheduleDialogState.selectedMembers = new Set(defaultMembers);
    renderScheduleDialogMembers();
    if (dialog.guestInput) {
      const lastGuests = Math.max(0, parseNonNegativeInteger(scheduleDialogState.lastGuestCount, 0));
      dialog.guestInput.value = String(lastGuests);
    }
    dialog.root.hidden = false;
    dialog.root.dataset.open = 'true';
    document.addEventListener('keydown', handleScheduleDialogKeydown);
    window.requestAnimationFrame(() => {
      dialog.dateInput?.focus();
    });
  };
  let configuredFilterView = null;

  let primaryNavExpanded = false;

  const setPrimaryNavExpanded = (expanded) => {
    primaryNavExpanded = Boolean(expanded);
    if (elements.primaryNav) {
      elements.primaryNav.classList.toggle('nav-chip--open', primaryNavExpanded);
    }
    if (elements.primaryNavToggle) {
      elements.primaryNavToggle.setAttribute('aria-expanded', primaryNavExpanded ? 'true' : 'false');
      elements.primaryNavToggle.classList.toggle('nav-chip__toggle--active', primaryNavExpanded);
    }
  };

  const closePrimaryNav = () => {
    setPrimaryNavExpanded(false);
  };

  const togglePrimaryNav = () => {
    setPrimaryNavExpanded(!primaryNavExpanded);
  };

  const ensureMealFilters = () => {
    const current = state.mealFilters;
    const sanitized = sanitizeMealFilters(current, state.familyMembers);
    if (!current || typeof current !== 'object') {
      state.mealFilters = sanitized;
      return state.mealFilters;
    }
    Object.assign(current, sanitized);
    return current;
  };

  const ensureKitchenFilters = () => {
    const current = state.kitchenFilters;
    const sanitized = sanitizeKitchenFilters(current);
    if (!current || typeof current !== 'object') {
      state.kitchenFilters = sanitized;
      return state.kitchenFilters;
    }
    Object.assign(current, sanitized);
    return current;
  };

  const getActiveFilters = () => {
    if (state.activeView === 'meals') {
      return ensureMealFilters();
    }
    if (state.activeView === 'kitchen') {
      return ensureKitchenFilters();
    }
    return state.pantryFilters;
  };

  const setDocumentThemeAttributes = (mode, theme) => {
    if (document.documentElement.dataset.mode !== mode) {
      document.documentElement.dataset.mode = mode;
    }
    if (theme) {
      if (document.documentElement.dataset.theme !== theme) {
        document.documentElement.dataset.theme = theme;
      }
    } else {
      delete document.documentElement.dataset.theme;
    }
  };

  const ensureHolidayThemeAllowList = () => {
    if (state.holidayThemeAllowList instanceof Set) {
      return state.holidayThemeAllowList;
    }
    const values = Array.isArray(state.holidayThemeAllowList)
      ? state.holidayThemeAllowList.filter((id) => holidayDefinitionLookup.has(id))
      : [];
    const list = new Set(values);
    state.holidayThemeAllowList = list;
    return list;
  };

  const resolveHolidayThemeId = (holidayId, mode) => {
    const override = HOLIDAY_THEME_OVERRIDES[holidayId];
    if (override) {
      if (typeof override === 'string') {
        return override;
      }
      if (override[mode]) {
        return override[mode];
      }
      if (override.default) {
        return override.default;
      }
    }
    const fallback = DEFAULT_THEME_SELECTIONS[mode];
    if (fallback) {
      return fallback;
    }
    const options = Array.isArray(THEME_OPTIONS[mode]) ? THEME_OPTIONS[mode] : [];
    return options.length ? options[0].id : null;
  };

  const getActiveHolidayThemeOverride = (date = new Date()) => {
    if (!state.holidayThemesEnabled) {
      return null;
    }
    const allowList = ensureHolidayThemeAllowList();
    if (!(allowList instanceof Set) || allowList.size === 0) {
      return null;
    }
    const holidaysToday = getHolidaysForDate(date);
    if (!holidaysToday.length) {
      return null;
    }
    const activeHoliday = holidaysToday.find((holiday) => allowList.has(holiday.id));
    if (!activeHoliday) {
      return null;
    }
    const themeId = resolveHolidayThemeId(activeHoliday.id, state.themeMode);
    if (!themeId) {
      return null;
    }
    return { id: activeHoliday.id, label: activeHoliday.label, theme: themeId };
  };

  const applyHolidayThemeDataset = (override) => {
    if (override && override.id) {
      document.documentElement.dataset.holidayTheme = override.id;
      document.documentElement.setAttribute(
        'data-holiday-theme-label',
        override.label || '',
      );
    } else {
      delete document.documentElement.dataset.holidayTheme;
      document.documentElement.removeAttribute('data-holiday-theme-label');
    }
  };

  const renderHolidayThemeStatus = () => {
    if (!elements.holidayThemeStatus) {
      return;
    }
    const status = elements.holidayThemeStatus;
    const allowList = ensureHolidayThemeAllowList();
    const isEnabled = Boolean(state.holidayThemesEnabled);
    if (isEnabled) {
      const override = getActiveHolidayThemeOverride();
      if (override) {
        status.hidden = false;
        status.dataset.holidayActive = 'true';
        status.textContent = `${override.label} palette is active today.`;
        return;
      }
      delete status.dataset.holidayActive;
      if (allowList.size) {
        status.hidden = false;
        status.textContent =
          allowList.size === 1
            ? 'Themes will switch on your selected holiday.'
            : `Themes will switch on ${allowList.size} selected holidays.`;
      } else {
        status.hidden = false;
        status.textContent = 'Select at least one holiday to enable automatic themes.';
      }
      return;
    }
    delete status.dataset.holidayActive;
    if (allowList.size) {
      status.hidden = false;
      status.textContent =
        allowList.size === 1
          ? '1 holiday is ready for automatic themes.'
          : `${allowList.size} holidays are ready for automatic themes.`;
    } else {
      status.hidden = true;
      status.textContent = '';
    }
  };

  const updateHolidayThemeToggle = () => {
    if (elements.holidayThemeToggle) {
      elements.holidayThemeToggle.checked = Boolean(state.holidayThemesEnabled);
    }
  };

  const persistHolidayThemePreferences = () => {
    const allowList = Array.from(ensureHolidayThemeAllowList());
    const payload = {
      enabled: Boolean(state.holidayThemesEnabled),
      holidays: allowList,
    };
    const serialized = JSON.stringify(payload);
    if (serialized === lastPersistedHolidayThemes) {
      return;
    }
    try {
      localStorage.setItem(HOLIDAY_THEME_STORAGE_KEY, serialized);
      lastPersistedHolidayThemes = serialized;
    } catch (error) {
      console.warn('Unable to persist holiday theme preferences.', error);
    }
  };

  const getHolidayThemeDialogFocusableElements = () => {
    if (!holidayThemeDialogState.panel) {
      return [];
    }
    const selectors =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(holidayThemeDialogState.panel.querySelectorAll(selectors)).filter(
      (element) =>
        element instanceof HTMLElement
        && !element.hasAttribute('disabled')
        && element.getAttribute('aria-hidden') !== 'true',
    );
  };

  const closeHolidayThemeDialog = ({ restoreFocus = false } = {}) => {
    if (!holidayThemeDialogState.root) {
      return;
    }
    holidayThemeDialogState.root.hidden = true;
    holidayThemeDialogState.root.removeAttribute('data-open');
    if (elements.holidayThemeSettings) {
      elements.holidayThemeSettings.setAttribute('aria-expanded', 'false');
    }
    if (restoreFocus && holidayThemeDialogState.previousFocus) {
      try {
        holidayThemeDialogState.previousFocus.focus();
      } catch (error) {
        // Focus restoration is best-effort.
      }
    }
    holidayThemeDialogState.previousFocus = null;
  };

  const handleHolidayThemeDialogKeydown = (event) => {
    if (!holidayThemeDialogState.root || holidayThemeDialogState.root.dataset.open !== 'true') {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeHolidayThemeDialog({ restoreFocus: true });
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusable = getHolidayThemeDialogFocusableElements();
    if (!focusable.length) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey) {
      if (!active || active === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const syncHolidayThemeDialogSelections = () => {
    const allowList = ensureHolidayThemeAllowList();
    holidayThemeDialogState.checkboxes.forEach((checkbox, id) => {
      if (!(checkbox instanceof HTMLInputElement)) {
        return;
      }
      const isChecked = allowList.has(id);
      checkbox.checked = isChecked;
      const item = checkbox.closest('.holiday-theme-dialog__item');
      if (item) {
        if (isChecked) {
          item.dataset.checked = 'true';
        } else {
          delete item.dataset.checked;
        }
      }
    });
  };

  const ensureHolidayThemeDialog = () => {
    if (holidayThemeDialogState.root) {
      return holidayThemeDialogState;
    }
    const root = document.createElement('div');
    root.className = 'holiday-theme-dialog';
    root.id = 'holiday-theme-dialog';
    root.hidden = true;

    const backdrop = document.createElement('div');
    backdrop.className = 'holiday-theme-dialog__backdrop';

    const panel = document.createElement('form');
    panel.className = 'holiday-theme-dialog__panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'holiday-theme-dialog-title');
    panel.setAttribute('aria-describedby', 'holiday-theme-dialog-description');
    panel.tabIndex = -1;

    const title = document.createElement('h2');
    title.className = 'holiday-theme-dialog__title';
    title.id = 'holiday-theme-dialog-title';
    title.textContent = 'Holiday Themes';

    const description = document.createElement('p');
    description.className = 'holiday-theme-dialog__description';
    description.id = 'holiday-theme-dialog-description';
    description.textContent = 'Choose the holidays that should automatically switch the palette.';

    const list = document.createElement('div');
    list.className = 'holiday-theme-dialog__list';
    list.setAttribute('role', 'group');
    list.setAttribute('aria-labelledby', 'holiday-theme-dialog-title');

    holidayThemeDialogState.checkboxes = new Map();
    const currentYear = new Date().getFullYear();
    HOLIDAY_DEFINITIONS.forEach((definition) => {
      if (!definition || !definition.id) {
        return;
      }
      const item = document.createElement('label');
      item.className = 'holiday-theme-dialog__item';
      item.setAttribute('data-holiday-id', definition.id);

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'holiday-theme-dialog__checkbox';
      checkbox.value = definition.id;
      checkbox.id = `holiday-theme-${definition.id}`;

      const textWrapper = document.createElement('span');
      textWrapper.className = 'holiday-theme-dialog__item-text';

      const name = document.createElement('span');
      name.className = 'holiday-theme-dialog__item-name';
      name.textContent = definition.label;
      textWrapper.appendChild(name);

      const previewDate =
        typeof definition.getDate === 'function' ? definition.getDate(currentYear) : null;
      if (previewDate instanceof Date && !Number.isNaN(previewDate.getTime())) {
        const dateText = document.createElement('span');
        dateText.className = 'holiday-theme-dialog__item-date';
        dateText.textContent = previewDate.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
        });
        textWrapper.appendChild(dateText);
      }

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          item.dataset.checked = 'true';
        } else {
          delete item.dataset.checked;
        }
      });

      item.appendChild(checkbox);
      item.appendChild(textWrapper);
      list.appendChild(item);
      holidayThemeDialogState.checkboxes.set(definition.id, checkbox);
    });

    const actions = document.createElement('div');
    actions.className = 'holiday-theme-dialog__actions';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'holiday-theme-dialog__button';
    cancelButton.textContent = 'Cancel';

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.className =
      'holiday-theme-dialog__button holiday-theme-dialog__button--primary';
    saveButton.textContent = 'Save';

    actions.appendChild(cancelButton);
    actions.appendChild(saveButton);

    panel.appendChild(title);
    panel.appendChild(description);
    panel.appendChild(list);
    panel.appendChild(actions);

    root.appendChild(backdrop);
    root.appendChild(panel);
    document.body.appendChild(root);

    backdrop.addEventListener('click', () => {
      closeHolidayThemeDialog({ restoreFocus: true });
    });

    cancelButton.addEventListener('click', () => {
      syncHolidayThemeDialogSelections();
      closeHolidayThemeDialog({ restoreFocus: true });
    });

    panel.addEventListener('submit', (event) => {
      event.preventDefault();
      const selected = [];
      holidayThemeDialogState.checkboxes.forEach((checkbox, id) => {
        if (checkbox instanceof HTMLInputElement && checkbox.checked) {
          selected.push(id);
        }
      });
      const filtered = selected.filter((id) => holidayDefinitionLookup.has(id));
      state.holidayThemeAllowList = new Set(filtered);
      persistHolidayThemePreferences();
      applyColorTheme();
      updateHolidayThemeToggle();
      closeHolidayThemeDialog({ restoreFocus: true });
    });

    root.addEventListener('keydown', handleHolidayThemeDialogKeydown);

    holidayThemeDialogState.root = root;
    holidayThemeDialogState.panel = panel;
    holidayThemeDialogState.list = list;
    holidayThemeDialogState.backdrop = backdrop;
    holidayThemeDialogState.cancelButton = cancelButton;
    holidayThemeDialogState.saveButton = saveButton;

    syncHolidayThemeDialogSelections();

    return holidayThemeDialogState;
  };

  const openHolidayThemeDialog = () => {
    const dialog = ensureHolidayThemeDialog();
    if (!dialog.root) {
      return;
    }
    syncHolidayThemeDialogSelections();
    dialog.root.hidden = false;
    dialog.root.dataset.open = 'true';
    dialog.previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (elements.holidayThemeSettings) {
      elements.holidayThemeSettings.setAttribute('aria-expanded', 'true');
    }
    const firstCheckbox = dialog.list
      ? dialog.list.querySelector('.holiday-theme-dialog__checkbox')
      : null;
    const focusTarget =
      firstCheckbox instanceof HTMLElement ? firstCheckbox : dialog.panel || null;
    window.requestAnimationFrame(() => {
      if (focusTarget instanceof HTMLElement) {
        focusTarget.focus();
      } else if (dialog.panel instanceof HTMLElement) {
        dialog.panel.focus();
      }
    });
  };

  let lastPersistedTheme = null;
  let lastPersistedMeasurement = null;
  let lastPersistedFavorites = JSON.stringify(favoriteRecipeIds);
  let lastPersistedPantryFavorites = JSON.stringify(favoritePantrySlugs);
  let lastPersistedMealPlan = JSON.stringify(state.mealPlan);
  let lastPersistedAppState = null;

  const createAppStateSnapshot = () => {
    const mealFilters = state.mealFilters || getDefaultMealFilters();
    const pantryFilters = state.pantryFilters || getDefaultPantryFilters();
    const snapshot = {
      activeView: AVAILABLE_VIEWS.includes(state.activeView) ? state.activeView : 'meals',
      mealFilters: {
        search: typeof mealFilters.search === 'string' ? mealFilters.search : '',
        ingredients: toUniqueStringArray(mealFilters.ingredients),
        ingredientsExcluded: toUniqueStringArray(mealFilters.ingredientsExcluded),
        tags: toUniqueStringArray(mealFilters.tags),
        tagsExcluded: toUniqueStringArray(mealFilters.tagsExcluded),
        allergies: toUniqueStringArray(mealFilters.allergies),
        allergiesExcluded: toUniqueStringArray(mealFilters.allergiesExcluded),
        equipment: toUniqueStringArray(mealFilters.equipment),
        equipmentExcluded: toUniqueStringArray(mealFilters.equipmentExcluded),
        favoritesOnly: Boolean(mealFilters.favoritesOnly),
        familyMembers: sanitizeMealFilterFamilyMembers(
          mealFilters.familyMembers,
          state.familyMembers,
        ),
        pantryOnly: Boolean(mealFilters.pantryOnly),
        substitutionsAllowed: Boolean(mealFilters.substitutionsAllowed),
      },
      pantryFilters: {
        search: typeof pantryFilters.search === 'string' ? pantryFilters.search : '',
        categories: toUniqueStringArray(pantryFilters.categories),
        tags: toUniqueStringArray(pantryFilters.tags),
        allergens: toUniqueStringArray(pantryFilters.allergens),
      },
      kitchenFilters: sanitizeKitchenFilters(state.kitchenFilters),
      mealPlanViewMode: MEAL_PLAN_VIEW_MODES.includes(state.mealPlanViewMode)
        ? state.mealPlanViewMode
        : DEFAULT_MEAL_PLAN_MODE,
      mealPlanSelectedDate: isValidISODateString(state.mealPlanSelectedDate)
        ? state.mealPlanSelectedDate
        : getTodayIsoDate(),
      mealPlanMemberFilter: sanitizeMealPlanMemberFilter(state.mealPlanMemberFilter),
      mealPlanMacroSelection: sanitizeMealPlanMacroSelection(
        state.mealPlanMacroSelection,
        state.familyMembers,
      ),
      servingOverrides: {},
      notes: {},
      openNotes: {},
      pantryInventory: {},
    };

    Object.entries(state.servingOverrides || {}).forEach(([key, value]) => {
      if (typeof key !== 'string' || !key) return;
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        snapshot.servingOverrides[key] = Math.max(1, Math.round(numeric));
      }
    });

    Object.entries(state.notes || {}).forEach(([key, value]) => {
      if (typeof key === 'string' && key && typeof value === 'string') {
        snapshot.notes[key] = value;
      }
    });

    Object.entries(state.openNotes || {}).forEach(([key, value]) => {
      if (typeof key === 'string' && key && Boolean(value)) {
        snapshot.openNotes[key] = true;
      }
    });

    Object.entries(state.pantryInventory || {}).forEach(([slug, entry]) => {
      if (typeof slug !== 'string' || !slug || !entry || typeof entry !== 'object') {
        return;
      }
      const rawQuantity = entry.quantity;
      const rawUnit = entry.unit;
      const quantityText =
        rawQuantity === null || rawQuantity === undefined
          ? ''
          : typeof rawQuantity === 'string'
            ? rawQuantity.trim()
            : String(rawQuantity);
      const unitText = typeof rawUnit === 'string' ? rawUnit.trim() : '';
      const hasQuantity = quantityText !== '';
      const isDefaultUnit = unitText.toLowerCase() === 'each';
      if (!hasQuantity && (!unitText || isDefaultUnit)) {
        return;
      }
      snapshot.pantryInventory[slug] = {
        quantity: hasQuantity ? quantityText : '',
        unit: unitText || 'each',
      };
    });

    snapshot.familyMembers = sanitizeFamilyMembers(state.familyMembers);

    return snapshot;
  };

  const persistAppState = () => {
    const serialized = JSON.stringify(createAppStateSnapshot());
    if (serialized === lastPersistedAppState) {
      return;
    }
    try {
      localStorage.setItem(APP_STATE_STORAGE_KEY, serialized);
      lastPersistedAppState = serialized;
    } catch (error) {
      console.warn('Unable to persist application state.', error);
    }
  };

  const persistMealPlan = () => {
    const serialized = JSON.stringify(state.mealPlan);
    if (serialized === lastPersistedMealPlan) {
      return;
    }
    try {
      localStorage.setItem(MEAL_PLAN_STORAGE_KEY, serialized);
      lastPersistedMealPlan = serialized;
    } catch (error) {
      console.warn('Unable to persist meal plan entries.', error);
    }
  };

  const persistFavoriteRecipeIds = () => {
    const serialized = JSON.stringify(Array.from(state.favoriteRecipes));
    if (serialized === lastPersistedFavorites) {
      return;
    }
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, serialized);
      lastPersistedFavorites = serialized;
    } catch (error) {
      console.warn('Unable to persist favorite recipes.', error);
    }
  };

  const persistFavoritePantrySlugs = () => {
    const serialized = JSON.stringify(Array.from(state.favoritePantryItems));
    if (serialized === lastPersistedPantryFavorites) {
      return;
    }
    try {
      localStorage.setItem(PANTRY_FAVORITES_STORAGE_KEY, serialized);
      lastPersistedPantryFavorites = serialized;
    } catch (error) {
      console.warn('Unable to persist favorite pantry items.', error);
    }
  };

  const applyColorTheme = (shouldPersist = true) => {
    const mode = state.themeMode;
    const options = THEME_OPTIONS[mode] || [];
    const fallback = DEFAULT_THEME_SELECTIONS[mode] || (options[0] ? options[0].id : undefined);
    const currentSelection = state.themeSelections[mode];
    const activeTheme = options.some((option) => option.id === currentSelection)
      ? currentSelection
      : fallback;
    const selectionChanged = activeTheme !== currentSelection;
    if (selectionChanged) {
      state.themeSelections[mode] = activeTheme;
    }
    const holidayOverride = getActiveHolidayThemeOverride();
    const themeToApply = holidayOverride?.theme || activeTheme;
    setDocumentThemeAttributes(mode, themeToApply);
    applyHolidayThemeDataset(holidayOverride);
    renderHolidayThemeStatus();
    if (!shouldPersist && !selectionChanged) return;
    const serialized = JSON.stringify({ mode, selections: { ...state.themeSelections } });
    if (serialized === lastPersistedTheme) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, serialized);
      lastPersistedTheme = serialized;
    } catch (error) {
      console.warn('Unable to persist theme preferences.', error);
    }
  };

  const updateModeButtons = () => {
    if (!Array.isArray(elements.modeToggleButtons)) return;
    elements.modeToggleButtons.forEach((button) => {
      const mode = button.dataset.mode;
      const isActive = mode === state.themeMode;
      button.classList.toggle('mode-toggle__button--active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const renderThemeOptions = () => {
    if (!elements.themeOptions) return;
    const currentMode = state.themeMode;
    const options = THEME_OPTIONS[currentMode] || [];
    const activeTheme = state.themeSelections[currentMode];
    elements.themeOptions.innerHTML = '';
    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'theme-option';
      button.style.setProperty('--theme-preview-color', option.preview);
      const isActive = option.id === activeTheme;
      if (isActive) {
        button.classList.add('theme-option--active');
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.setAttribute('aria-pressed', 'false');
      }
      button.dataset.themeOption = option.id;
      button.textContent = option.label;
      button.addEventListener('click', () => {
        if (state.themeSelections[currentMode] === option.id) return;
        state.themeSelections[currentMode] = option.id;
        applyColorTheme();
        renderThemeOptions();
      });
      elements.themeOptions.appendChild(button);
    });
  };

  const setThemeMode = (mode) => {
    const options = Array.isArray(THEME_OPTIONS[mode]) ? THEME_OPTIONS[mode] : [];
    if (!options.length || state.themeMode === mode) return;
    state.themeMode = mode;
    if (!options.some((option) => option.id === state.themeSelections[mode])) {
      const fallbackSelection =
        DEFAULT_THEME_SELECTIONS[mode] || (options[0] ? options[0].id : undefined);
      if (fallbackSelection) {
        state.themeSelections[mode] = fallbackSelection;
      }
    }
    applyColorTheme();
    updateModeButtons();
    renderThemeOptions();
  };

  const initThemeControls = () => {
    applyColorTheme();
    updateModeButtons();
    renderThemeOptions();
    updateHolidayThemeToggle();
  };

  const persistMeasurementPreference = () => {
    const preference = state.measurementSystem;
    if (preference === lastPersistedMeasurement) return;
    try {
      localStorage.setItem(MEASUREMENT_STORAGE_KEY, preference);
      lastPersistedMeasurement = preference;
    } catch (error) {
      console.warn('Unable to persist measurement preference.', error);
    }
  };

  const updateMeasurementButtons = () => {
    if (!Array.isArray(elements.measurementToggleButtons)) return;
    elements.measurementToggleButtons.forEach((button) => {
      const system = button.dataset.measurement;
      const isActive = system === state.measurementSystem;
      button.classList.toggle('mode-toggle__button--active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const setMeasurementSystem = (system) => {
    if (!MEASUREMENT_SYSTEMS.includes(system) || state.measurementSystem === system) return;
    state.measurementSystem = system;
    persistMeasurementPreference();
    updateMeasurementButtons();
    renderApp();
  };

  const initMeasurementControls = () => {
    updateMeasurementButtons();
  };

  const normalizeText = (value) => String(value || '').toLowerCase();

  const roundToPrecision = (value, decimals) => {
    if (!Number.isFinite(value) || !Number.isInteger(decimals) || decimals < 0) {
      return value;
    }
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  };

  const formatQuantity = (quantity) => {
    if (quantity === null || quantity === undefined) return '';
    const rounded = Math.round(quantity * 100) / 100;
    if (Number.isInteger(rounded)) {
      return String(rounded);
    }
    return rounded.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  };

  const convertMeasurement = (quantity, unit, targetSystem) => {
    if (!Number.isFinite(quantity)) {
      return { quantity, unit };
    }
    const normalizedUnit = typeof unit === 'string' ? unit.trim().toLowerCase() : '';
    if (!normalizedUnit) {
      return { quantity, unit };
    }
    const conversions = MEASUREMENT_CONVERSIONS[targetSystem] || {};
    const conversion = conversions[normalizedUnit];
    if (!conversion) {
      return { quantity, unit };
    }
    return {
      quantity: quantity * conversion.factor,
      unit: conversion.unit,
    };
  };

  const formatIngredientMeasurement = (quantity, unit) => {
    const normalizedUnit = typeof unit === 'string' ? unit.trim() : '';
    if (!Number.isFinite(quantity)) {
      return {
        quantityText: typeof quantity === 'string' ? quantity : '',
        unitText: normalizedUnit,
      };
    }
    let convertedQuantity = quantity;
    let convertedUnit = normalizedUnit;
    if (MEASUREMENT_SYSTEMS.includes(state.measurementSystem)) {
      const result = convertMeasurement(quantity, normalizedUnit, state.measurementSystem);
      convertedQuantity = Number.isFinite(result.quantity) ? result.quantity : quantity;
      convertedUnit = result.unit || normalizedUnit;
    }
    const finalUnit = typeof convertedUnit === 'string' ? convertedUnit.trim() : '';
    const precisionKey = finalUnit.toLowerCase();
    const hasPrecision = Object.prototype.hasOwnProperty.call(
      MEASUREMENT_DISPLAY_PRECISION,
      precisionKey,
    );
    const precision = hasPrecision ? MEASUREMENT_DISPLAY_PRECISION[precisionKey] : null;
    const adjustedQuantity =
      hasPrecision && Number.isFinite(precision)
        ? roundToPrecision(convertedQuantity, precision)
        : convertedQuantity;
    return {
      quantityText: formatQuantity(adjustedQuantity),
      unitText: finalUnit,
    };
  };

  const formatBirthday = (value) => {
    if (!isValidISODateString(value)) {
      return '';
    }
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  };

  const formatAllergenLabel = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    return text
      .split(/([\s/_-]+)/)
      .map((segment) => {
        if (!segment) return segment;
        if (!/[a-z0-9]/i.test(segment)) {
          if (/^_+$/.test(segment)) {
            return ' ';
          }
          return segment;
        }
        const lower = segment.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join('');
  };

  const getPantryEntry = (slug) => state.pantryInventory[slug] || { quantity: '', unit: DEFAULT_PANTRY_UNIT };

  const updatePantryEntry = (slug, patch) => {
    const existing = getPantryEntry(slug);
    const next = { ...existing, ...patch };
    const quantityValue = typeof next.quantity === 'string' ? next.quantity.trim() : next.quantity;
    const unitValue = typeof next.unit === 'string' ? next.unit.trim() : next.unit;
    const isQuantityEmpty = quantityValue === '' || quantityValue === null || quantityValue === undefined;
    const normalizedUnit = unitValue || DEFAULT_PANTRY_UNIT;
    if (isQuantityEmpty && normalizedUnit === DEFAULT_PANTRY_UNIT) {
      delete state.pantryInventory[slug];
    } else {
      state.pantryInventory[slug] = {
        quantity: isQuantityEmpty ? '' : quantityValue,
        unit: normalizedUnit,
      };
    }
    persistAppState();
  };

  const getRecipeForEntry = (entry) => {
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    if (entry.recipeId && recipeLookupById.has(entry.recipeId)) {
      return recipeLookupById.get(entry.recipeId);
    }
    const title = typeof entry.title === 'string' ? entry.title.toLowerCase() : '';
    if (!title) {
      return null;
    }
    return recipeLookupByName.get(title) || null;
  };

  const createMacroBucket = () => {
    const bucket = { servings: 0 };
    MACRO_KEYS.forEach((key) => {
      bucket[key] = 0;
    });
    return bucket;
  };

  const accumulateMacroBucket = (bucket, recipe, count) => {
    if (!bucket || !recipe || !recipe.nutritionPerServing) {
      return;
    }
    const servings = Math.max(0, Number(count) || 0);
    if (!servings) {
      return;
    }
    bucket.servings += servings;
    MACRO_KEYS.forEach((macro) => {
      const perServing = Number(recipe.nutritionPerServing?.[macro]) || 0;
      bucket[macro] += perServing * servings;
    });
  };

  const calculateDailyMacroSummary = (isoDate) => {
    const summary = {
      overall: createMacroBucket(),
      members: new Map(),
      guests: createMacroBucket(),
    };
    const entries = getMealPlanEntries(isoDate);
    const knownMembers = new Map();
    state.familyMembers.forEach((member) => {
      if (member?.id) {
        knownMembers.set(member.id, member);
      }
    });
    entries.forEach((entry) => {
      const recipe = getRecipeForEntry(entry);
      if (!recipe || !recipe.nutritionPerServing) {
        return;
      }
      const attendance = sanitizeMealPlanAttendance(entry.attendance ?? entry.servings);
      attendance.members.forEach((memberId) => {
        if (!knownMembers.has(memberId)) {
          return;
        }
        const bucket = summary.members.get(memberId) || createMacroBucket();
        accumulateMacroBucket(bucket, recipe, 1);
        summary.members.set(memberId, bucket);
      });
      if (attendance.guests > 0) {
        accumulateMacroBucket(summary.guests, recipe, attendance.guests);
      }
    });
    summary.members.forEach((bucket) => {
      MACRO_KEYS.forEach((macro) => {
        summary.overall[macro] += bucket[macro];
      });
      summary.overall.servings += bucket.servings;
    });
    MACRO_KEYS.forEach((macro) => {
      summary.overall[macro] += summary.guests[macro];
    });
    summary.overall.servings += summary.guests.servings;
    return summary;
  };

  const getMealPlanEntries = (isoDate) => {
    if (!isValidISODateString(isoDate)) {
      return [];
    }
    const entries = state.mealPlan[isoDate];
    return Array.isArray(entries) ? sortMealPlanEntries(entries) : [];
  };

  const ensureMealPlanSelection = () => {
    if (!isValidISODateString(state.mealPlanSelectedDate)) {
      state.mealPlanSelectedDate = getTodayIsoDate();
    }
    return state.mealPlanSelectedDate;
  };

  const setMealPlanSelectedDate = (isoDate) => {
    if (isValidISODateString(isoDate)) {
      state.mealPlanSelectedDate = isoDate;
    } else {
      state.mealPlanSelectedDate = getTodayIsoDate();
    }
    persistAppState();
  };

  const ensureMealPlanMacroSelection = (availableIds = []) => {
    const validIds = Array.isArray(availableIds)
      ? availableIds.filter((id) => typeof id === 'string' && id)
      : [];
    const current = typeof state.mealPlanMacroSelection === 'string'
      ? state.mealPlanMacroSelection
      : '';
    if (validIds.length && validIds.includes(current)) {
      return current;
    }
    const fallback = validIds[0] || 'overall';
    if (fallback && current !== fallback) {
      state.mealPlanMacroSelection = fallback;
      persistAppState();
    }
    return fallback;
  };

  const setMealPlanMacroSelection = (selection, options = {}) => {
    const { shouldPersist = true, shouldRender = true } = options;
    const sanitized = sanitizeMealPlanMacroSelection(selection, state.familyMembers);
    if (sanitized === state.mealPlanMacroSelection) {
      return sanitized;
    }
    state.mealPlanMacroSelection = sanitized;
    if (shouldPersist) {
      persistAppState();
    }
    if (shouldRender) {
      const iso = ensureMealPlanSelection();
      renderMealPlanSummary(iso);
    }
    return sanitized;
  };

  const addMealPlanEntry = (isoDate, type, title, time, metadata = {}) => {
    const dateKey = isValidISODateString(isoDate) ? isoDate : ensureMealPlanSelection();
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';
    if (!normalizedTitle) {
      return false;
    }
    const entryType = mealPlanEntryTypeLookup.has(type) ? type : 'meal';
    const normalizedTime = normalizeMealPlanTime(time);
    const nextEntries = getMealPlanEntries(dateKey).slice();
    const entry = { id: createMealPlanEntryId(), type: entryType, title: normalizedTitle };
    if (normalizedTime) {
      entry.time = normalizedTime;
    }
    if (metadata && typeof metadata === 'object') {
      const { recipeId } = metadata;
      if (typeof recipeId === 'string' && recipeLookupById.has(recipeId)) {
        entry.recipeId = recipeId;
      }
    }
    let attendance = sanitizeMealPlanAttendance(metadata?.attendance ?? metadata?.servings);
    if (!attendance.members.length && state.familyMembers.length) {
      attendance = {
        ...attendance,
        members: state.familyMembers.map((member) => member.id).filter(Boolean),
      };
    }
    entry.attendance = attendance;
    entry.servings = attendance;
    nextEntries.push(entry);
    state.mealPlan[dateKey] = sortMealPlanEntries(nextEntries);
    persistMealPlan();
    return true;
  };

  const removeMealPlanEntry = (isoDate, entryId) => {
    if (!isValidISODateString(isoDate) || typeof entryId !== 'string' || !entryId) {
      return;
    }
    const currentEntries = getMealPlanEntries(isoDate);
    if (!currentEntries.length) {
      return;
    }
    const filtered = currentEntries.filter((entry) => entry.id !== entryId);
    if (filtered.length) {
      state.mealPlan[isoDate] = sortMealPlanEntries(filtered);
    } else {
      delete state.mealPlan[isoDate];
    }
    persistMealPlan();
  };

  const updateMealPlanEntryAttendance = (isoDate, entryId, updater) => {
    if (!isValidISODateString(isoDate) || typeof entryId !== 'string' || !entryId) {
      return;
    }
    const entries = state.mealPlan[isoDate];
    if (!Array.isArray(entries)) {
      return;
    }
    const target = entries.find((entry) => entry.id === entryId);
    if (!target) {
      return;
    }
    const current = sanitizeMealPlanAttendance(target.attendance ?? target.servings);
    const updated = updater({ members: current.members.slice(), guests: current.guests });
    if (!updated) {
      return;
    }
    const normalized = sanitizeMealPlanAttendance(updated);
    target.attendance = normalized;
    target.servings = normalized;
    state.mealPlan[isoDate] = sortMealPlanEntries(entries);
    persistMealPlan();
  };

  const toggleMealPlanEntryMember = (isoDate, entryId, memberId) => {
    if (typeof memberId !== 'string' || !memberId) {
      return;
    }
    updateMealPlanEntryAttendance(isoDate, entryId, (attendance) => {
      const members = new Set(attendance.members);
      if (members.has(memberId)) {
        members.delete(memberId);
      } else {
        members.add(memberId);
      }
      return { ...attendance, members: Array.from(members) };
    });
  };

  const setMealPlanEntryGuests = (isoDate, entryId, guests) => {
    updateMealPlanEntryAttendance(isoDate, entryId, (attendance) => ({
      ...attendance,
      guests: Math.max(0, parseNonNegativeInteger(guests, 0)),
    }));
  };

  const cacheElements = () => {
    elements.viewToggleButtons = Array.from(document.querySelectorAll('[data-view-target]'));
    elements.primaryNav = document.getElementById('primary-nav');
    elements.primaryNavToggle = document.getElementById('primary-nav-toggle');
    elements.appLayout = document.getElementById('app-layout');
    elements.filterPanel = document.getElementById('filter-panel');
    elements.mealView = document.getElementById('meal-view');
    elements.kitchenView = document.getElementById('kitchen-view');
    elements.pantryView = document.getElementById('pantry-view');
    elements.mealPlanView = document.getElementById('meal-plan-view');
    elements.mealPlanCalendar = document.getElementById('meal-plan-calendar');
    elements.mealPlanSidebar = document.getElementById('meal-plan-sidebar');
    elements.mealPlanDayDetails = document.getElementById('meal-plan-day-details');
    elements.mealPlanSummary = document.getElementById('meal-plan-summary');
    elements.mealPlanSummaryTitle = document.getElementById('meal-plan-summary-title');
    elements.mealPlanMacros = document.getElementById('meal-plan-macros');
    elements.mealPlanViewHeader = document.querySelector('.meal-plan-view__header');
    elements.mealPlanViewLayout = document.querySelector('.meal-plan-view__layout');
    elements.mealPlanModeButtons = Array.from(
      document.querySelectorAll('[data-meal-plan-mode]'),
    );
    elements.mealPlanPeriod = document.getElementById('meal-plan-period');
    elements.mealPlanFamilyFilter = document.getElementById('meal-plan-family-filter');
    elements.mealPlanPrevButton = document.getElementById('meal-plan-prev');
    elements.mealPlanNextButton = document.getElementById('meal-plan-next');
    elements.mealGrid = document.getElementById('meal-grid');
    elements.kitchenGrid = document.getElementById('kitchen-grid');
    elements.kitchenCount = document.getElementById('kitchen-count');
    elements.pantryGrid = document.getElementById('pantry-grid');
    elements.pantryCount = document.getElementById('pantry-count');
    elements.filterSearch = document.getElementById('filter-search');
    elements.resetButton = document.getElementById('reset-filters');
    elements.favoriteFilterToggle = document.getElementById('favorite-filter');
    elements.recipeFamilyFilter = document.getElementById('recipe-family-filter');
    elements.pantryOnlyToggle = document.getElementById('pantry-only-toggle');
    elements.substitutionToggle = document.getElementById('substitution-toggle');
    elements.ingredientSection = document.getElementById('ingredient-section');
    elements.tagSection = document.getElementById('tag-section');
    elements.allergySection = document.getElementById('allergy-section');
    elements.equipmentSection = document.getElementById('equipment-section');
    elements.ingredientSummary = document.getElementById('ingredient-summary');
    elements.tagSummary = document.getElementById('tag-summary');
    elements.allergySummary = document.getElementById('allergy-summary');
    elements.equipmentSummary = document.getElementById('equipment-summary');
    elements.ingredientOptions = document.getElementById('ingredient-options');
    elements.tagOptions = document.getElementById('tag-options');
    elements.allergyOptions = document.getElementById('allergy-options');
    elements.equipmentOptions = document.getElementById('equipment-options');
    elements.themeOptions = document.getElementById('theme-options');
    elements.holidayThemeToggle = document.getElementById('holiday-theme-toggle');
    elements.holidayThemeSettings = document.getElementById('holiday-theme-settings');
    elements.holidayThemeStatus = document.getElementById('holiday-theme-status');
    if (elements.holidayThemeSettings) {
      elements.holidayThemeSettings.setAttribute('aria-expanded', 'false');
    }
    elements.modeToggleButtons = Array.from(
      document.querySelectorAll('#mode-toggle .mode-toggle__button'),
    );
    elements.measurementToggleButtons = Array.from(
      document.querySelectorAll('#measurement-toggle .mode-toggle__button'),
    );
    elements.familyButton = document.getElementById('family-button');
    elements.familyPanel = document.getElementById('family-panel');
    elements.familyPanelBackdrop = document.getElementById('family-panel-backdrop');
    elements.familyPanelClose = document.getElementById('family-panel-close');
    elements.familyMemberList = document.getElementById('family-member-list');
    elements.familyAddButton = document.getElementById('family-add-member');
    elements.mealPlanDayModal = document.getElementById('meal-plan-day-modal');
    elements.mealPlanDayModalBackdrop = document.getElementById('meal-plan-day-modal-backdrop');
    elements.mealPlanDayModalClose = document.getElementById('meal-plan-day-modal-close');
    elements.mealPlanDayModalBody = document.getElementById('meal-plan-day-modal-body');
    elements.mealPlanDayModalTitle = document.getElementById('meal-plan-day-modal-title');
    elements.mealPlanDayModalSubtitle = document.getElementById('meal-plan-day-modal-subtitle');
    dayModalState.root = elements.mealPlanDayModal;
    dayModalState.backdrop = elements.mealPlanDayModalBackdrop;
    dayModalState.closeButton = elements.mealPlanDayModalClose;
    dayModalState.body = elements.mealPlanDayModalBody;
    dayModalState.title = elements.mealPlanDayModalTitle;
    dayModalState.subtitle = elements.mealPlanDayModalSubtitle;
  };

  const getMealFilterSelectedFamilyMemberIds = () => {
    const selections = state.mealFilters?.familyMembers;
    if (!Array.isArray(selections) || !selections.length) {
      return [];
    }
    return selections.filter((id) => typeof id === 'string' && id);
  };

  const getRecipeFamilyFilterSelections = () => {
    const availableMembers = Array.isArray(state.familyMembers) ? state.familyMembers : [];
    const lookup = new Map();
    availableMembers.forEach((member) => {
      if (member && member.id) {
        lookup.set(member.id, member);
      }
    });
    const ids = getMealFilterSelectedFamilyMemberIds();
    const members = [];
    const allergies = new Set();
    const diets = new Set();
    ids.forEach((id) => {
      const member = lookup.get(id);
      if (!member) return;
      members.push(member);
      (Array.isArray(member.allergies) ? member.allergies : []).forEach((allergy) => {
        const normalized = typeof allergy === 'string' ? allergy.trim() : '';
        if (normalized) {
          allergies.add(normalized);
        }
      });
      (Array.isArray(member.diets) ? member.diets : []).forEach((diet) => {
        const normalized = typeof diet === 'string' ? diet.trim() : '';
        if (normalized) {
          diets.add(normalized);
        }
      });
    });
    return { ids, members, allergies, diets };
  };

  const toggleMealFilterFamilyMember = (memberId) => {
    if (typeof memberId !== 'string' || !memberId) {
      return;
    }
    const current = new Set(getMealFilterSelectedFamilyMemberIds());
    if (current.has(memberId)) {
      current.delete(memberId);
    } else {
      current.add(memberId);
    }
    const filters = ensureMealFilters();
    filters.familyMembers = sanitizeMealFilterFamilyMembers(
      Array.from(current),
      state.familyMembers,
    );
    renderApp();
  };

  const clearMealFilterFamilyMembers = () => {
    const filters = ensureMealFilters();
    if (Array.isArray(filters.familyMembers) && filters.familyMembers.length) {
      filters.familyMembers = [];
      renderApp();
    }
  };

  const populateCheckboxGroup = (view, container, options, field, config) => {
    let spanClassName;
    let labelFormatter;
    if (typeof config === 'string') {
      spanClassName = config;
    } else if (config && typeof config === 'object') {
      spanClassName = config.spanClassName;
      labelFormatter = config.labelFormatter;
    }
    if (!container) return;
    const registry = checkboxRegistry[view]?.[field];
    if (!registry) return;
    const filters =
      view === 'meals' ? ensureMealFilters() : state.pantryFilters || getDefaultPantryFilters();
    const triStateConfig = view === 'meals' ? getTriStateConfig(field) : null;
    if (triStateConfig) {
      if (!Array.isArray(filters[triStateConfig.include])) {
        filters[triStateConfig.include] = [];
      }
      if (!Array.isArray(filters[triStateConfig.exclude])) {
        filters[triStateConfig.exclude] = [];
      }
    } else if (!Array.isArray(filters[field])) {
      filters[field] = [];
    }
    const familySelections =
      view === 'meals' && field === 'allergies' ? getRecipeFamilyFilterSelections() : null;
    const familyAllergies = familySelections ? familySelections.allergies : new Set();
    container.innerHTML = '';
    registry.clear();
    options.forEach((option) => {
      const displayLabel =
        typeof labelFormatter === 'function' ? labelFormatter(option) : option;
      if (triStateConfig) {
        const button = createTriStateButton(option, displayLabel, field, filters, () => renderApp());
        const labelSpan = button.querySelector('.filter-toggle__label');
        if (spanClassName && labelSpan) {
          labelSpan.classList.add(spanClassName);
        }
        const isFamilySelection = familyAllergies instanceof Set && familyAllergies.has(option);
        const defaultState = isFamilySelection ? 'exclude' : getTriStateState(filters, field, option);
        updateTriStateButtonState(button, defaultState);
        if (isFamilySelection) {
          button.disabled = true;
          button.classList.add('checkbox-option--locked');
          button.dataset.familySelection = 'true';
        } else {
          button.disabled = false;
          button.classList.remove('checkbox-option--locked');
          delete button.dataset.familySelection;
        }
        container.appendChild(button);
        registry.set(option, button);
      } else {
        const label = document.createElement('label');
        label.className = 'checkbox-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = option;
        input.checked = filters[field].includes(option);
        input.addEventListener('change', () => {
          const current = new Set(filters[field]);
          if (input.checked) {
            current.add(option);
          } else {
            current.delete(option);
          }
          filters[field] = Array.from(current);
          renderApp();
        });
        label.appendChild(input);
        const span = document.createElement('span');
        if (spanClassName) {
          span.className = spanClassName;
        }
        span.textContent = displayLabel;
        label.appendChild(span);
        container.appendChild(label);
        registry.set(option, input);
      }
    });
  };

  const populateGroupedTagOptions = (view, container, groups, field) => {
    if (!container) return;
    const registry = checkboxRegistry[view]?.[field];
    if (!registry) return;
    const filters =
      view === 'meals' ? ensureMealFilters() : state.pantryFilters || getDefaultPantryFilters();
    const triStateConfig = view === 'meals' ? getTriStateConfig(field) : null;
    if (triStateConfig) {
      if (!Array.isArray(filters[triStateConfig.include])) {
        filters[triStateConfig.include] = [];
      }
      if (!Array.isArray(filters[triStateConfig.exclude])) {
        filters[triStateConfig.exclude] = [];
      }
    } else if (!Array.isArray(filters[field])) {
      filters[field] = [];
    }
    const familySelections = view === 'meals' ? getRecipeFamilyFilterSelections() : null;
    const familyDiets = familySelections ? familySelections.diets : new Set();
    tagGroupSummaryRegistry[view] = [];
    container.innerHTML = '';
    registry.clear();
    container.classList.add('tag-groups');
    container.classList.remove('checkbox-grid');
    groups.forEach((group, index) => {
      if (!group.options.length) return;
      const optionValues = group.options.map((option) => option.value);
      let selectedCount = 0;
      if (triStateConfig) {
        const activeValues = new Set();
        const { include, exclude } = getTriStateSets(filters, field);
        optionValues.forEach((value) => {
          if (include.has(value) || exclude.has(value) || (familyDiets instanceof Set && familyDiets.has(value))) {
            activeValues.add(value);
          }
        });
        selectedCount = activeValues.size;
      } else {
        selectedCount = optionValues.reduce(
          (count, value) =>
            filters[field].includes(value) || (familyDiets instanceof Set && familyDiets.has(value))
              ? count + 1
              : count,
          0,
        );
      }
      const details = document.createElement('details');
      details.className = 'tag-group';
      const hasSelection = selectedCount > 0;
      details.open = hasSelection || index === 0;
      const summary = document.createElement('summary');
      summary.className = 'tag-group__summary';
      const labelSpan = document.createElement('span');
      labelSpan.className = 'tag-group__summary-label';
      labelSpan.textContent = group.label;
      summary.appendChild(labelSpan);
      const countBadge = document.createElement('span');
      countBadge.className = 'tag-group__summary-count';
      summary.appendChild(countBadge);
      const updateSelectionDisplay = (count) => {
        if (count > 0) {
          countBadge.textContent = `${count} selected`;
          countBadge.hidden = false;
          summary.setAttribute('aria-label', `${group.label} (${count} selected)`);
        } else {
          countBadge.textContent = '';
          countBadge.hidden = true;
          summary.setAttribute('aria-label', `${group.label} (no tags selected)`);
        }
      };
      updateSelectionDisplay(selectedCount);
      details.appendChild(summary);
      const optionGrid = document.createElement('div');
      optionGrid.className = 'checkbox-grid';
      const optionGridId = `tag-group-${view}-${group.id || index}-options`;
      optionGrid.id = optionGridId;
      summary.setAttribute('aria-controls', optionGridId);
      const applyExpandedState = () => {
        summary.setAttribute('aria-expanded', details.open ? 'true' : 'false');
      };
      details.addEventListener('toggle', applyExpandedState);
      applyExpandedState();
      group.options.forEach((option) => {
        if (triStateConfig) {
          const button = createTriStateButton(option.value, option.label, field, filters, () => renderApp());
          const isFamilySelection = familyDiets instanceof Set && familyDiets.has(option.value);
          const defaultState = isFamilySelection ? 'include' : getTriStateState(filters, field, option.value);
          updateTriStateButtonState(button, defaultState);
          if (isFamilySelection) {
            button.disabled = true;
            button.classList.add('checkbox-option--locked');
            button.dataset.familySelection = 'true';
          } else {
            button.disabled = false;
            button.classList.remove('checkbox-option--locked');
            delete button.dataset.familySelection;
          }
          optionGrid.appendChild(button);
          registry.set(option.value, button);
        } else {
          const label = document.createElement('label');
          label.className = 'checkbox-option';
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.value = option.value;
          const isFamilySelection = familyDiets instanceof Set && familyDiets.has(option.value);
          input.checked = filters[field].includes(option.value) || isFamilySelection;
          input.disabled = isFamilySelection;
          input.addEventListener('change', () => {
            const current = new Set(filters[field]);
            if (input.checked) {
              current.add(option.value);
            } else {
              current.delete(option.value);
            }
            filters[field] = Array.from(current);
            renderApp();
          });
          if (isFamilySelection) {
            label.classList.add('checkbox-option--locked');
            label.dataset.familySelection = 'true';
            input.dataset.familySelection = 'true';
          } else {
            label.classList.remove('checkbox-option--locked');
            delete label.dataset.familySelection;
            delete input.dataset.familySelection;
          }
          label.appendChild(input);
          const span = document.createElement('span');
          span.textContent = option.label;
          label.appendChild(span);
          optionGrid.appendChild(label);
          registry.set(option.value, input);
        }
      });
      details.appendChild(optionGrid);
      container.appendChild(details);
      tagGroupSummaryRegistry[view].push({
        summary,
        countBadge,
        label: group.label,
        field,
        optionValues,
        updateSelectionDisplay,
        triState: Boolean(triStateConfig),
      });
    });
  };

  const populateIngredientFilters = (container, groups) => {
    if (!container) return;
    const registry = checkboxRegistry.meals?.ingredients;
    if (!registry) return;
    const filters = ensureMealFilters();
    if (!Array.isArray(filters.ingredients)) {
      filters.ingredients = [];
    }
    if (!Array.isArray(filters.ingredientsExcluded)) {
      filters.ingredientsExcluded = [];
    }
    container.innerHTML = '';
    registry.clear();
    container.classList.add('ingredient-groups');
    container.classList.remove('checkbox-grid');
    const flattenGroupOptions = (group) => {
      if (Array.isArray(group.sections)) {
        return group.sections.flatMap((section) =>
          Array.isArray(section.options) ? section.options : [],
        );
      }
      return Array.isArray(group.options) ? group.options : [];
    };

    const renderOption = (option, optionGrid) => {
      if (!option || !option.slug) return;
      const button = createTriStateButton(option.slug, option.label, 'ingredients', filters, () => renderApp());
      const defaultState = getTriStateState(filters, 'ingredients', option.slug);
      updateTriStateButtonState(button, defaultState);
      optionGrid.appendChild(button);
      registry.set(option.slug, button);
    };

    groups.forEach((group, index) => {
      const allOptions = flattenGroupOptions(group);
      if (!allOptions.length) return;
      const details = document.createElement('details');
      details.className = 'ingredient-group';
      const { include, exclude } = getTriStateSets(filters, 'ingredients');
      const hasSelection = allOptions.some((option) => include.has(option.slug) || exclude.has(option.slug));
      details.open = hasSelection || index < 2;
      const summary = document.createElement('summary');
      summary.className = 'ingredient-group__summary';
      summary.textContent = group.label;
      details.appendChild(summary);

      if (Array.isArray(group.sections) && group.sections.length) {
        const sectionsContainer = document.createElement('div');
        sectionsContainer.className = 'ingredient-group__options';
        group.sections.forEach((section) => {
          if (!section || !Array.isArray(section.options) || !section.options.length) {
            return;
          }
          const sectionWrapper = document.createElement('div');
          sectionWrapper.className = 'ingredient-group__section';
          if (section.label) {
            const sectionTitle = document.createElement('h4');
            sectionTitle.className = 'ingredient-group__section-title';
            sectionTitle.textContent = section.label;
            sectionWrapper.appendChild(sectionTitle);
          }
          const optionGrid = document.createElement('div');
          optionGrid.className = 'checkbox-grid';
          section.options.forEach((option) => renderOption(option, optionGrid));
          if (optionGrid.childNodes.length) {
            sectionWrapper.appendChild(optionGrid);
            sectionsContainer.appendChild(sectionWrapper);
          }
        });
        if (sectionsContainer.childNodes.length) {
          details.appendChild(sectionsContainer);
        }
      } else {
        const optionGrid = document.createElement('div');
        optionGrid.className = 'checkbox-grid';
        allOptions.forEach((option) => renderOption(option, optionGrid));
        if (optionGrid.childNodes.length) {
          details.appendChild(optionGrid);
        }
      }

    container.appendChild(details);
    });
  };

  const renderRecipeFamilyFilter = () => {
    const container = elements.recipeFamilyFilter;
    if (!container) return;
    const isMealsView = state.activeView === 'meals';
    const members = ensureFamilySanitized();
    if (!isMealsView || !members.length) {
      container.hidden = true;
      container.setAttribute('aria-hidden', 'true');
      container.innerHTML = '';
      delete container.dataset.filterActive;
      return;
    }
    container.hidden = false;
    container.removeAttribute('aria-hidden');
    container.innerHTML = '';
    const { ids } = getRecipeFamilyFilterSelections();
    if (ids.length) {
      container.dataset.filterActive = 'true';
    } else {
      delete container.dataset.filterActive;
    }
    const list = document.createElement('div');
    list.className = 'recipe-family-filter__list';
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', 'Filter recipes by family member');
    const hasSelection = ids.length > 0;
    const allButton = document.createElement('button');
    allButton.type = 'button';
    allButton.className = 'recipe-family-filter__button recipe-family-filter__button--all';
    if (!hasSelection) {
      allButton.classList.add('recipe-family-filter__button--active');
    }
    allButton.textContent = 'All';
    allButton.title = 'Show recipes for all family members';
    allButton.setAttribute('aria-pressed', hasSelection ? 'false' : 'true');
    allButton.addEventListener('click', () => {
      clearMealFilterFamilyMembers();
    });
    list.appendChild(allButton);
    const selectedSet = new Set(ids);
    members.forEach((member) => {
      if (!member || !member.id) {
        return;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'recipe-family-filter__button';
      const isActive = selectedSet.has(member.id);
      if (isActive) {
        button.classList.add('recipe-family-filter__button--active');
      }
      button.textContent = member.icon || '👤';
      const labelText = `Filter recipes for ${member.name}`;
      button.title = labelText;
      button.setAttribute('aria-label', isActive ? `${labelText} (active)` : labelText);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.addEventListener('click', () => {
        toggleMealFilterFamilyMember(member.id);
      });
      list.appendChild(button);
    });
    container.appendChild(list);
  };

  const configureFilterPanel = () => {
    const view = state.activeView;
    if (view === 'meal-plan') {
      configuredFilterView = view;
      renderRecipeFamilyFilter();
      if (elements.pantryOnlyToggle) {
        elements.pantryOnlyToggle.hidden = true;
        elements.pantryOnlyToggle.disabled = true;
        elements.pantryOnlyToggle.setAttribute('aria-hidden', 'true');
      }
      return;
    }
    renderRecipeFamilyFilter();
    if (configuredFilterView === view) {
      syncFilterControls();
      return;
    }
    configuredFilterView = view;
    const isMealsView = view === 'meals';
    const isKitchenView = view === 'kitchen';
    const isPantryView = view === 'pantry';
    if (elements.pantryOnlyToggle) {
      if (isMealsView) {
        elements.pantryOnlyToggle.hidden = false;
        elements.pantryOnlyToggle.disabled = false;
        elements.pantryOnlyToggle.removeAttribute('aria-hidden');
      } else {
        elements.pantryOnlyToggle.hidden = true;
        elements.pantryOnlyToggle.disabled = true;
        elements.pantryOnlyToggle.setAttribute('aria-hidden', 'true');
      }
    }
    if (elements.substitutionToggle) {
      if (isMealsView) {
        elements.substitutionToggle.hidden = false;
        elements.substitutionToggle.disabled = false;
        elements.substitutionToggle.removeAttribute('aria-hidden');
      } else {
        elements.substitutionToggle.hidden = true;
        elements.substitutionToggle.disabled = true;
        elements.substitutionToggle.setAttribute('aria-hidden', 'true');
      }
    }
    if (elements.filterSearch) {
      const searchPlaceholder = isMealsView
        ? 'Search by name, description, or tag'
        : isKitchenView
          ? 'Search equipment by name'
          : 'Search by ingredient name, slug, or tag';
      const searchLabel = isMealsView
        ? 'Search recipes'
        : isKitchenView
          ? 'Search kitchen equipment'
          : 'Search pantry';
      elements.filterSearch.placeholder = searchPlaceholder;
      elements.filterSearch.setAttribute('aria-label', searchLabel);
    }

    if (elements.ingredientSummary) {
      if (isMealsView) {
        elements.ingredientSummary.textContent = 'Ingredients';
      } else if (isPantryView) {
        elements.ingredientSummary.textContent = 'Categories';
      } else {
        elements.ingredientSummary.textContent = '';
      }
    }
    if (elements.tagSummary) {
      elements.tagSummary.textContent = isKitchenView ? '' : 'Tags';
    }
    if (elements.allergySummary) {
      if (isMealsView) {
        elements.allergySummary.textContent = 'Allergies to Avoid';
      } else if (isPantryView) {
        elements.allergySummary.textContent = 'Allergen Tags';
      } else {
        elements.allergySummary.textContent = '';
      }
    }
    if (elements.equipmentSummary) {
      elements.equipmentSummary.textContent = isMealsView ? 'Equipment' : '';
    }

    if (elements.equipmentSection) {
      elements.equipmentSection.hidden = !isMealsView;
    }

    if (elements.ingredientSection) {
      elements.ingredientSection.hidden = !isMealsView && !isPantryView;
    }
    if (elements.tagSection) {
      elements.tagSection.hidden = !isMealsView && !isPantryView;
    }
    if (elements.allergySection) {
      elements.allergySection.hidden = !isMealsView && !isPantryView;
    }

    if (elements.favoriteFilterToggle) {
      if (isMealsView) {
        elements.favoriteFilterToggle.hidden = false;
        elements.favoriteFilterToggle.disabled = false;
        elements.favoriteFilterToggle.removeAttribute('aria-hidden');
      } else {
        elements.favoriteFilterToggle.hidden = true;
        elements.favoriteFilterToggle.disabled = true;
        elements.favoriteFilterToggle.setAttribute('aria-hidden', 'true');
      }
    }

    if (isMealsView) {
      populateIngredientFilters(elements.ingredientOptions, ingredientFilterGroups);
      populateGroupedTagOptions('meals', elements.tagOptions, mealTagGroups, 'tags');
      populateCheckboxGroup('meals', elements.allergyOptions, allergyOptions, 'allergies', {
        labelFormatter: formatAllergenLabel,
      });
      populateCheckboxGroup('meals', elements.equipmentOptions, equipmentOptions, 'equipment');
    } else if (isPantryView) {
      if (elements.ingredientOptions) {
        elements.ingredientOptions.classList.remove('ingredient-groups');
        elements.ingredientOptions.classList.add('checkbox-grid');
      }
      if (elements.tagOptions) {
        elements.tagOptions.classList.remove('tag-groups');
        elements.tagOptions.classList.add('checkbox-grid');
      }
      tagGroupSummaryRegistry.pantry = [];
      populateCheckboxGroup('pantry', elements.ingredientOptions, ingredientCategoryOptions, 'categories');
      populateCheckboxGroup('pantry', elements.tagOptions, pantryTagOptions, 'tags');
      populateCheckboxGroup(
        'pantry',
        elements.allergyOptions,
        pantryAllergenOptions,
        'allergens',
        { labelFormatter: formatAllergenLabel },
      );
      if (elements.equipmentOptions) {
        elements.equipmentOptions.innerHTML = '';
      }
    } else {
      if (elements.ingredientOptions) {
        elements.ingredientOptions.innerHTML = '';
        elements.ingredientOptions.classList.remove('ingredient-groups');
        elements.ingredientOptions.classList.remove('checkbox-grid');
      }
      if (elements.tagOptions) {
        elements.tagOptions.innerHTML = '';
        elements.tagOptions.classList.remove('tag-groups');
        elements.tagOptions.classList.remove('checkbox-grid');
      }
      if (elements.allergyOptions) {
        elements.allergyOptions.innerHTML = '';
      }
    }

    syncFilterControls();
  };

  const syncFilterControls = () => {
    if (!elements.filterSearch) return;
    const filters = getActiveFilters();
    const isMealsView = state.activeView === 'meals';
    const familySelections = isMealsView ? getRecipeFamilyFilterSelections() : null;
    const familyAllergies = familySelections ? familySelections.allergies : new Set();
    const familyDiets = familySelections ? familySelections.diets : new Set();
    elements.filterSearch.value = filters.search || '';
    if (elements.favoriteFilterToggle) {
      const favoritesOnly = isMealsView && Boolean(filters.favoritesOnly);
      elements.favoriteFilterToggle.setAttribute('aria-pressed', favoritesOnly ? 'true' : 'false');
      elements.favoriteFilterToggle.classList.toggle('favorite-filter--active', favoritesOnly);
      const favoriteCount = state.favoriteRecipes.size;
      const titleText = favoritesOnly
        ? favoriteCount
          ? `Showing ${favoriteCount} favorite${favoriteCount === 1 ? '' : 's'}`
          : 'Showing favorite recipes only'
        : favoriteCount
          ? `Filter to ${favoriteCount} favorite${favoriteCount === 1 ? '' : 's'}`
          : 'Filter by favorite recipes';
      elements.favoriteFilterToggle.setAttribute('title', titleText);
      elements.favoriteFilterToggle.setAttribute('aria-label', titleText);
    }
    if (elements.pantryOnlyToggle) {
      if (isMealsView) {
        const pantryOnly = Boolean(filters.pantryOnly);
        elements.pantryOnlyToggle.hidden = false;
        elements.pantryOnlyToggle.disabled = false;
        elements.pantryOnlyToggle.classList.toggle('pantry-only-filter--active', pantryOnly);
        elements.pantryOnlyToggle.setAttribute('aria-pressed', pantryOnly ? 'true' : 'false');
        const label = elements.pantryOnlyToggle.querySelector('.pantry-only-filter__label');
        if (label) {
          label.textContent = 'Pantry';
        }
        const title = pantryOnly
          ? 'Pantry filter on: showing only recipes you can make from your pantry'
          : 'Pantry filter off: include all recipes';
        elements.pantryOnlyToggle.setAttribute('title', title);
        elements.pantryOnlyToggle.setAttribute('aria-label', title);
      } else {
        elements.pantryOnlyToggle.hidden = true;
        elements.pantryOnlyToggle.disabled = true;
      }
    }
    if (elements.substitutionToggle) {
      if (isMealsView) {
        const substitutionsAllowed = Boolean(filters.substitutionsAllowed);
        elements.substitutionToggle.hidden = false;
        elements.substitutionToggle.disabled = false;
        elements.substitutionToggle.classList.toggle(
          'substitution-toggle--active',
          substitutionsAllowed,
        );
        elements.substitutionToggle.setAttribute('aria-pressed', substitutionsAllowed ? 'true' : 'false');
        const substitutionTitle = substitutionsAllowed
          ? 'Substitutions on: recipes may use pantry-friendly alternatives'
          : 'Substitutions off: recipes must match pantry exactly';
        elements.substitutionToggle.setAttribute('title', substitutionTitle);
        elements.substitutionToggle.setAttribute('aria-label', substitutionTitle);
      } else {
        elements.substitutionToggle.hidden = true;
        elements.substitutionToggle.disabled = true;
      }
    }
    const registry = checkboxRegistry[state.activeView];
    if (!registry) return;
    Object.entries(registry).forEach(([field, map]) => {
      map.forEach((control, option) => {
        const isFamilySelection =
          isMealsView
          && ((field === 'allergies' && familyAllergies.has(option))
            || (field === 'tags' && familyDiets.has(option)));
        if (control instanceof HTMLButtonElement) {
          let targetState = getTriStateState(filters, field, option);
          if (isFamilySelection) {
            targetState = field === 'allergies' ? 'exclude' : 'include';
          }
          updateTriStateButtonState(control, targetState);
          control.disabled = Boolean(isFamilySelection);
          if (isFamilySelection) {
            control.classList.add('checkbox-option--locked');
            control.dataset.familySelection = 'true';
          } else {
            control.classList.remove('checkbox-option--locked');
            delete control.dataset.familySelection;
          }
        } else if (control instanceof HTMLInputElement) {
          const selected = Array.isArray(filters[field]) ? filters[field] : [];
          control.checked = selected.includes(option) || isFamilySelection;
          control.disabled = Boolean(isFamilySelection);
          const label = control.parentElement instanceof HTMLElement ? control.parentElement : null;
          if (label && label.classList.contains('checkbox-option')) {
            if (isFamilySelection) {
              label.classList.add('checkbox-option--locked');
              label.dataset.familySelection = 'true';
              control.dataset.familySelection = 'true';
            } else {
              label.classList.remove('checkbox-option--locked');
              delete label.dataset.familySelection;
              delete control.dataset.familySelection;
            }
          }
        }
      });
    });
    const summaryEntries = tagGroupSummaryRegistry[state.activeView];
    if (Array.isArray(summaryEntries)) {
      summaryEntries.forEach((entry) => {
        if (!entry) return;
        let selectedCount = 0;
        if (entry.triState) {
          const activeValues = new Set();
          const { include, exclude } = getTriStateSets(filters, entry.field);
          entry.optionValues.forEach((value) => {
            if (include.has(value) || exclude.has(value)) {
              activeValues.add(value);
            }
            if (
              isMealsView
              && entry.field === 'tags'
              && familyDiets instanceof Set
              && familyDiets.has(value)
            ) {
              activeValues.add(value);
            }
          });
          selectedCount = activeValues.size;
        } else {
          const selectedValues = Array.isArray(filters[entry.field]) ? filters[entry.field] : [];
          selectedCount = entry.optionValues.reduce(
            (count, value) =>
              selectedValues.includes(value)
                || (isMealsView && entry.field === 'tags' && familyDiets.has(value))
                ? count + 1
                : count,
            0,
          );
        }
        if (typeof entry.updateSelectionDisplay === 'function') {
          entry.updateSelectionDisplay(selectedCount);
        } else if (entry.countBadge && entry.summary) {
          if (selectedCount > 0) {
            entry.countBadge.textContent = `${selectedCount} selected`;
            entry.countBadge.hidden = false;
            entry.summary.setAttribute('aria-label', `${entry.label} (${selectedCount} selected)`);
          } else {
            entry.countBadge.textContent = '';
            entry.countBadge.hidden = true;
            entry.summary.setAttribute('aria-label', `${entry.label} (no tags selected)`);
          }
        }
      });
    }
  };

  const formatMealPlanLongDate = (date) =>
    date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  const getOrdinalSuffix = (value) => {
    const remainderTen = value % 10;
    const remainderHundred = value % 100;
    if (remainderTen === 1 && remainderHundred !== 11) return 'st';
    if (remainderTen === 2 && remainderHundred !== 12) return 'nd';
    if (remainderTen === 3 && remainderHundred !== 13) return 'rd';
    return 'th';
  };

  const formatMealPlanSummaryHeading = (date, entryCount) => {
    if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
      return 'Daily Summary';
    }
    const monthLabel = date.toLocaleDateString(undefined, { month: 'long' });
    const day = date.getDate();
    const suffix = getOrdinalSuffix(day);
    const total = Number.isFinite(entryCount) ? entryCount : 0;
    const mealLabel = total === 1 ? 'Meal' : 'Meals';
    return `${monthLabel} ${day}${suffix} Summary - ${total} ${mealLabel}`;
  };

  const formatMealPlanMonthLabel = (date) =>
    date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const formatMealPlanWeekLabel = (date) => {
    const start = getStartOfWeek(date);
    const end = getEndOfWeek(date);
    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();
    if (sameMonth) {
      const monthName = start.toLocaleDateString(undefined, { month: 'long' });
      return `${monthName} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }
    const startOptions = { month: 'short', day: 'numeric' };
    const endOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    if (!sameYear) {
      startOptions.year = 'numeric';
    }
    const startLabel = start.toLocaleDateString(undefined, startOptions);
    const endLabel = end.toLocaleDateString(undefined, endOptions);
    return `${startLabel} – ${endLabel}`;
  };

  const createMealPlanDayNamesRow = () => {
    const row = document.createElement('div');
    row.className = 'meal-plan-calendar__day-names';
    for (let offset = 0; offset < 7; offset += 1) {
      const dayIndex = (MEAL_PLAN_WEEK_START + offset) % 7;
      const label = MEAL_PLAN_DAY_NAMES[dayIndex] || '';
      const cell = document.createElement('div');
      cell.className = 'meal-plan-calendar__day-name';
      cell.textContent = label.slice(0, 3);
      cell.title = label;
      row.appendChild(cell);
    }
    return row;
  };

  const createMealPlanCalendarEntry = (entry) => {
    const normalizedType = mealPlanEntryTypeLookup.has(entry.type) ? entry.type : 'meal';
    const typeLabel = mealPlanEntryTypeLookup.get(normalizedType) || 'Meal';
    const wrapper = document.createElement('div');
    wrapper.className = 'meal-plan-calendar__entry';
    const typeBadge = document.createElement('span');
    typeBadge.className = `meal-plan-calendar__entry-type meal-plan-calendar__entry-type--${normalizedType}`;
    typeBadge.textContent = typeLabel.charAt(0).toUpperCase();
    typeBadge.title = typeLabel;
    wrapper.appendChild(typeBadge);
    const timeLabel = formatMealPlanTime(entry.time);
    if (timeLabel) {
      const time = document.createElement('span');
      time.className = 'meal-plan-calendar__entry-time';
      time.textContent = timeLabel;
      wrapper.appendChild(time);
    }
    const title = document.createElement('span');
    title.className = 'meal-plan-calendar__entry-title';
    title.textContent = entry.title;
    wrapper.appendChild(title);
    applyMealPlanFilterToElement(wrapper, entry);
    return wrapper;
  };

  const createMealPlanEntryElement = (entry, options = {}) => {
    const { showRemove = false, dateKey, showMeta = true } = options;
    const normalizedType = mealPlanEntryTypeLookup.has(entry.type) ? entry.type : 'meal';
    const typeLabel = mealPlanEntryTypeLookup.get(normalizedType) || 'Meal';
    const article = document.createElement('article');
    article.className = 'meal-plan-entry';
    const main = document.createElement('div');
    main.className = 'meal-plan-entry__main';
    const badge = document.createElement('span');
    badge.className = `meal-plan-entry__type meal-plan-entry__type--${normalizedType}`;
    badge.textContent = typeLabel.charAt(0).toUpperCase();
    badge.title = typeLabel;
    main.appendChild(badge);
    const content = document.createElement('div');
    content.className = 'meal-plan-entry__content';
    const title = document.createElement('p');
    title.className = 'meal-plan-entry__title';
    title.textContent = entry.title;
    content.appendChild(title);
    const timeLabel = formatMealPlanTime(entry.time);
    if (timeLabel) {
      const time = document.createElement('p');
      time.className = 'meal-plan-entry__time';
      time.textContent = timeLabel;
      content.appendChild(time);
    }
    if (showMeta) {
      const meta = document.createElement('p');
      meta.className = 'meal-plan-entry__meta';
      meta.textContent = typeLabel;
      content.appendChild(meta);
    }
    main.appendChild(content);
    article.appendChild(main);
    if (showRemove && dateKey) {
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'meal-plan-entry__remove';
      removeButton.dataset.removeEntry = entry.id;
      removeButton.dataset.entryDate = dateKey;
      removeButton.textContent = 'Remove';
      main.appendChild(removeButton);
    }
    applyMealPlanFilterToElement(article, entry);
    return article;
  };

  const appendEntryAttendanceControls = (article, entry, dateKey) => {
    if (!(article instanceof HTMLElement) || !entry || !dateKey) {
      return;
    }
    const attendance = sanitizeMealPlanAttendance(entry.attendance ?? entry.servings);
    const controls = document.createElement('div');
    controls.className = 'meal-plan-entry__attendance';

    const memberList = document.createElement('div');
    memberList.className = 'meal-plan-entry__members';
    state.familyMembers.forEach((member) => {
      if (!member || !member.id) {
        return;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'meal-plan-entry__member';
      button.dataset.entryId = entry.id;
      button.dataset.entryDate = dateKey;
      button.dataset.entryMember = member.id;
      button.title = member.name;
      button.textContent = member.icon || '👤';
      if (attendance.members.includes(member.id)) {
        button.classList.add('meal-plan-entry__member--active');
      }
      memberList.appendChild(button);
    });
    if (memberList.childElementCount) {
      controls.appendChild(memberList);
    } else {
      const empty = document.createElement('p');
      empty.className = 'meal-plan-entry__no-members';
      empty.textContent = 'Add family members to assign meals.';
      controls.appendChild(empty);
    }

    const guestField = document.createElement('label');
    guestField.className = 'meal-plan-entry__guest-field';
    guestField.setAttribute('for', `meal-plan-guests-${entry.id}`);
    const guestLabel = document.createElement('span');
    guestLabel.className = 'meal-plan-entry__guest-label';
    guestLabel.textContent = 'Guests';
    const guestInput = document.createElement('input');
    guestInput.type = 'number';
    guestInput.min = '0';
    guestInput.step = '1';
    guestInput.id = `meal-plan-guests-${entry.id}`;
    guestInput.className = 'meal-plan-entry__guest-input';
    guestInput.value = String(attendance.guests || 0);
    guestInput.dataset.entryId = entry.id;
    guestInput.dataset.entryDate = dateKey;
    guestInput.dataset.entryGuests = 'true';
    guestField.appendChild(guestLabel);
    guestField.appendChild(guestInput);
    controls.appendChild(guestField);

    article.appendChild(controls);
  };

  const ensureMealPlanMemberFilter = () => {
    const previous = JSON.stringify(state.mealPlanMemberFilter || []);
    const sanitized = sanitizeMealPlanMemberFilter(state.mealPlanMemberFilter);
    const next = JSON.stringify(sanitized);
    if (next !== previous) {
      state.mealPlanMemberFilter = sanitized;
      persistAppState();
    }
    return sanitized;
  };

  const doesEntryMatchMemberFilter = (entry, memberFilter) => {
    const activeFilter = Array.isArray(memberFilter)
      ? memberFilter
      : Array.isArray(state.mealPlanMemberFilter)
        ? state.mealPlanMemberFilter
        : [];
    if (!entry || !activeFilter.length) {
      return true;
    }
    const attendance = sanitizeMealPlanAttendance(entry.attendance ?? entry.servings);
    if (!attendance.members.length) {
      return false;
    }
    return attendance.members.some((memberId) => activeFilter.includes(memberId));
  };

  const applyMealPlanFilterToElement = (element, entry, memberFilter) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    const activeFilter = Array.isArray(memberFilter)
      ? memberFilter
      : Array.isArray(state.mealPlanMemberFilter)
        ? state.mealPlanMemberFilter
        : [];
    const shouldDim =
      activeFilter.length > 0 && !doesEntryMatchMemberFilter(entry, activeFilter);
    element.classList.toggle('meal-plan-item--dimmed', shouldDim);
  };

  const setMealPlanMemberFilter = (memberIds) => {
    const sanitized = sanitizeMealPlanMemberFilter(memberIds);
    const previous = JSON.stringify(state.mealPlanMemberFilter || []);
    const next = JSON.stringify(sanitized);
    if (previous === next) {
      return false;
    }
    state.mealPlanMemberFilter = sanitized;
    persistAppState();
    return true;
  };

  const toggleMealPlanMemberFilter = (memberId) => {
    if (typeof memberId !== 'string' || !memberId) {
      return;
    }
    const current = new Set(ensureMealPlanMemberFilter());
    if (current.has(memberId)) {
      current.delete(memberId);
    } else {
      current.add(memberId);
    }
    const changed = setMealPlanMemberFilter(Array.from(current));
    if (changed) {
      renderMealPlan();
    }
  };

  const createMealPlanCalendarCell = (date, options = {}) => {
    const iso = toISODateString(date);
    const today = getStartOfDay(new Date());
    const todayIso = toISODateString(today);
    const sourceEntries = Array.isArray(options.entries)
      ? options.entries
      : getMealPlanEntries(iso);
    const entries = sortMealPlanEntries(sourceEntries);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'meal-plan-calendar__cell';
    if (options.isCurrentMonth === false) {
      button.classList.add('meal-plan-calendar__cell--muted');
    }
    const isToday = iso === todayIso;
    const isSelected = iso === state.mealPlanSelectedDate;
    const isPast = date < today;
    if (isToday) {
      button.classList.add('meal-plan-calendar__cell--today');
    }
    if (isSelected) {
      button.classList.add('meal-plan-calendar__cell--selected');
      button.setAttribute('aria-current', 'date');
    } else if (isToday) {
      button.setAttribute('aria-current', 'date');
    }
    if (isPast && !isToday && !isSelected) {
      button.classList.add('meal-plan-calendar__cell--past');
    }
    if (isSelected && !isToday) {
      button.classList.add('meal-plan-calendar__cell--selected-outline');
    }
    if (entries.length) {
      button.classList.add('meal-plan-calendar__cell--has-entries');
    }
    const holidayLabels = getHolidayLabelsForDate(date);
    if (holidayLabels.length) {
      button.classList.add('meal-plan-calendar__cell--holiday');
    }
    const descriptiveLabel = `${formatMealPlanLongDate(date)}${holidayLabels.length
      ? `, ${holidayLabels.join(' and ')}`
      : ''}${entries.length
      ? `, ${entries.length} planned ${entries.length === 1 ? 'item' : 'items'}`
      : ', no planned items'}`;
    button.setAttribute('aria-label', descriptiveLabel);
    button.dataset.date = iso;
    button.addEventListener('click', () => {
      const shouldOpenModal = state.mealPlanViewMode !== 'day';
      if (state.mealPlanSelectedDate !== iso) {
        setMealPlanSelectedDate(iso);
        renderMealPlan();
      }
      if (shouldOpenModal) {
        openMealPlanDayModal(iso);
      }
    });
    const dateContainer = document.createElement('div');
    dateContainer.className = 'meal-plan-calendar__date';
    const number = document.createElement('span');
    number.className = 'meal-plan-calendar__date-number';
    number.textContent = String(date.getDate());
    dateContainer.appendChild(number);
    if (holidayLabels.length) {
      const holiday = document.createElement('span');
      holiday.className = 'meal-plan-calendar__holiday';
      holiday.textContent = holidayLabels.join(' • ');
      dateContainer.appendChild(holiday);
    }
    button.appendChild(dateContainer);
    const list = document.createElement('div');
    list.className = 'meal-plan-calendar__entries';
    const maxEntries = typeof options.maxEntries === 'number' ? options.maxEntries : 3;
    entries.slice(0, maxEntries).forEach((entry) => {
      list.appendChild(createMealPlanCalendarEntry(entry));
    });
    if (entries.length > maxEntries) {
      const more = document.createElement('span');
      more.className = 'meal-plan-calendar__more';
      more.textContent = `+${entries.length - maxEntries} more`;
      list.appendChild(more);
    }
    button.appendChild(list);
    return button;
  };

  const renderMealPlanFamilyFilter = (memberFilter = ensureMealPlanMemberFilter()) => {
    if (!elements.mealPlanFamilyFilter) {
      return;
    }
    const container = elements.mealPlanFamilyFilter;
    const members = ensureFamilySanitized();
    container.innerHTML = '';
    if (!members.length) {
      container.hidden = true;
      container.removeAttribute('data-filter-active');
      return;
    }
    container.hidden = false;
    if (memberFilter.length) {
      container.dataset.filterActive = 'true';
    } else {
      delete container.dataset.filterActive;
    }
    const label = document.createElement('span');
    label.className = 'meal-plan-family-filter__label';
    label.textContent = 'Family';
    container.appendChild(label);
    const list = document.createElement('div');
    list.className = 'meal-plan-family-filter__list';
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', 'Filter meal plan by family member');
    members.forEach((member) => {
      if (!member || !member.id) {
        return;
      }
      const isActive = memberFilter.includes(member.id);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'meal-plan-family-filter__button';
      if (isActive) {
        button.classList.add('meal-plan-family-filter__button--active');
      }
      button.textContent = member.icon || '👤';
      const labelText = `Filter meals for ${member.name}`;
      button.title = labelText;
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.setAttribute('aria-label', isActive ? `${labelText} (active)` : labelText);
      button.addEventListener('click', () => {
        toggleMealPlanMemberFilter(member.id);
      });
      list.appendChild(button);
    });
    container.appendChild(list);
  };

  const renderMealPlanMonthView = (selectedDate) => {
    const container = document.createElement('div');
    container.className = 'meal-plan-calendar__month';
    container.appendChild(createMealPlanDayNamesRow());
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    let cursor = getStartOfWeek(monthStart);
    const gridEnd = getEndOfWeek(monthEnd);
    while (cursor <= gridEnd) {
      const weekRow = document.createElement('div');
      weekRow.className = 'meal-plan-calendar__week';
      for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
        const currentDate = new Date(cursor);
        const iso = toISODateString(currentDate);
        weekRow.appendChild(
          createMealPlanCalendarCell(currentDate, {
            isCurrentMonth: currentDate.getMonth() === selectedDate.getMonth(),
            entries: getMealPlanEntries(iso),
            maxEntries: 3,
          }),
        );
        cursor = addDays(cursor, 1);
      }
      container.appendChild(weekRow);
    }
    return container;
  };

  const renderMealPlanWeekView = (selectedDate) => {
    const container = document.createElement('div');
    container.className = 'meal-plan-calendar__week-view';
    const header = document.createElement('div');
    header.className = 'meal-plan-calendar__week-header';
    const weekStart = getStartOfWeek(selectedDate);
    for (let offset = 0; offset < 7; offset += 1) {
      const dayIndex = (MEAL_PLAN_WEEK_START + offset) % 7;
      const day = addDays(weekStart, offset);
      const cell = document.createElement('div');
      cell.className = 'meal-plan-calendar__week-header-cell';
      const name = document.createElement('span');
      name.className = 'meal-plan-calendar__day-name';
      const label = MEAL_PLAN_DAY_NAMES[dayIndex] || '';
      name.textContent = label.slice(0, 3);
      name.title = label;
      cell.appendChild(name);
      const dateLabel = document.createElement('span');
      dateLabel.className = 'meal-plan-calendar__week-header-date';
      dateLabel.textContent = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      cell.appendChild(dateLabel);
      header.appendChild(cell);
    }
    container.appendChild(header);
    const body = document.createElement('div');
    body.className = 'meal-plan-calendar__week';
    for (let offset = 0; offset < 7; offset += 1) {
      const day = addDays(weekStart, offset);
      const iso = toISODateString(day);
      body.appendChild(
        createMealPlanCalendarCell(day, {
          isCurrentMonth: true,
          entries: getMealPlanEntries(iso),
          maxEntries: 4,
        }),
      );
    }
    container.appendChild(body);
    return container;
  };

  const createMealPlanDayDetailsContent = (selectedDate, selectedIso, options = {}) => {
    const {
      allowAttendance = false,
      allowRemoval = false,
      showMeta = true,
      showHeader = true,
      headingId,
      showEntries = true,
    } = options;
    const entries = sortMealPlanEntries(getMealPlanEntries(selectedIso));
    const wrapper = document.createElement('div');
    wrapper.className = 'meal-plan-day';
    const titleText = formatMealPlanLongDate(selectedDate);
    const subtitleText = entries.length
      ? `${entries.length} planned ${entries.length === 1 ? 'item' : 'items'}`
      : 'No meals planned yet.';
    if (showHeader) {
      const header = document.createElement('div');
      header.className = 'meal-plan-day__header';
      const title = document.createElement('h3');
      title.className = 'meal-plan-day__title';
      if (headingId) {
        title.id = headingId;
      }
      title.textContent = titleText;
      header.appendChild(title);
      const subtitle = document.createElement('p');
      subtitle.className = 'meal-plan-day__subtitle';
      subtitle.textContent = subtitleText;
      header.appendChild(subtitle);
      wrapper.appendChild(header);
    }
    if (!entries.length) {
      if (!showEntries) {
        return { container: wrapper, titleText, subtitleText, entryCount: entries.length };
      }
      const empty = document.createElement('p');
      empty.className = 'meal-plan-empty';
      empty.textContent = 'Add meals, drinks, or snacks to fill this day.';
      wrapper.appendChild(empty);
      return { container: wrapper, titleText, subtitleText, entryCount: entries.length };
    }
    if (!showEntries) {
      return { container: wrapper, titleText, subtitleText, entryCount: entries.length };
    }
    const list = document.createElement('div');
    list.className = 'meal-plan-day__list';
    entries.forEach((entry) => {
      const article = createMealPlanEntryElement(entry, {
        showRemove: allowRemoval,
        dateKey: allowRemoval ? selectedIso : undefined,
        showMeta,
      });
      if (allowAttendance) {
        appendEntryAttendanceControls(article, entry, selectedIso);
      }
      list.appendChild(article);
    });
    wrapper.appendChild(list);
    return { container: wrapper, titleText, subtitleText, entryCount: entries.length };
  };

  const renderMealPlanDayView = (selectedIso) => {
    const container = document.createElement('div');
    container.className = 'meal-plan-calendar__day';
    const selectedDate = parseISODateString(selectedIso) || new Date();
    const { container: content } = createMealPlanDayDetailsContent(selectedDate, selectedIso, {
      allowAttendance: false,
      allowRemoval: false,
      showMeta: true,
      showHeader: true,
    });
    container.appendChild(content);
    return container;
  };

  const renderMealPlanDayDetails = (selectedDate, selectedIso) => {
    if (!elements.mealPlanDayDetails) return;
    const container = elements.mealPlanDayDetails;
    container.innerHTML = '';
    const { container: content } = createMealPlanDayDetailsContent(selectedDate, selectedIso, {
      allowAttendance: false,
      allowRemoval: false,
      showMeta: false,
      showHeader: false,
      showEntries: false,
    });
    container.appendChild(content);
  };

  const renderMealPlanDayModal = (selectedDate, selectedIso) => {
    if (!dayModalState.body || !dayModalState.root) {
      return;
    }
    const { container, titleText, subtitleText } = createMealPlanDayDetailsContent(
      selectedDate,
      selectedIso,
      {
        allowAttendance: true,
        allowRemoval: true,
        showMeta: true,
        showHeader: false,
      },
    );
    dayModalState.requestedIso = selectedIso;
    dayModalState.body.innerHTML = '';
    dayModalState.body.appendChild(container);
    if (dayModalState.title) {
      dayModalState.title.textContent = titleText;
    }
    if (dayModalState.subtitle) {
      dayModalState.subtitle.textContent = subtitleText;
    }
    dayModalState.body.scrollTop = 0;
  };

  const refreshMealPlanDaySections = () => {
    const currentIso = state.mealPlanSelectedDate;
    const currentDate = parseISODateString(currentIso) || new Date();
    renderMealPlanDayDetails(currentDate, currentIso);
    renderMealPlanSummary(currentIso);
    if (dayModalState.isOpen) {
      renderMealPlanDayModal(currentDate, currentIso);
    }
  };

  const handleMealPlanDayModalKeydown = (event) => {
    if (event.key === 'Escape') {
      closeMealPlanDayModal();
    }
  };

  const openMealPlanDayModal = (selectedIso) => {
    if (!dayModalState.root) {
      return;
    }
    const iso = isValidISODateString(selectedIso) ? selectedIso : state.mealPlanSelectedDate;
    const selectedDate = parseISODateString(iso) || new Date();
    dayModalState.root.hidden = false;
    dayModalState.root.dataset.open = 'true';
    if (dayModalState.isOpen) {
      renderMealPlanDayModal(selectedDate, iso);
      return;
    }
    dayModalState.previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dayModalState.isOpen = true;
    renderMealPlanDayModal(selectedDate, iso);
    document.addEventListener('keydown', handleMealPlanDayModalKeydown);
    if (dayModalState.closeButton) {
      dayModalState.closeButton.focus();
    }
  };

  const closeMealPlanDayModal = () => {
    if (!dayModalState.root) {
      return;
    }
    dayModalState.root.hidden = true;
    dayModalState.root.removeAttribute('data-open');
    dayModalState.requestedIso = null;
    if (dayModalState.isOpen) {
      dayModalState.isOpen = false;
      document.removeEventListener('keydown', handleMealPlanDayModalKeydown);
      const { previousFocus } = dayModalState;
      dayModalState.previousFocus = null;
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    }
  };

  const handleMealPlanDayContainerClick = (event) => {
    const currentTarget = event.currentTarget instanceof Element ? event.currentTarget : null;
    const targetElement = event.target instanceof Element ? event.target : null;
    if (!currentTarget || !targetElement) return;
    const removeTarget = targetElement.closest('[data-remove-entry]');
    if (removeTarget && currentTarget.contains(removeTarget)) {
      const { removeEntry, entryDate } = removeTarget.dataset;
      if (removeEntry && entryDate) {
        removeMealPlanEntry(entryDate, removeEntry);
        renderMealPlan();
      }
      return;
    }
    const memberButton = targetElement.closest('[data-entry-member]');
    if (memberButton && currentTarget.contains(memberButton)) {
      const { entryMember, entryDate, entryId } = memberButton.dataset;
      if (entryMember && entryDate && entryId) {
        toggleMealPlanEntryMember(entryDate, entryId, entryMember);
        refreshMealPlanDaySections();
      }
    }
  };

  const handleMealPlanDayContainerChange = (event) => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (!input) return;
    if (input.dataset.entryGuests && input.dataset.entryDate && input.dataset.entryId) {
      const normalized = Math.max(0, parseNonNegativeInteger(input.value, 0));
      input.value = String(normalized);
      setMealPlanEntryGuests(input.dataset.entryDate, input.dataset.entryId, normalized);
      refreshMealPlanDaySections();
    }
  };

  const renderMealPlanSummary = (selectedIso) => {
    if (!elements.mealPlanSummary || !elements.mealPlanMacros) {
      return;
    }
    const macrosContainer = elements.mealPlanMacros;
    macrosContainer.innerHTML = '';
    const selectedDate = parseISODateString(selectedIso) || new Date();
    const entries = getMealPlanEntries(selectedIso);
    if (elements.mealPlanSummaryTitle) {
      elements.mealPlanSummaryTitle.textContent = formatMealPlanSummaryHeading(
        selectedDate,
        entries.length,
      );
    }
    const familyMembers = ensureFamilySanitized();
    const macroSummary = calculateDailyMacroSummary(selectedIso);
    const hasMacroData = entries.some((entry) => {
      const recipe = getRecipeForEntry(entry);
      return recipe && recipe.nutritionPerServing;
    });
    if (!hasMacroData) {
      const empty = document.createElement('p');
      empty.className = 'meal-plan-summary__empty';
      empty.textContent = 'Schedule recipes with nutrition details to see daily macros.';
      macrosContainer.appendChild(empty);
      return;
    }

    const totalPeople = macroSummary.overall.servings;
    const macroOptions = [];
    macroOptions.push({
      id: 'overall',
      label: 'Daily total',
      icon: '👥',
      bucket: macroSummary.overall,
      note: totalPeople
        ? `${totalPeople} ${totalPeople === 1 ? 'person' : 'people'} scheduled`
        : undefined,
    });

    familyMembers.forEach((member) => {
      const bucket = macroSummary.members.get(member.id) || createMacroBucket();
      const noteParts = [];
      if (member.allergies.length) {
        noteParts.push(`Allergies: ${member.allergies.join(', ')}`);
      }
      if (member.diets.length) {
        noteParts.push(`Diets: ${member.diets.join(', ')}`);
      }
      if (member.birthday) {
        const birthdayText = formatBirthday(member.birthday);
        if (birthdayText) {
          noteParts.push(`Birthday: ${birthdayText}`);
        }
      }
      if (member.preferences) {
        noteParts.push(member.preferences);
      }
      const note = noteParts.length ? noteParts.join(' • ') : undefined;
      macroOptions.push({
        id: member.id,
        label: member.name,
        icon: member.icon,
        bucket,
        note,
        targetCalories: member.targetCalories || undefined,
      });
    });

    if (macroSummary.guests.servings > 0) {
      macroOptions.push({
        id: 'guests',
        label: 'Guests',
        icon: '🎉',
        bucket: macroSummary.guests,
        note: 'Adjust guest count per meal entry.',
      });
    }

    const availableIds = macroOptions.map((option) => option.id);
    const activeId = ensureMealPlanMacroSelection(availableIds);
    const activeOption = macroOptions.find((option) => option.id === activeId) || macroOptions[0];

    if (macroOptions.length) {
      const iconRow = document.createElement('div');
      iconRow.className = 'meal-plan-macro-icons';
      macroOptions.forEach((option) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'meal-plan-macro-icons__button';
        const isActive = option.id === activeId;
        if (isActive) {
          button.classList.add('meal-plan-macro-icons__button--active');
        }
        const icon = option.icon || '👤';
        button.textContent = icon;
        const labelText = option.label || 'Family member';
        button.title = labelText;
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        button.setAttribute(
          'aria-label',
          isActive ? `${labelText} macros selected` : `Show macros for ${labelText}`,
        );
        button.addEventListener('click', () => {
          setMealPlanMacroSelection(option.id);
        });
        iconRow.appendChild(button);
      });
      macrosContainer.appendChild(iconRow);
    }

    const buildCard = (config) => {
      const { label, icon, bucket, note, targetCalories } = config;
      const section = document.createElement('section');
      section.className = 'meal-plan-summary__group';
      if (icon) {
        const avatar = document.createElement('span');
        avatar.className = 'meal-plan-summary__group-icon';
        avatar.textContent = icon;
        section.appendChild(avatar);
      }
      const heading = document.createElement('h4');
      heading.className = 'meal-plan-summary__group-title';
      heading.textContent = label;
      section.appendChild(heading);
      const subtitle = document.createElement('p');
      subtitle.className = 'meal-plan-summary__group-subtitle';
      subtitle.textContent = `Servings planned: ${bucket.servings || 0}`;
      section.appendChild(subtitle);
      if (note) {
        const noteEl = document.createElement('p');
        noteEl.className = 'meal-plan-summary__group-note';
        noteEl.textContent = note;
        section.appendChild(noteEl);
      }
      const statList = document.createElement('dl');
      statList.className = 'meal-plan-summary__stat-list';
      MACRO_KEYS.forEach((macro) => {
        const stat = document.createElement('div');
        stat.className = 'meal-plan-summary__stat';
        const dt = document.createElement('dt');
        dt.textContent = MACRO_LABELS[macro] || macro;
        const dd = document.createElement('dd');
        dd.textContent = `${formatMacroValue(bucket[macro], macro)} total`;
        if (bucket.servings > 0) {
          const perPerson = bucket[macro] / bucket.servings;
          const noteSpan = document.createElement('span');
          noteSpan.className = 'meal-plan-summary__stat-note';
          noteSpan.textContent = `${formatMacroValue(perPerson, macro)} each`;
          dd.appendChild(noteSpan);
        }
        stat.appendChild(dt);
        stat.appendChild(dd);
        statList.appendChild(stat);
      });
      if (typeof targetCalories === 'number' && bucket.servings > 0) {
        const totalCalories = bucket.calories || 0;
        const diff = targetCalories - totalCalories;
        const diffNote = document.createElement('div');
        diffNote.className = 'meal-plan-summary__target';
        diffNote.textContent = `Target: ${formatMacroValue(targetCalories, 'calories')} kcal · ${
          diff === 0
            ? 'on track'
            : `${diff > 0 ? '+' : ''}${formatMacroValue(diff, 'calories')} ${diff > 0 ? 'remaining' : 'over'}`
        }`;
        statList.appendChild(diffNote);
      }
      section.appendChild(statList);
      return section;
    };

    if (activeOption) {
      macrosContainer.appendChild(buildCard(activeOption));
    }
  };

  const updateMealPlanModeButtons = () => {
    if (!Array.isArray(elements.mealPlanModeButtons)) return;
    elements.mealPlanModeButtons.forEach((button) => {
      const mode = button.dataset.mealPlanMode;
      const isActive = mode === state.mealPlanViewMode;
      button.classList.toggle('view-toggle__button--active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  };

  const updateMealPlanPeriodLabel = (selectedDate) => {
    if (!elements.mealPlanPeriod) return;
    let label = '';
    if (state.mealPlanViewMode === 'week') {
      label = formatMealPlanWeekLabel(selectedDate);
    } else if (state.mealPlanViewMode === 'day') {
      label = formatMealPlanLongDate(selectedDate);
    } else {
      label = formatMealPlanMonthLabel(selectedDate);
    }
    elements.mealPlanPeriod.textContent = label;
  };

  const isLandscapeViewport = () => {
    const width = window.innerWidth || document.documentElement?.clientWidth || 0;
    const height = window.innerHeight || document.documentElement?.clientHeight || 0;
    if (width >= 1024) {
      return true;
    }
    if (!width || !height) {
      return false;
    }
    return width > height;
  };

  const resetMealPlanLayoutHeight = () => {
    if (!elements.mealPlanView) {
      return;
    }
    elements.mealPlanView.classList.remove('meal-plan-view--auto-height');
    elements.mealPlanView.style.removeProperty('--meal-plan-view-height');
    elements.mealPlanView.style.removeProperty('--meal-plan-layout-height');
  };

  let pendingMealPlanLayoutUpdate = false;

  const updateMealPlanLayoutHeight = () => {
    if (!elements.mealPlanView || !elements.mealPlanViewLayout) {
      return;
    }
    if (state.activeView !== 'meal-plan' || !isLandscapeViewport()) {
      resetMealPlanLayoutHeight();
      return;
    }

    const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
    if (!viewportHeight) {
      resetMealPlanLayoutHeight();
      return;
    }

    const viewRect = elements.mealPlanView.getBoundingClientRect();
    const bottomSpacing = 16;
    const availableHeight = viewportHeight - viewRect.top - bottomSpacing;
    if (availableHeight <= 0) {
      resetMealPlanLayoutHeight();
      return;
    }

    const viewStyles = window.getComputedStyle(elements.mealPlanView);
    const paddingTop = Number.parseFloat(viewStyles.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(viewStyles.paddingBottom) || 0;
    const gap = Number.parseFloat(viewStyles.rowGap || viewStyles.gap) || 0;
    const headerHeight = elements.mealPlanViewHeader
      ? elements.mealPlanViewHeader.getBoundingClientRect().height
      : 0;

    const layoutHeight = availableHeight - paddingTop - paddingBottom - gap - headerHeight;
    if (layoutHeight <= 0) {
      resetMealPlanLayoutHeight();
      return;
    }

    const resolvedLayoutHeight = Math.max(layoutHeight, 0);
    const resolvedViewHeight =
      resolvedLayoutHeight + paddingTop + paddingBottom + gap + headerHeight;

    elements.mealPlanView.classList.add('meal-plan-view--auto-height');
    elements.mealPlanView.style.setProperty(
      '--meal-plan-view-height',
      `${Math.round(resolvedViewHeight)}px`,
    );
    elements.mealPlanView.style.setProperty(
      '--meal-plan-layout-height',
      `${Math.round(resolvedLayoutHeight)}px`,
    );
  };

  const scheduleMealPlanLayoutUpdate = () => {
    if (pendingMealPlanLayoutUpdate) {
      return;
    }
    pendingMealPlanLayoutUpdate = true;
    window.requestAnimationFrame(() => {
      pendingMealPlanLayoutUpdate = false;
      updateMealPlanLayoutHeight();
    });
  };

  const renderMealPlanCalendar = (selectedDate, selectedIso) => {
    if (!elements.mealPlanCalendar) return;
    elements.mealPlanCalendar.innerHTML = '';
    elements.mealPlanCalendar.dataset.viewMode = state.mealPlanViewMode;
    let view;
    if (state.mealPlanViewMode === 'week') {
      view = renderMealPlanWeekView(selectedDate);
    } else if (state.mealPlanViewMode === 'day') {
      view = renderMealPlanDayView(selectedIso);
    } else {
      view = renderMealPlanMonthView(selectedDate);
    }
    if (view) {
      elements.mealPlanCalendar.appendChild(view);
    }
  };

  const renderMealPlan = () => {
    const selectedIso = ensureMealPlanSelection();
    const selectedDate = parseISODateString(selectedIso) || new Date();
    const memberFilter = ensureMealPlanMemberFilter();
    if (elements.mealPlanView) {
      if (memberFilter.length) {
        elements.mealPlanView.dataset.memberFilter = 'active';
      } else {
        delete elements.mealPlanView.dataset.memberFilter;
      }
    }
    renderMealPlanFamilyFilter(memberFilter);
    updateMealPlanModeButtons();
    updateMealPlanPeriodLabel(selectedDate);
    renderMealPlanCalendar(selectedDate, selectedIso);
    renderMealPlanDayDetails(selectedDate, selectedIso);
    renderMealPlanSummary(selectedIso);
    if (state.mealPlanViewMode === 'day') {
      closeMealPlanDayModal();
    } else if (dayModalState.isOpen) {
      renderMealPlanDayModal(selectedDate, selectedIso);
    }
    scheduleMealPlanLayoutUpdate();
  };

  const setMealPlanViewMode = (mode) => {
    if (!MEAL_PLAN_VIEW_MODES.includes(mode) || state.mealPlanViewMode === mode) {
      return;
    }
    state.mealPlanViewMode = mode;
    if (mode === 'day') {
      closeMealPlanDayModal();
    }
    renderMealPlan();
    persistAppState();
  };

  const adjustMealPlanSelection = (step) => {
    if (!Number.isInteger(step) || step === 0) {
      return;
    }
    const current = parseISODateString(ensureMealPlanSelection());
    if (!current) {
      return;
    }
    let nextDate;
    if (state.mealPlanViewMode === 'month') {
      nextDate = addMonths(current, step);
    } else if (state.mealPlanViewMode === 'week') {
      nextDate = addDays(current, step * 7);
    } else {
      nextDate = addDays(current, step);
    }
    setMealPlanSelectedDate(toISODateString(nextDate));
    renderMealPlan();
  };

  const evaluatePantryMatch = (recipe, { allowSubstitutions = false } = {}) => {
    const result = { satisfied: false, missing: [], substitutions: [] };
    if (!recipe || !recipe.id) {
      return result;
    }
    const matchedSlugs = recipeIngredientMatches.get(recipe.id);
    if (!(matchedSlugs instanceof Set) || matchedSlugs.size === 0) {
      return result;
    }
    const inventory = state.pantryInventory || {};
    const missing = [];
    const substitutions = [];
    matchedSlugs.forEach((slug) => {
      if (inventory[slug]) {
        return;
      }
      if (allowSubstitutions) {
        const family = substitutionGraph.get(slug);
        if (family && family.members instanceof Set) {
          const alternativeSlug = Array.from(family.members).find((candidate) => {
            if (candidate === slug) {
              return false;
            }
            return Boolean(inventory[candidate]);
          });
          if (alternativeSlug) {
            substitutions.push({
              requiredSlug: slug,
              substituteSlug: alternativeSlug,
              required: ingredientBySlug.get(slug) || { name: slug },
              substitute: ingredientBySlug.get(alternativeSlug) || { name: alternativeSlug },
              familyLabel: family.label,
            });
            return;
          }
        }
      }
      missing.push(slug);
    });
    return { satisfied: missing.length === 0, missing, substitutions };
  };

  const canMakeRecipeFromPantry = (recipe) => {
    if (!recipe || !recipe.id) {
      return false;
    }
    const filters = ensureMealFilters();
    const allowSubstitutions = Boolean(filters.substitutionsAllowed);
    const evaluation = evaluatePantryMatch(recipe, { allowSubstitutions });
    return evaluation.satisfied;
  };

  const matchesMealFilters = (recipe) => {
    const filters = ensureMealFilters();
    const haystack = `${recipe.name} ${recipe.description} ${(recipe.tags || []).join(' ')} ${recipe.category}`.toLowerCase();
    if (filters.search && !haystack.includes(filters.search.toLowerCase())) {
      return false;
    }
    const { allergies: familyAllergies, diets: familyDiets } = getRecipeFamilyFilterSelections();
    const ingredientSelections = getTriStateSets(filters, 'ingredients');
    if (ingredientSelections.include.size) {
      const matchedIngredients = recipeIngredientMatches.get(recipe.id) || new Set();
      const hasAllSelected = Array.from(ingredientSelections.include).every((slug) => matchedIngredients.has(slug));
      if (!hasAllSelected) {
        return false;
      }
    }
    if (ingredientSelections.exclude.size) {
      const matchedIngredients = recipeIngredientMatches.get(recipe.id) || new Set();
      const hasExcluded = Array.from(ingredientSelections.exclude).some((slug) => matchedIngredients.has(slug));
      if (hasExcluded) {
        return false;
      }
    }
    const tagSelections = getTriStateSets(filters, 'tags');
    if (familyDiets instanceof Set) {
      familyDiets.forEach((diet) => {
        tagSelections.include.add(diet);
        tagSelections.exclude.delete(diet);
      });
    }
    if (tagSelections.include.size) {
      const recipeTags = Array.isArray(recipe.tags) ? recipe.tags : [];
      const hasAllTagSelections = Array.from(tagSelections.include).every((selected) => {
        const candidateSet = canonicalTagLookup.get(selected);
        const available = candidateSet instanceof Set ? Array.from(candidateSet) : [selected];
        return available.some((tag) => recipeTags.includes(tag));
      });
      if (!hasAllTagSelections) {
        return false;
      }
    }
    if (tagSelections.exclude.size) {
      const recipeTags = Array.isArray(recipe.tags) ? recipe.tags : [];
      const hasExcludedTag = Array.from(tagSelections.exclude).some((selected) => {
        const candidateSet = canonicalTagLookup.get(selected);
        const available = candidateSet instanceof Set ? Array.from(candidateSet) : [selected];
        return available.some((tag) => recipeTags.includes(tag));
      });
      if (hasExcludedTag) {
        return false;
      }
    }
    const allergySelections = getTriStateSets(filters, 'allergies');
    if (familyAllergies instanceof Set) {
      familyAllergies.forEach((allergen) => {
        allergySelections.exclude.add(allergen);
        allergySelections.include.delete(allergen);
      });
    }
    if (allergySelections.include.size) {
      const recipeAllergens = Array.isArray(recipe.allergens) ? recipe.allergens : [];
      const hasAllIncluded = Array.from(allergySelections.include).every((allergen) => recipeAllergens.includes(allergen));
      if (!hasAllIncluded) {
        return false;
      }
    }
    if (
      allergySelections.exclude.size
      && (recipe.allergens || []).some((allergen) => allergySelections.exclude.has(allergen))
    ) {
      return false;
    }
    const equipmentSelections = getTriStateSets(filters, 'equipment');
    const recipeEquipment = Array.isArray(recipe.equipment) ? recipe.equipment : [];
    if (equipmentSelections.include.size) {
      const hasAllEquipment = Array.from(equipmentSelections.include).every((item) => recipeEquipment.includes(item));
      if (!hasAllEquipment) {
        return false;
      }
    }
    if (equipmentSelections.exclude.size) {
      const hasExcludedEquipment = Array.from(equipmentSelections.exclude).some((item) => recipeEquipment.includes(item));
      if (hasExcludedEquipment) {
        return false;
      }
    }
    if (filters.favoritesOnly && !state.favoriteRecipes.has(recipe.id)) {
      return false;
    }
    if (filters.pantryOnly && !canMakeRecipeFromPantry(recipe)) {
      return false;
    }
    return true;
  };

  const isRecipeFavorite = (recipeId) => state.favoriteRecipes.has(recipeId);

  const isPantryFavorite = (slug) => state.favoritePantryItems.has(slug);

  const toggleFavoriteRecipe = (recipeId) => {
    if (!recipeId) return;
    if (state.favoriteRecipes.has(recipeId)) {
      state.favoriteRecipes.delete(recipeId);
    } else {
      state.favoriteRecipes.add(recipeId);
    }
    persistFavoriteRecipeIds();
    renderApp();
  };

  const togglePantryFavorite = (slug) => {
    if (typeof slug !== 'string' || !slug) {
      return;
    }
    const favorites = state.favoritePantryItems;
    if (favorites.has(slug)) {
      favorites.delete(slug);
    } else if (ingredientSlugSet.has(slug)) {
      favorites.add(slug);
    }
    persistFavoritePantrySlugs();
    if (state.activeView === 'pantry') {
      renderPantry();
    } else {
      renderApp();
    }
  };

  const createMealCard = (recipe) => {
    const card = document.createElement('article');
    card.className = 'meal-card';

    const filters = ensureMealFilters();
    const substitutionsAllowed = Boolean(filters.substitutionsAllowed);
    const pantryEvaluation = substitutionsAllowed
      ? evaluatePantryMatch(recipe, { allowSubstitutions: true })
      : null;

    const favorite = isRecipeFavorite(recipe.id);
    if (favorite) {
      card.classList.add('meal-card--favorite');
    }

    const currentServings = state.servingOverrides[recipe.id] ?? recipe.baseServings;
    const scale = recipe.baseServings ? currentServings / recipe.baseServings : 1;

    const header = document.createElement('header');
    header.className = 'meal-card__header';

    const headerInfo = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = recipe.name;
    headerInfo.appendChild(title);

    const description = document.createElement('p');
    description.className = 'meal-card__description';
    description.textContent = recipe.description;
    headerInfo.appendChild(description);

    const tagList = document.createElement('div');
    tagList.className = 'tag-list';
    (recipe.tags || []).forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'badge';
      span.textContent = tag;
      tagList.appendChild(span);
    });
    headerInfo.appendChild(tagList);
    header.appendChild(headerInfo);

    const headerActions = document.createElement('div');
    headerActions.className = 'meal-card__header-actions';

    const scheduleButton = document.createElement('button');
    scheduleButton.type = 'button';
    scheduleButton.className = 'meal-card__schedule-button';
    const recipeNameForLabel = typeof recipe.name === 'string' ? recipe.name : 'this recipe';
    scheduleButton.setAttribute('aria-label', `Add ${recipeNameForLabel} to calendar`);
    scheduleButton.title = 'Schedule recipe';
    scheduleButton.innerHTML = `
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="3.75" y="4.5" width="16.5" height="15" rx="2" stroke="currentColor" stroke-width="1.5" />
        <path d="M8 2.75v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M16 2.75v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M3.75 9h16.5" stroke="currentColor" stroke-width="1.5" />
        <circle cx="12" cy="14.5" r="3" stroke="currentColor" stroke-width="1.5" />
        <path d="M12 13v2l1.25.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
    scheduleButton.addEventListener('click', (event) => {
      event.stopPropagation();
      openRecipeScheduleDialog(recipe);
    });
    headerActions.appendChild(scheduleButton);

    const favoriteButton = document.createElement('button');
    favoriteButton.type = 'button';
    favoriteButton.className = 'meal-card__favorite-button';
    favoriteButton.setAttribute('aria-pressed', favorite ? 'true' : 'false');
    favoriteButton.setAttribute(
      'aria-label',
      favorite ? 'Remove from favorites' : 'Add to favorites',
    );
    favoriteButton.title = favorite ? 'Remove from favorites' : 'Add to favorites';
    if (favorite) {
      favoriteButton.classList.add('meal-card__favorite-button--active');
    }
    favoriteButton.textContent = '♥';
    favoriteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleFavoriteRecipe(recipe.id);
    });
    headerActions.appendChild(favoriteButton);

    const baseServings = Math.max(1, Number(recipe.baseServings) || 1);
    const updateServings = (delta) => {
      const currentValue = state.servingOverrides[recipe.id] ?? baseServings;
      const nextValue = Math.max(1, Math.round(currentValue + delta));
      if (nextValue === currentValue) {
        return;
      }
      if (nextValue === baseServings) {
        delete state.servingOverrides[recipe.id];
      } else {
        state.servingOverrides[recipe.id] = nextValue;
      }
      renderApp();
    };

    const controls = document.createElement('div');
    controls.className = 'serving-controls';
    const increaseButton = document.createElement('button');
    increaseButton.type = 'button';
    increaseButton.className = 'serving-controls__chevron';
    increaseButton.textContent = '⌃';
    increaseButton.setAttribute('aria-label', `Increase servings for ${recipeNameForLabel}`);
    increaseButton.addEventListener('click', (event) => {
      event.stopPropagation();
      updateServings(1);
    });
    controls.appendChild(increaseButton);

    const display = document.createElement('div');
    display.className = 'serving-controls__display';
    display.textContent = `[${currentServings}] Servings`;
    controls.appendChild(display);

    const decreaseButton = document.createElement('button');
    decreaseButton.type = 'button';
    decreaseButton.className = 'serving-controls__chevron';
    decreaseButton.textContent = '⌄';
    decreaseButton.setAttribute('aria-label', `Decrease servings for ${recipeNameForLabel}`);
    decreaseButton.addEventListener('click', (event) => {
      event.stopPropagation();
      updateServings(-1);
    });
    controls.appendChild(decreaseButton);
    headerActions.appendChild(controls);
    header.appendChild(headerActions);
    card.appendChild(header);

    const ingredientSection = document.createElement('section');
    ingredientSection.className = 'meal-card__section';
    const ingredientHeading = document.createElement('h4');
    ingredientHeading.textContent = 'Ingredients';
    ingredientSection.appendChild(ingredientHeading);
    if (substitutionsAllowed && pantryEvaluation && pantryEvaluation.substitutions.length) {
      const substitutionNotice = document.createElement('div');
      substitutionNotice.className = 'meal-card__substitution-notice';
      const substitutionTitle = document.createElement('span');
      substitutionTitle.className = 'meal-card__substitution-title';
      substitutionTitle.textContent =
        pantryEvaluation.substitutions.length === 1 ? 'Using a substitute' : 'Using substitutes';
      substitutionNotice.appendChild(substitutionTitle);
      const substitutionList = document.createElement('ul');
      substitutionList.className = 'meal-card__substitution-list';
      pantryEvaluation.substitutions.forEach((entry) => {
        if (!entry) return;
        const item = document.createElement('li');
        const requiredName = entry.required?.name || entry.requiredSlug || 'Required ingredient';
        const substituteName = entry.substitute?.name || entry.substituteSlug || 'Alternative';
        const labelPrefix = entry.familyLabel ? `${entry.familyLabel}: ` : '';
        item.textContent = `${labelPrefix}${requiredName} → ${substituteName}`;
        substitutionList.appendChild(item);
      });
      substitutionNotice.appendChild(substitutionList);
      ingredientSection.appendChild(substitutionNotice);
    }
    const ingredientList = document.createElement('ul');
    ingredientList.className = 'ingredient-list';
    recipe.ingredients.forEach((ingredient) => {
      const item = document.createElement('li');
      const quantity = document.createElement('span');
      quantity.className = 'ingredient-quantity';
      const rawQuantity = ingredient.quantity;
      const scaledQuantity =
        typeof rawQuantity === 'number' ? rawQuantity * scale : rawQuantity;
      const measurement = formatIngredientMeasurement(scaledQuantity, ingredient.unit);
      quantity.textContent = [measurement.quantityText, measurement.unitText]
        .filter(Boolean)
        .join(' ');
      const name = document.createElement('span');
      name.className = 'ingredient-name';
      name.textContent = ingredient.item;
      item.appendChild(quantity);
      item.appendChild(name);
      ingredientList.appendChild(item);
    });
    ingredientSection.appendChild(ingredientList);
    card.appendChild(ingredientSection);

    const instructionSection = document.createElement('section');
    instructionSection.className = 'meal-card__section';
    const instructionHeading = document.createElement('h4');
    instructionHeading.textContent = 'Instructions';
    instructionSection.appendChild(instructionHeading);
    const instructionList = document.createElement('ol');
    instructionList.className = 'instruction-list';
    recipe.instructions.forEach((step) => {
      const li = document.createElement('li');
      li.textContent = step;
      instructionList.appendChild(li);
    });
    instructionSection.appendChild(instructionList);
    card.appendChild(instructionSection);

    const details = document.createElement('section');
    details.className = 'meal-card__details';

    const equipmentBlock = document.createElement('div');
    const equipmentHeading = document.createElement('h4');
    equipmentHeading.textContent = 'Equipment';
    equipmentBlock.appendChild(equipmentHeading);
    const equipmentList = document.createElement('ul');
    equipmentList.className = 'inline-list';
    (recipe.equipment || []).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      equipmentList.appendChild(li);
    });
    equipmentBlock.appendChild(equipmentList);
    details.appendChild(equipmentBlock);

    const allergenBlock = document.createElement('div');
    const allergenHeading = document.createElement('h4');
    allergenHeading.textContent = 'Allergens';
    allergenBlock.appendChild(allergenHeading);
    const allergenList = document.createElement('ul');
    allergenList.className = 'inline-list';
    if ((recipe.allergens || []).length) {
      recipe.allergens.forEach((allergen) => {
        const li = document.createElement('li');
        li.className = 'badge badge-soft';
        li.textContent = formatAllergenLabel(allergen);
        allergenList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.className = 'badge badge-soft';
      li.textContent = 'None';
      allergenList.appendChild(li);
    }
    allergenBlock.appendChild(allergenList);
    details.appendChild(allergenBlock);
    card.appendChild(details);

    if (recipe.nutritionPerServing) {
      const nutritionSection = document.createElement('section');
      nutritionSection.className = 'meal-card__section nutrition';
      const nutritionHeading = document.createElement('h4');
      nutritionHeading.textContent = 'Nutrition';
      nutritionSection.appendChild(nutritionHeading);
      const grid = document.createElement('div');
      grid.className = 'nutrition-grid';
      const totalNutrition = {};
      Object.entries(recipe.nutritionPerServing).forEach(([key, value]) => {
        totalNutrition[key] = Math.round(value * currentServings * 10) / 10;
      });
      Object.entries(recipe.nutritionPerServing).forEach(([key, value]) => {
        const cell = document.createElement('div');
        const labelEl = document.createElement('span');
        labelEl.className = 'nutrition-label';
        labelEl.textContent = key;
        const valueEl = document.createElement('span');
        valueEl.className = 'nutrition-value';
        valueEl.textContent = `${value} / serving`;
        cell.appendChild(labelEl);
        cell.appendChild(valueEl);
        if (totalNutrition[key] !== undefined) {
          const totalEl = document.createElement('span');
          totalEl.className = 'nutrition-total';
          totalEl.textContent = `${totalNutrition[key]} total`;
          cell.appendChild(totalEl);
        }
        grid.appendChild(cell);
      });
      nutritionSection.appendChild(grid);
      card.appendChild(nutritionSection);
    }

    const footer = document.createElement('footer');
    footer.className = 'meal-card__footer';
    const notesButton = document.createElement('button');
    notesButton.type = 'button';
    const isOpen = Boolean(state.openNotes[recipe.id]);
    notesButton.textContent = isOpen ? 'Hide notes' : 'Add notes';
    notesButton.addEventListener('click', () => {
      if (state.openNotes[recipe.id]) {
        delete state.openNotes[recipe.id];
      } else {
        state.openNotes[recipe.id] = true;
      }
      renderApp();
    });
    footer.appendChild(notesButton);
    if (isOpen) {
      const textarea = document.createElement('textarea');
      textarea.value = state.notes[recipe.id] || '';
      textarea.placeholder = 'Add personal notes, timing adjustments, or plating ideas';
      textarea.addEventListener('input', (event) => {
        state.notes[recipe.id] = event.target.value;
        persistAppState();
      });
      footer.appendChild(textarea);
    }
    card.appendChild(footer);

    return card;
  };

  const createPantryCard = (ingredient) => {
    const card = document.createElement('article');
    card.className = 'pantry-card';

    const entry = getPantryEntry(ingredient.slug);
    const favorite = isPantryFavorite(ingredient.slug);
    if (favorite) {
      card.classList.add('pantry-card--favorite');
    }

    const details = document.createElement('div');
    details.className = 'pantry-card__details';

    const header = document.createElement('div');
    header.className = 'pantry-card__header';

    const title = document.createElement('h3');
    title.className = 'pantry-card__name';
    title.textContent = ingredient.name;
    header.appendChild(title);

    const headerActions = document.createElement('div');
    headerActions.className = 'pantry-card__header-actions';

    const favoriteButton = document.createElement('button');
    favoriteButton.type = 'button';
    favoriteButton.className = 'pantry-card__favorite-button';
    favoriteButton.innerHTML = '<span aria-hidden="true">♥</span>';
    const favoriteLabel = favorite
      ? `Remove ${ingredient.name} from favorite pantry items`
      : `Mark ${ingredient.name} as a favorite pantry item`;
    favoriteButton.setAttribute('aria-label', favoriteLabel);
    favoriteButton.title = favoriteLabel;
    favoriteButton.setAttribute('aria-pressed', favorite ? 'true' : 'false');
    if (favorite) {
      favoriteButton.classList.add('pantry-card__favorite-button--active');
    }
    favoriteButton.addEventListener('click', (event) => {
      event.preventDefault();
      togglePantryFavorite(ingredient.slug);
    });
    headerActions.appendChild(favoriteButton);

    const inlineControls = document.createElement('div');
    inlineControls.className = 'pantry-card__inline-controls';

    const quantityInput = document.createElement('input');
    quantityInput.className = 'pantry-card__inline-input pantry-card__inline-input--quantity';
    quantityInput.type = 'number';
    quantityInput.min = '0';
    quantityInput.step = '0.25';
    quantityInput.inputMode = 'decimal';
    quantityInput.autocomplete = 'off';
    quantityInput.setAttribute('aria-label', `Quantity for ${ingredient.name}`);
    quantityInput.title = `Quantity for ${ingredient.name}`;
    if (entry.quantity !== undefined && entry.quantity !== '') {
      quantityInput.value = entry.quantity;
    } else {
      quantityInput.value = '';
    }
    quantityInput.placeholder = '0';
    quantityInput.addEventListener('input', (event) => {
      updatePantryEntry(ingredient.slug, { quantity: event.target.value });
    });
    inlineControls.appendChild(quantityInput);

    const unitInput = document.createElement('input');
    unitInput.className = 'pantry-card__inline-input pantry-card__inline-input--unit';
    unitInput.type = 'text';
    unitInput.setAttribute('list', 'pantry-unit-options');
    unitInput.placeholder = DEFAULT_PANTRY_UNIT;
    const normalizedUnit = entry.unit || DEFAULT_PANTRY_UNIT;
    unitInput.value = normalizedUnit === DEFAULT_PANTRY_UNIT ? '' : normalizedUnit;
    unitInput.autocomplete = 'off';
    unitInput.spellcheck = false;
    unitInput.setAttribute('aria-label', `Unit for ${ingredient.name}`);
    unitInput.title = `Unit for ${ingredient.name}`;
    const handleUnitChange = (event) => {
      updatePantryEntry(ingredient.slug, { unit: event.target.value });
    };
    unitInput.addEventListener('input', handleUnitChange);
    unitInput.addEventListener('change', handleUnitChange);
    inlineControls.appendChild(unitInput);
    headerActions.appendChild(inlineControls);
    header.appendChild(headerActions);
    details.appendChild(header);

    if (Array.isArray(ingredient.tags) && ingredient.tags.length) {
      const tags = document.createElement('div');
      tags.className = 'pantry-card__tags';
      ingredient.tags.forEach((tag) => {
        const span = document.createElement('span');
        span.textContent = tag;
        tags.appendChild(span);
      });
      details.appendChild(tags);
    }

    card.appendChild(details);

    return card;
  };

  const createKitchenCard = (item) => {
    const card = document.createElement('article');
    card.className = 'pantry-card kitchen-card';

    const header = document.createElement('header');
    header.className = 'pantry-card__header';

    const title = document.createElement('h3');
    title.className = 'pantry-card__name';
    title.textContent = item.name;
    header.appendChild(title);

    card.appendChild(header);

    const usage = document.createElement('p');
    usage.className = 'kitchen-card__usage';
    const count = Number(item.count) || 0;
    usage.textContent =
      count === 1 ? 'Used in 1 recipe' : `Used in ${count.toLocaleString()} recipes`;
    card.appendChild(usage);

    return card;
  };

  const renderMeals = () => {
    if (!elements.mealGrid) {
      return;
    }
    const filters = ensureMealFilters();
    const filteredRecipes = recipes.filter((recipe) => matchesMealFilters(recipe));
    elements.mealGrid.innerHTML = '';
    if (filteredRecipes.length) {
      filteredRecipes.forEach((recipe) => {
        elements.mealGrid.appendChild(createMealCard(recipe));
      });
    } else {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const heading = document.createElement('h3');
      const paragraph = document.createElement('p');
      if (filters.favoritesOnly) {
        heading.textContent = 'No favorite recipes yet';
        paragraph.textContent =
          'Tap the heart icon on any recipe to save it as a favorite and quickly find it here.';
      } else {
        heading.textContent = 'No recipes found';
        paragraph.textContent =
          'Try removing a filter or adding more pantry items to expand your options.';
      }
      empty.appendChild(heading);
      empty.appendChild(paragraph);
      elements.mealGrid.appendChild(empty);
    }
  };

  const renderKitchen = () => {
    if (!elements.kitchenGrid || !elements.kitchenCount) {
      return;
    }
    const filters = ensureKitchenFilters();
    const query = filters.search.trim().toLowerCase();
    const filteredItems = kitchenItems.filter((item) => {
      if (!query) {
        return true;
      }
      return item.searchText.includes(query);
    });

    elements.kitchenCount.textContent = filteredItems.length;
    elements.kitchenGrid.innerHTML = '';

    if (!filteredItems.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const heading = document.createElement('h3');
      heading.textContent = 'No kitchen tools found';
      const paragraph = document.createElement('p');
      paragraph.textContent = 'Try refining your search or explore recipes for more equipment ideas.';
      empty.appendChild(heading);
      empty.appendChild(paragraph);
      elements.kitchenGrid.appendChild(empty);
      return;
    }

    const groups = [];
    filteredItems.forEach((item) => {
      const initial = item.name.charAt(0).toUpperCase();
      const label = initial && /[A-Z]/.test(initial) ? initial : '#';
      const previous = groups[groups.length - 1];
      if (!previous || previous.label !== label) {
        groups.push({ label, items: [item] });
      } else {
        previous.items.push(item);
      }
    });

    groups.forEach((group) => {
      const section = document.createElement('section');
      section.className = 'pantry-category';

      const heading = document.createElement('h3');
      heading.className = 'pantry-category__title';
      heading.textContent = group.label === '#' ? 'Other' : group.label;
      section.appendChild(heading);

      const list = document.createElement('div');
      list.className = 'pantry-category__list';
      group.items.forEach((item) => {
        list.appendChild(createKitchenCard(item));
      });
      section.appendChild(list);

      elements.kitchenGrid.appendChild(section);
    });
  };

  const renderPantry = () => {
    if (!elements.pantryGrid || !elements.pantryCount) return;
    const { search, categories, tags, allergens } = state.pantryFilters;
    const query = search.trim().toLowerCase();
    const favorites = state.favoritePantryItems instanceof Set ? state.favoritePantryItems : new Set();
    const filteredItems = ingredients
      .filter((ingredient) => {
        const ingredientTags = Array.isArray(ingredient.tags) ? ingredient.tags : [];
        const category = ingredient.category;
        if (categories.length && (!category || !categories.includes(category))) return false;
        if (tags.length && !tags.every((tag) => ingredientTags.includes(tag))) return false;
        if (allergens.length && !allergens.every((tag) => ingredientTags.includes(tag))) return false;
        if (!query) return true;
        const haystack = `${ingredient.name} ${ingredient.slug} ${ingredientTags.join(' ')}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        const rankA = categoryRanks.get(a.category) ?? 0;
        const rankB = categoryRanks.get(b.category) ?? 0;
        if (rankA !== rankB) return rankA - rankB;
        const favoriteA = favorites.has(a.slug) ? 1 : 0;
        const favoriteB = favorites.has(b.slug) ? 1 : 0;
        if (favoriteA !== favoriteB) return favoriteB - favoriteA;
        return a.name.localeCompare(b.name);
      });

    elements.pantryCount.textContent = filteredItems.length;
    elements.pantryGrid.innerHTML = '';
    if (!filteredItems.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const heading = document.createElement('h3');
      heading.textContent = 'No pantry items found';
      const paragraph = document.createElement('p');
      paragraph.textContent = 'Try adjusting your filters or search to find more ingredients.';
      empty.appendChild(heading);
      empty.appendChild(paragraph);
      elements.pantryGrid.appendChild(empty);
      return;
    }

    const groupedItems = [];
    filteredItems.forEach((ingredient) => {
      const categoryName = ingredient.category || 'Uncategorized';
      const previous = groupedItems[groupedItems.length - 1];
      if (!previous || previous.category !== categoryName) {
        groupedItems.push({ category: categoryName, items: [ingredient] });
      } else {
        previous.items.push(ingredient);
      }
    });

    groupedItems.forEach((group) => {
      const section = document.createElement('section');
      section.className = 'pantry-category';

      const heading = document.createElement('h3');
      heading.className = 'pantry-category__title';
      heading.textContent = group.category;
      section.appendChild(heading);

      const list = document.createElement('div');
      list.className = 'pantry-category__list';
      group.items.forEach((ingredient) => {
        list.appendChild(createPantryCard(ingredient));
      });
      section.appendChild(list);

      elements.pantryGrid.appendChild(section);
    });
  };

  const updateView = () => {
    elements.viewToggleButtons.forEach((button) => {
      const target = button.dataset.viewTarget;
      if (target === state.activeView) {
        button.classList.add('view-toggle__button--active');
      } else {
        button.classList.remove('view-toggle__button--active');
      }
    });
    const hideFilter = state.activeView === 'meal-plan';
    if (elements.mealView) {
      elements.mealView.hidden = state.activeView !== 'meals';
    }
    if (elements.kitchenView) {
      elements.kitchenView.hidden = state.activeView !== 'kitchen';
    }
    if (elements.pantryView) {
      elements.pantryView.hidden = state.activeView !== 'pantry';
    }
    if (elements.mealPlanView) {
      elements.mealPlanView.hidden = state.activeView !== 'meal-plan';
    }
    if (state.activeView !== 'meal-plan') {
      closeMealPlanDayModal();
    }
    if (elements.appLayout) {
      elements.appLayout.classList.toggle('layout--single-column', hideFilter);
    }
    if (elements.filterPanel) {
      elements.filterPanel.hidden = hideFilter;
      if (hideFilter) {
        elements.filterPanel.setAttribute('aria-hidden', 'true');
      } else {
        elements.filterPanel.removeAttribute('aria-hidden');
      }
    }
    closePrimaryNav();
    scheduleMealPlanLayoutUpdate();
  };

  const renderApp = () => {
    applyColorTheme(false);
    configureFilterPanel();
    if (state.activeView === 'meals') {
      renderMeals();
    } else if (state.activeView === 'kitchen') {
      renderKitchen();
    } else if (state.activeView === 'pantry') {
      renderPantry();
    } else {
      renderMealPlan();
    }
    updateView();
    persistAppState();
  };

  const bindEvents = () => {
    elements.viewToggleButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.viewTarget;
        if (target && target !== state.activeView) {
          state.activeView = target;
          configuredFilterView = null;
          renderApp();
          closePrimaryNav();
        }
      });
    });

    if (elements.primaryNavToggle) {
      elements.primaryNavToggle.addEventListener('click', () => {
        togglePrimaryNav();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closePrimaryNav();
      }
    });

    document.addEventListener('click', (event) => {
      if (!primaryNavExpanded) {
        return;
      }
      const target = event.target;
      if (
        (elements.primaryNav && elements.primaryNav.contains(target))
        || (elements.primaryNavToggle && elements.primaryNavToggle.contains(target))
      ) {
        return;
      }
      closePrimaryNav();
    });

    if (Array.isArray(elements.mealPlanModeButtons)) {
      elements.mealPlanModeButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const mode = button.dataset.mealPlanMode;
          if (mode) {
            setMealPlanViewMode(mode);
          }
        });
      });
    }

    if (elements.mealPlanPrevButton) {
      elements.mealPlanPrevButton.addEventListener('click', () => {
        adjustMealPlanSelection(-1);
      });
    }

    if (elements.mealPlanNextButton) {
      elements.mealPlanNextButton.addEventListener('click', () => {
        adjustMealPlanSelection(1);
      });
    }

    if (elements.mealPlanDayDetails) {
      elements.mealPlanDayDetails.addEventListener('click', handleMealPlanDayContainerClick);
      elements.mealPlanDayDetails.addEventListener('change', handleMealPlanDayContainerChange);
    }

    if (dayModalState.body) {
      dayModalState.body.addEventListener('click', handleMealPlanDayContainerClick);
      dayModalState.body.addEventListener('change', handleMealPlanDayContainerChange);
    }

    if (dayModalState.backdrop) {
      dayModalState.backdrop.addEventListener('click', () => {
        closeMealPlanDayModal();
      });
    }

    if (dayModalState.closeButton) {
      dayModalState.closeButton.addEventListener('click', () => {
        closeMealPlanDayModal();
      });
    }

    if (elements.filterSearch) {
      elements.filterSearch.addEventListener('input', (event) => {
        const filters = getActiveFilters();
        filters.search = event.target.value;
        renderApp();
      });
    }

    if (elements.resetButton) {
      elements.resetButton.addEventListener('click', () => {
        if (state.activeView === 'meals') {
          state.mealFilters = getDefaultMealFilters();
        } else if (state.activeView === 'pantry') {
          state.pantryFilters = getDefaultPantryFilters();
        } else if (state.activeView === 'kitchen') {
          state.kitchenFilters = getDefaultKitchenFilters();
        }
        renderApp();
      });
    }

    if (elements.favoriteFilterToggle) {
      elements.favoriteFilterToggle.addEventListener('click', () => {
        if (state.activeView !== 'meals') return;
        const filters = ensureMealFilters();
        filters.favoritesOnly = !filters.favoritesOnly;
        renderApp();
      });
    }

    if (elements.pantryOnlyToggle) {
      elements.pantryOnlyToggle.addEventListener('click', () => {
        if (state.activeView !== 'meals') return;
        const filters = ensureMealFilters();
        filters.pantryOnly = !filters.pantryOnly;
        renderApp();
      });
    }

    if (elements.substitutionToggle) {
      elements.substitutionToggle.addEventListener('click', () => {
        if (state.activeView !== 'meals') return;
        const filters = ensureMealFilters();
        filters.substitutionsAllowed = !filters.substitutionsAllowed;
        renderApp();
      });
    }

    if (elements.familyButton) {
      elements.familyButton.addEventListener('click', () => {
        closePrimaryNav();
        if (elements.familyPanel?.dataset.open === 'true') {
          closeFamilyPanel();
        } else {
          openFamilyPanel();
        }
      });
    }

    if (elements.familyPanelBackdrop) {
      elements.familyPanelBackdrop.addEventListener('click', () => {
        closeFamilyPanel();
      });
    }

    if (elements.familyPanelClose) {
      elements.familyPanelClose.addEventListener('click', () => {
        closeFamilyPanel();
      });
    }

    if (elements.familyAddButton) {
      elements.familyAddButton.addEventListener('click', () => {
        addFamilyMember();
      });
    }

    if (elements.familyMemberList) {
      elements.familyMemberList.addEventListener('input', (event) => {
        const target = event.target;
        if (
          !(
            target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
          )
        ) {
          return;
        }
        if (target instanceof HTMLInputElement && target.type === 'checkbox') {
          return;
        }
        const field = target.dataset.familyField;
        const card = target.closest('[data-family-id]');
        if (!field || !card) {
          return;
        }
        updateFamilyMember(card.dataset.familyId, field, target.value, { skipRender: true });
      });
      elements.familyMemberList.addEventListener('change', (event) => {
        const target = event.target;
        if (
          !(
            target instanceof HTMLInputElement
            || target instanceof HTMLSelectElement
            || target instanceof HTMLTextAreaElement
          )
        ) {
          return;
        }
        const field = target.dataset.familyField;
        const card = target.closest('[data-family-id]');
        if (!field || !card) {
          return;
        }
        if (
          target instanceof HTMLInputElement
          && target.type === 'checkbox'
          && (field === 'diets' || field === 'allergies')
        ) {
          const values = Array.from(
            card.querySelectorAll(`input[data-family-field="${field}"]`),
          )
            .filter((input) => input instanceof HTMLInputElement && input.checked)
            .map((input) => input.value);
          updateFamilyMember(card.dataset.familyId, field, values);
          return;
        }
        updateFamilyMember(card.dataset.familyId, field, target.value);
      });
      elements.familyMemberList.addEventListener('click', (event) => {
        const removeButton =
          event.target instanceof Element ? event.target.closest('[data-remove-family]') : null;
        if (removeButton) {
          const { removeFamily } = removeButton.dataset;
          if (removeFamily) {
            removeFamilyMember(removeFamily);
          }
        }
      });
    }

    if (Array.isArray(elements.modeToggleButtons)) {
      elements.modeToggleButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const mode = button.dataset.mode;
          if (mode) {
            setThemeMode(mode);
          }
        });
      });
    }

    if (elements.holidayThemeToggle) {
      elements.holidayThemeToggle.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) {
          return;
        }
        state.holidayThemesEnabled = Boolean(target.checked);
        persistHolidayThemePreferences();
        updateHolidayThemeToggle();
        applyColorTheme();
      });
    }

    if (elements.holidayThemeSettings) {
      elements.holidayThemeSettings.addEventListener('click', () => {
        openHolidayThemeDialog();
      });
    }

    if (Array.isArray(elements.measurementToggleButtons)) {
      elements.measurementToggleButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const system = button.dataset.measurement;
          if (system) {
            setMeasurementSystem(system);
          }
        });
      });
    }

    window.addEventListener('resize', scheduleMealPlanLayoutUpdate);
    try {
      const orientationQuery = window.matchMedia('(orientation: landscape)');
      if (orientationQuery) {
        const listener = scheduleMealPlanLayoutUpdate;
        if (typeof orientationQuery.addEventListener === 'function') {
          orientationQuery.addEventListener('change', listener);
        } else if (typeof orientationQuery.addListener === 'function') {
          orientationQuery.addListener(listener);
        }
      }
    } catch (error) {
      // Orientation queries may not be supported in all environments; ignore errors.
    }
  };

  const init = () => {
    cacheElements();
    bindEvents();
    initThemeControls();
    initMeasurementControls();
    renderApp();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
