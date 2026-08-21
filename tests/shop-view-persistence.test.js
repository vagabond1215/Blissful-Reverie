const assert = require('node:assert/strict');
const persistence = require('../scripts/shop-view-persistence.js');

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

console.log('Shop workspace persistence tests passed.');
