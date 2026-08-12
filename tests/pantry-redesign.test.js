const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
const pantry = require('../scripts/pantry-redesign.js');

assert.deepEqual(
  pantry.normalizeSettings({ cardFlow: 'horizontal', tagDefault: 'hidden', sortBy: 'frequent', stockFilter: 'low' }),
  { cardFlow: 'horizontal', tagDefault: 'hidden', sortBy: 'frequent', stockFilter: 'low' },
);
assert.equal(pantry.classifyStockState({ quantity: 0, recommendedStock: 7 }), 'out');
assert.equal(pantry.classifyStockState({ quantity: 6, recommendedStock: 7 }), 'low');
assert.equal(pantry.classifyStockState({ quantity: 7, recommendedStock: 7 }), 'in');

const now = Date.parse('2026-08-12T12:00:00Z');
assert.deepEqual(
  pantry.getUsageFrequency({ events: [
    { at: '2026-08-11T12:00:00Z', amount: 1 },
    { at: '2026-07-20T12:00:00Z', amount: 2 },
    { at: '2025-01-01T00:00:00Z', amount: 9 },
  ] }, { now, windowDays: 90 }),
  { count: 2, latest: Date.parse('2026-08-11T12:00:00Z') },
);

const popularity = pantry.buildTagPopularity([
  { tags: ['Vegan', 'Gluten-Free'] },
  { tags: ['Vegan'] },
  { tags: ['Vegetarian', 'Vegan'] },
]);
assert.deepEqual(
  pantry.sortTagsByPopularity(['Vegetarian', 'Gluten-Free', 'Vegan'], popularity),
  ['Vegan', 'Gluten-Free', 'Vegetarian'],
);

const matches = new Map([
  ['a', new Set(['olive', 'salt'])],
  ['b', new Set(['olive'])],
  ['c', new Set(['salt'])],
]);
assert.deepEqual(pantry.buildCommonalityCounts(matches), { olive: 2, salt: 2 });

const records = [
  { name: 'Olives', usageCount: 4, commonality: 8, stockState: 'low' },
  { name: 'Salt', usageCount: 7, commonality: 20, stockState: 'in' },
  { name: 'Apples', usageCount: 1, commonality: 3, stockState: 'out' },
];
assert.deepEqual(
  records.slice().sort((a, b) => pantry.comparePantryItems(a, b, 'frequent')).map((item) => item.name),
  ['Salt', 'Olives', 'Apples'],
);
assert.deepEqual(
  records.slice().sort((a, b) => pantry.comparePantryItems(a, b, 'commonality')).map((item) => item.name),
  ['Salt', 'Olives', 'Apples'],
);
assert.deepEqual(pantry.filterPantryItems(records, 'low').map((item) => item.name), ['Olives']);

const settingsLoader = read('scripts/productivity-settings.js');
assert(settingsLoader.includes('styles/pantry-redesign.css'));
assert(settingsLoader.includes('scripts/pantry-redesign.js'));

const pantryScript = read('scripts/pantry-redesign.js');
assert(pantryScript.includes("bar.id = 'page-action-bar'"));
assert(pantryScript.includes("document.getElementById('pantry-restock-button')"));
assert(pantryScript.includes("tagButton.id = 'pantry-tags-action'"));
assert(pantryScript.includes("count.textContent = `${visibleCount.toLocaleString()} ${visibleCount === 1 ? 'Item' : 'Items'}`"));
assert(pantryScript.includes("summary.textContent = 'Pantry'"));
assert(pantryScript.includes("<option value=\"horizontal\">Horizontal</option>"));
assert(pantryScript.includes("<option value=\"hidden\">Hidden</option>"));

const pantryStyles = read('styles/pantry-redesign.css');
assert(pantryStyles.includes('.page-action-bar'));
assert(pantryStyles.includes('#pantry-view > .pantry-view__header'));
assert(pantryStyles.includes('#pantry-grid[data-card-flow="horizontal"]'));
assert(pantryStyles.includes('.pantry-card--compact.pantry-card'));
assert(pantryStyles.includes('.pantry-row-tags'));
assert(pantryStyles.includes('@media (max-width: 760px)'));

console.log('Pantry redesign tests passed.');
