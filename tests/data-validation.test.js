const assert = require('node:assert');
const { validateData } = require('../scripts/data-validation.js');

const matching = {
  createIngredientMatcherIndex: (ingredients) => ingredients,
  mapRecipesToIngredientMatches: (recipes, ingredientIndex) => ({
    recipeIngredientMatches: new Map(
      recipes.map((recipe) => [recipe.id, new Set([ingredientIndex[0]?.slug].filter(Boolean))]),
    ),
    ingredientUsage: new Map(
      ingredientIndex.map((ingredient) => [ingredient.slug, 1]),
    ),
  }),
};

const createIngredient = (overrides = {}) => ({
  slug: 'grain-test',
  name: 'Test Grain',
  category: 'Grain',
  tags: ['Vegetarian'],
  ...overrides,
});

const createRecipe = (overrides = {}) => ({
  id: 'test-recipe',
  name: 'Test Recipe',
  baseServings: 2,
  ingredients: [{ item: 'test grain', quantity: 1, unit: 'cup' }],
  instructions: ['Cook the test grain.'],
  equipment: [],
  tags: [],
  allergens: [],
  nutritionPerServing: {
    calories: 100,
    protein: 4,
    carbs: 20,
    fat: 1,
  },
  ...overrides,
});

const valid = validateData({
  ingredients: [createIngredient({ category: 'Pasta & Noodles' })],
  recipes: [createRecipe()],
  matching,
});
assert.deepEqual(valid.errors, []);

const duplicates = validateData({
  ingredients: [
    createIngredient(),
    createIngredient({ name: 'Test Grain' }),
  ],
  recipes: [createRecipe()],
  matching,
});
assert(duplicates.errors.some((error) => error.includes('duplicates slug grain-test')));
assert(duplicates.errors.some((error) => error.includes("duplicates display name 'Test Grain'")));

const invalidSchema = validateData({
  ingredients: [createIngredient({ category: 'Unknown Category' })],
  recipes: [
    createRecipe({
      allergens: ['seafood'],
      ingredients: [{ item: 'test grain', quantity: -1, unit: 'cup' }],
    }),
  ],
  matching,
});
assert(invalidSchema.errors.some((error) => error.includes("unsupported category 'Unknown Category'")));
assert(invalidSchema.errors.some((error) => error.includes("non-canonical allergen 'seafood'")));
assert(invalidSchema.errors.some((error) => error.includes("invalid quantity '-1'")));

console.log('Data validation edge-case tests passed.');
