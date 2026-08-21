const assert = require('node:assert/strict');
const registry = require('../scripts/persistence-registry-runtime.js');
const tools = require('../scripts/productivity-tools.js');

const makeStorage = (initial = {}, failOnceAt = '') => {
  const values = new Map(Object.entries(initial));
  let failed = false;
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
      values.set(key, String(value));
      if (key === failOnceAt && !failed) {
        failed = true;
        throw new Error('simulated write failure');
      }
    },
    removeItem(key) { values.delete(key); },
    snapshot() { return Object.fromEntries(values); },
  };
};

[
  'blissful-pantry-stock-history',
  'blissful-pantry-lists',
  'blissful-inventory-unit-profiles',
  'blissful-shopping-recipe-references',
  'blissful-shop-active',
  'blissful-inventory-legacy-unit-preferences-v1',
].forEach((key) => assert(registry.keys.includes(key), `${key} must be registered for backup.`));
assert.equal(new Set(registry.keys).size, registry.keys.length, 'Persistence keys must be unique.');

const source = makeStorage({
  'blissful-app-state': JSON.stringify({ pantryInventory: { rice: { quantity: 2, unit: 'cup' } } }),
  'blissful-pantry-stock-history': JSON.stringify({ rice: { count: 3, lastStockedAt: '2026-08-14T10:00:00.000Z' } }),
  'blissful-pantry-lists': JSON.stringify({ version: 1, activeListId: 'instacart', lists: [] }),
  'blissful-inventory-unit-profiles': JSON.stringify({ rice: { stockUnit: 'cup' } }),
  'blissful-pantry-favorites-only': 'true',
  'blissful-shop-active': 'true',
  'blissful-measurement': 'metric',
  'unregistered-user-data': 'do-not-export',
});
const backup = tools.createBackup(source);
assert.equal(backup.data['blissful-pantry-favorites-only'], 'true');
assert.equal(backup.data['blissful-shop-active'], 'true');
assert.equal(backup.data['blissful-measurement'], 'metric');
assert.equal(backup.data['unregistered-user-data'], undefined);

const restored = makeStorage({
  'blissful-app-state': JSON.stringify({ pantryInventory: {} }),
  'blissful-pantry-stock-history': JSON.stringify({ old: { count: 1 } }),
});
assert.equal(tools.restoreBackup(backup, restored), true);
assert.deepEqual(JSON.parse(restored.getItem('blissful-pantry-stock-history')), {
  rice: { count: 3, lastStockedAt: '2026-08-14T10:00:00.000Z' },
});
assert.deepEqual(JSON.parse(restored.getItem('blissful-pantry-lists')), {
  version: 1,
  activeListId: 'instacart',
  lists: [],
});
assert.deepEqual(JSON.parse(restored.getItem('blissful-inventory-unit-profiles')), {
  rice: { stockUnit: 'cup' },
});
assert.equal(restored.getItem('blissful-shop-active'), 'true');

const beforeInvalid = restored.snapshot();
const invalid = {
  ...backup,
  data: { ...backup.data, 'blissful-pantry-stock-history': '[]' },
};
assert.throws(() => tools.restoreBackup(invalid, restored), /blissful-pantry-stock-history/);
assert.deepEqual(restored.snapshot(), beforeInvalid, 'Validation must finish before storage mutation.');

const rollbackTarget = makeStorage({
  'blissful-app-state': JSON.stringify({ before: true }),
  'blissful-pantry-lists': JSON.stringify({ before: true }),
}, 'blissful-pantry-lists');
const beforeRollback = rollbackTarget.snapshot();
assert.throws(() => tools.restoreBackup(backup, rollbackTarget), /Unable to restore backup/);
assert.deepEqual(rollbackTarget.snapshot(), beforeRollback, 'A failed write must roll back every touched key.');

const unknownTarget = makeStorage();
assert.equal(tools.restoreBackup({
  app: 'Blissful Reverie',
  version: 1,
  data: { 'unknown-plugin-state': JSON.stringify({ dangerous: true }) },
}, unknownTarget), true);
assert.deepEqual(unknownTarget.snapshot(), {}, 'Unknown backup data must not be written.');

console.log(`Persistence registry behavior tests passed for ${registry.keys.length} registered keys.`);
