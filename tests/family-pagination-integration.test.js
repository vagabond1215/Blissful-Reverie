const assert = require('node:assert/strict');
const integration = require('../scripts/family-pagination-integration.js');

const recipes = [
  { id: 'chicken-soup' },
  { id: 'tomato-pasta' },
  { id: 'apple-oats' },
];
const recipeIngredientMatches = new Map([
  ['chicken-soup', new Set(['meat-chicken', 'vegetable-carrot'])],
  ['tomato-pasta', new Set(['vegetable-tomato', 'grain-pasta'])],
  ['apple-oats', new Set(['fruit-apple', 'grain-oats'])],
]);
const ingredientBySlug = new Map([
  ['meat-chicken', { slug: 'meat-chicken', category: 'Meat' }],
  ['vegetable-carrot', { slug: 'vegetable-carrot', category: 'Vegetable' }],
  ['vegetable-tomato', { slug: 'vegetable-tomato', category: 'Vegetable' }],
  ['grain-pasta', { slug: 'grain-pasta', category: 'Grain' }],
  ['fruit-apple', { slug: 'fruit-apple', category: 'Fruit' }],
  ['grain-oats', { slug: 'grain-oats', category: 'Grain' }],
]);

const state = {
  members: {
    sam: [{ kind: 'ingredient', key: 'vegetable-tomato', label: 'Tomato' }],
    lee: [{ kind: 'category', key: 'meat', label: 'Meat' }],
  },
};

assert.deepEqual(
  integration.filterRecipesForActiveDislikes({ recipes, memberIds: [], state, recipeIngredientMatches, ingredientBySlug }).map((recipe) => recipe.id),
  ['chicken-soup', 'tomato-pasta', 'apple-oats'],
);
assert.deepEqual(
  integration.filterRecipesForActiveDislikes({ recipes, memberIds: ['sam'], state, recipeIngredientMatches, ingredientBySlug }).map((recipe) => recipe.id),
  ['chicken-soup', 'apple-oats'],
);
assert.deepEqual(
  integration.filterRecipesForActiveDislikes({ recipes, memberIds: ['sam', 'lee'], state, recipeIngredientMatches, ingredientBySlug }).map((recipe) => recipe.id),
  ['apple-oats'],
);
assert.equal(
  integration.recipeConflictsWithTokens({
    recipe: recipes[0],
    tokens: [{ kind: 'category', key: 'meat', label: 'Meat' }],
    recipeIngredientMatches,
    ingredientBySlug,
  }),
  true,
);

console.log('Family Dislikes pre-pagination filtering tests passed.');
