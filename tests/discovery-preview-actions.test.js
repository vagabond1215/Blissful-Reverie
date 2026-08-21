const assert = require('node:assert/strict');
const preview = require('../scripts/discovery-preview-actions.js');

const recipes = [
  {
    id: 'tomato-pasta',
    name: 'Tomato Pasta',
    description: 'Fast pantry pasta.',
    tags: ['Weeknight'],
    ingredients: [{ quantity: 8, unit: 'oz', item: 'Pasta' }],
    instructions: ['Boil pasta.', 'Add sauce.'],
    equipment: ['Saucepan'],
    allergens: ['gluten'],
    nutritionPerServing: { calories: 420 },
  },
];

assert.equal(preview.normalizeRecipeName('  TOMATO Pasta  '), 'tomato pasta');
assert.equal(preview.getRecipeForChipLabel(recipes, 'Tomato Pasta')?.id, 'tomato-pasta');
assert.equal(preview.getRecipeForChipLabel(recipes, 'Missing'), null);
assert.equal(preview.getRecipeById(recipes, 'tomato-pasta')?.name, 'Tomato Pasta');
assert.equal(preview.getRecipeById(recipes, 'missing'), null);

const lateCatalog = recipes.slice();
lateCatalog.push({ id: 'ingredient-spotlight-late', name: 'Late Spotlight' });
assert.equal(
  preview.getRecipeById(lateCatalog, 'ingredient-spotlight-late')?.name,
  'Late Spotlight',
  'Recipe lookup should resolve entries appended after the initial catalog snapshot.',
);

const model = preview.buildPreviewModel(recipes[0]);
assert.equal(model.id, 'tomato-pasta');
assert.equal(model.ingredients[0].item, 'Pasta');
assert.deepEqual(model.instructions, ['Boil pasta.', 'Add sauce.']);
assert.deepEqual(model.equipment, ['Saucepan']);
assert.equal(model.nutrition.calories, 420);

console.log('Discovery preview action tests passed.');
