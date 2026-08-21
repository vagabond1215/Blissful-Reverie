const assert = require('node:assert/strict');
const persistence = require('../scripts/shop-view-persistence.js');
const outline = require('../scripts/shop-list-outline.js');

const values = new Map();
const storage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
};

assert.equal(persistence.parseShopActive('true'), true);
assert.equal(persistence.parseShopActive('false'), false);
assert.equal(persistence.parseShopActive(null), false);
assert.equal(persistence.writeShopActive(storage, true), true);
assert.equal(storage.getItem(persistence.STORAGE_KEY), 'true');
assert.equal(persistence.writeShopActive(storage, false), true);
assert.equal(storage.getItem(persistence.STORAGE_KEY), 'false');

assert.equal(persistence.normalizeGroupBy('category'), 'category');
assert.equal(persistence.normalizeGroupBy('store'), 'store');
assert.equal(persistence.normalizeGroupBy('anything-else'), 'category');
assert.equal(persistence.nextGroupBy('category'), 'store');
assert.equal(persistence.nextGroupBy('store'), 'category');

assert.equal(outline.normalizeMeasureUnit('tablespoons'), 'tbsp');
assert.equal(outline.normalizeMeasureUnit('cups'), 'cup');
assert.equal(outline.formatQuantity(0.5), '½');
assert.equal(outline.formatQuantity(1.125), '1⅛');
assert.deepEqual(
  outline.aggregateMeasures([
    { quantity: 1, unit: 'cup' },
    { quantity: 2, unit: 'tablespoons' },
  ]),
  [{ quantity: 1.125, unit: 'cup', quantityLabel: '1⅛', unitLabel: 'cups' }],
);
assert.equal(outline.getCategoryIcon('Vegetable'), '🥕');
assert.equal(outline.getCategoryIcon('Any Store', 'store'), '🏬');
assert.deepEqual(
  outline.parsePurchaseMeasure('Buy 2 cups · have 0 · target 2 cups'),
  { quantityLabel: '2', unitLabel: 'cups' },
);

const workspace = {
  GROUP_DEFINITIONS: [{
    key: 'baking-sheets',
    label: 'Baking Sheets',
    aliases: ['baking sheet', 'baking sheets', 'sheet pan', 'sheet pans', 'rimmed baking sheet'],
    variants: [
      { id: 'baking-sheets-quarter', label: 'Quarter sheet · 9 × 13 in' },
      { id: 'baking-sheets-half', label: 'Half sheet · 13 × 18 in' },
    ],
  }],
};
const bakingSheet = persistence.canonicalizeKitchenEquipmentLabels(workspace);
assert.equal(bakingSheet.label, 'Baking Sheet');
assert.equal(bakingSheet.key, 'baking-sheets');
assert.deepEqual(bakingSheet.aliases, ['baking sheet', 'baking sheets', 'sheet pan', 'sheet pans', 'rimmed baking sheet']);
assert.deepEqual(bakingSheet.variants.map((variant) => variant.id), ['baking-sheets-quarter', 'baking-sheets-half']);

console.log('Shop workspace persistence tests passed.');
