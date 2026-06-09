const assert = require('assert');
const tools = require('../scripts/productivity-tools.js');

const recipe = { id: 'weekday-bowl', name: 'Weekday Bowl' };
const matches = new Set(['grain-quinoa', 'veg-cauliflower', 'dairy-milk-whole']);
const pantry = {
  'grain-quinoa': { quantity: '1', unit: 'cup' },
  'veg-cauliflower': { quantity: '1', unit: 'head' },
  'alt-milk-oat': { quantity: '1', unit: 'carton' },
};
const substitutions = new Map([
  [
    'dairy-milk-whole',
    {
      label: 'Milk alternatives',
      members: new Set(['dairy-milk-whole', 'alt-milk-oat']),
    },
  ],
]);

const exactFit = tools.analyzeRecipePantryFit({
  recipe,
  pantryInventory: pantry,
  recipeIngredientMatches: matches,
  substitutionGraph: substitutions,
  substitutionsAllowed: false,
});
assert.equal(exactFit.status, 'nearly-ready');
assert.deepEqual(exactFit.missing, ['dairy-milk-whole']);

const flexibleFit = tools.analyzeRecipePantryFit({
  recipe,
  pantryInventory: pantry,
  recipeIngredientMatches: matches,
  substitutionGraph: substitutions,
  substitutionsAllowed: true,
});
assert.equal(flexibleFit.status, 'ready-with-substitutions');
assert.equal(flexibleFit.substituted.length, 1);
assert.equal(flexibleFit.substituted[0].substitute, 'alt-milk-oat');

const shoppingList = tools.buildShoppingList({
  recipes: [recipe, recipe],
  pantryInventory: pantry,
  recipeMatchesById: new Map([[recipe.id, matches]]),
  ingredientBySlug: new Map([
    ['grain-quinoa', { slug: 'grain-quinoa', name: 'Quinoa', category: 'Grain' }],
    ['veg-cauliflower', { slug: 'veg-cauliflower', name: 'Cauliflower', category: 'Vegetable' }],
    ['dairy-milk-whole', { slug: 'dairy-milk-whole', name: 'Whole Milk', category: 'Dairy' }],
  ]),
  substitutionGraph: substitutions,
  substitutionsAllowed: false,
});
assert.equal(shoppingList.length, 1);
assert.equal(shoppingList[0].slug, 'dairy-milk-whole');
assert.deepEqual(shoppingList[0].recipes, ['Weekday Bowl']);

const substitutedShoppingList = tools.buildShoppingList({
  recipes: [recipe],
  pantryInventory: pantry,
  recipeMatchesById: new Map([[recipe.id, matches]]),
  ingredientBySlug: new Map([
    ['dairy-milk-whole', { slug: 'dairy-milk-whole', name: 'Whole Milk', category: 'Dairy' }],
  ]),
  substitutionGraph: substitutions,
  substitutionsAllowed: true,
});
assert.deepEqual(substitutedShoppingList, []);

console.log('Pantry matching tests passed.');
