const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const restock = require('../scripts/restock-pantry-only.js');

assert.equal(restock.isPositiveQuantity('2'), true);
assert.equal(restock.isPositiveQuantity('0'), false);
assert.equal(restock.getCategoryIcon('Vegetable'), '🥕');
assert.equal(restock.getCategoryIcon('Unknown'), '📦');
assert.deepEqual(restock.sanitizeDraftEntry({ quantity: '3', unit: '' }), { quantity: '3', unit: 'each' });
assert.equal(restock.sanitizeDraftEntry({ quantity: '0', unit: 'can' }), null);

const categories = restock.buildRestockCategories({
  ingredients: [
    { slug: 'olives', name: 'Olives', category: 'Condiment/Sauce' },
    { slug: 'milk', name: 'Milk', category: 'Dairy' },
  ],
  inventory: { olives: { quantity: '2', unit: 'can' } },
  favorites: ['milk'],
  history: { olives: { count: 3, lastStockedAt: '' } },
});
assert.deepEqual(categories.map((group) => group.category), ['Condiment/Sauce', 'Dairy']);
assert.equal(categories[0].items[0].slug, 'olives');

const loader = read('scripts/productivity-settings.js');
assert(loader.includes("ensureScript('scripts/restock-pantry-only.js')"));
assert(!loader.includes("ensureScript('scripts/restock-wizard.js')"));
assert(!loader.includes("ensureScript('scripts/restock-pantry-nav.js')"));

const runtime = read('scripts/restock-pantry-only.js');
assert(runtime.includes("document.getElementById('pantry-restock-button')"));
assert(!runtime.includes('redirectLegacyKitchenView'));
assert(!runtime.includes('configureTopbarTrigger'));
assert(!runtime.includes('hideLegacyKitchenView'));
assert(!runtime.includes('data-view-target="kitchen"'));

console.log('Pantry-only restock ownership tests passed.');