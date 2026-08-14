const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const admission = require('../scripts/catalog-admission.js');
const units = require('../scripts/inventory-units-core.js');
const { allowedIngredientCategories } = require('../scripts/data-validation.js');

const ingredients = [
  { slug: 'grain-test', name: 'Test Grain', category: 'Grain', tags: ['Vegetarian'], aliases: ['Example Grain'] },
  { slug: 'dairy-butter-salted', name: 'Butter (Salted)', category: 'Dairy', tags: ['Contains Dairy'] },
];

const matching = {
  createIngredientMatcherIndex: (items) => items,
  mapRecipesToIngredientMatches: (recipes) => ({
    recipeIngredientMatches: new Map(recipes.map((recipe) => {
      const matches = new Set();
      for (const entry of recipe.ingredients || []) {
        const item = String(entry.item || '').toLowerCase();
        if (item.includes('test grain')) matches.add('grain-test');
        if (item.includes('salted butter')) matches.add('dairy-butter-salted');
      }
      return [recipe.id, matches];
    })),
    ingredientUsage: new Map(),
  }),
};

const validIngredient = admission.validateCuratedIngredient({
  slug: 'dairy-test-milk',
  name: 'Test Milk',
  category: 'Dairy',
  tags: ['Contains Dairy'],
  aliases: ['Example Milk'],
  packageUnit: 'carton',
}, {
  existingIngredients: ingredients,
  allowedCategories: allowedIngredientCategories,
});
assert.deepEqual(validIngredient.errors, []);

const invalidIngredient = admission.validateCuratedIngredient({
  slug: 'grain-test',
  name: 'Test Grain',
  category: 'Not A Category',
  tags: 'Vegetarian',
  aliases: ['Test Grain', 'Same', 'same'],
  packageUnit: 'cup',
}, {
  existingIngredients: ingredients,
  allowedCategories: allowedIngredientCategories,
  inventoryProfiles: {
    'grain-test': { stockUnit: 'box', purchaseUnit: 'cup', unitsPerPurchase: 0 },
  },
});
assert(invalidIngredient.errors.some((error) => error.includes("slug 'grain-test' already exists")));
assert(invalidIngredient.errors.some((error) => error.includes("display name 'Test Grain' already exists")));
assert(invalidIngredient.errors.some((error) => error.includes("category 'Not A Category' is not canonical")));
assert(invalidIngredient.errors.some((error) => error.includes('tags must be an array')));
assert(invalidIngredient.errors.some((error) => error.includes("duplicates the display name")));
assert(invalidIngredient.errors.some((error) => error.includes("alias 'same' is duplicated")));
assert(invalidIngredient.errors.some((error) => error.includes("packageUnit 'cup'")));
assert(invalidIngredient.errors.some((error) => error.includes('stockUnit must be a recognized non-package unit')));
assert(invalidIngredient.errors.some((error) => error.includes('purchaseUnit must be a recognized package unit')));
assert(invalidIngredient.errors.some((error) => error.includes('unitsPerPurchase must be positive')));

const validRecipe = admission.validateCuratedRecipe({
  id: 'test-grain-bowl',
  name: 'Test Grain Bowl',
  baseServings: 2,
  ingredients: [
    { item: 'test grain', quantity: 1, unit: 'cup' },
    { item: 'salted butter', quantity: 2, unit: 'tablespoons' },
  ],
  instructions: ['Cook the grain and finish with butter.'],
  equipment: ['Saucepan'],
  tags: [],
  allergens: ['dairy'],
}, { ingredients, matching });
assert.deepEqual(validRecipe.errors, []);

const invalidRecipe = admission.validateCuratedRecipe({
  id: 'bad-recipe',
  name: 'Bad Recipe',
  baseServings: 2,
  ingredients: [
    { item: 'mystery powder', quantity: 1, unit: 'scoopfuls' },
  ],
  instructions: ['Mix.'],
  equipment: [],
  tags: [],
  allergens: [],
}, { ingredients, matching });
assert(invalidRecipe.errors.some((error) => error.includes("unit 'scoopfuls' is not recognized")));
assert(invalidRecipe.errors.some((error) => error.includes("'mystery powder' does not resolve to a canonical ingredient")));

const customMinimal = admission.validateCustomIngredient({
  id: 'local-grandmas-chili-crisp',
  name: "Grandma's Chili Crisp",
  category: 'Things I Keep By The Stove',
  notes: 'Homemade',
});
assert.deepEqual(customMinimal.errors, []);

const customTracked = admission.validateCustomIngredient({
  id: 'local-farm-milk',
  name: 'Farm Milk',
  stockUnit: 'cup',
  purchaseUnit: 'bottle',
  unitsPerPurchase: 8,
  packagePurchasing: true,
});
assert.deepEqual(customTracked.errors, []);

const customInvalid = admission.validateCustomIngredient({
  id: 'local-butter',
  name: 'Local Butter',
  stockUnit: 'box',
  purchaseUnit: 'cup',
  unitsPerPurchase: 0,
  packagePurchasing: true,
});
assert(customInvalid.errors.some((error) => error.includes('stockUnit must be a recognized non-package unit')));
assert(customInvalid.errors.some((error) => error.includes('purchaseUnit must be a recognized package unit')));
assert(customInvalid.errors.some((error) => error.includes('unitsPerPurchase must be positive')));

assert.equal(admission.isStockUnit('cup'), true);
assert.equal(admission.isStockUnit('box'), false);
assert.equal(admission.isPurchaseUnit('box'), true);
assert.equal(admission.isPurchaseUnit('cup'), false);
assert.equal(units.normalizeRecipeUnit('tablespoons', 2).unit, 'tbsp');

const criteria = fs.readFileSync(path.resolve(__dirname, '..', 'docs', 'catalog-admission-criteria.md'), 'utf8');
assert(criteria.includes('Curated ingredient admission'));
assert(criteria.includes('Curated recipe admission'));
assert(criteria.includes('User-created/custom ingredients'));
assert(criteria.includes('Promotion from custom to canonical'));

console.log('Catalog admission and custom ingredient validation tests passed.');
