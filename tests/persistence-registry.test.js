const assert = require('node:assert');
const registry = require('../scripts/persistence-registry-runtime.js');

const makeStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    snapshot() { return Object.fromEntries(values); },
  };
};

assert(registry.keys.includes('blissful-pantry-stock-history'), 'Restock history must be registered for backup.');
assert(registry.keys.includes('blissful-pantry-lists'), 'Pantry lists must be registered for backup.');
assert(registry.keys.includes('blissful-inventory-unit-profiles'), 'Inventory unit profiles must be registered for backup.');
assert.equal(new Set(registry.keys).size, registry.keys.length, 'Persistence keys must be unique.');

const storage = makeStorage({
  'blissful-app-state': JSON.stringify({ pantryInventory: { rice: { quantity: 2, unit: 'cup' } } }),
  'blissful-pantry-stock-history': JSON.stringify({ rice: { count: 3, lastStockedAt: '2026-08-14T10:00:00.000Z' } }),
  'blissful-pantry-lists': JSON.stringify({ version: 1, activeListId: 'instacart', lists: [] }),
  'blissful-pantry-favorites-only': 'true',
});

const baseTools = {
  createBackup(source) {
    return { app: 'Blissful Reverie', version: 1, exportedAt: '2026-08-14T12:00:00.000Z', data: {} };
  },
  restoreBackup(backup, target) {
    if (backup.app !== 'Blissful Reverie' || backup.version !== 1) throw new Error('Invalid base backup.');
    return true;
  },
};

assert.equal(registry.install(baseTools), true);
const backup = baseTools.createBackup(storage);
assert.equal(backup.data['blissful-pantry-favorites-only'], 'true');
assert.deepEqual(JSON.parse(backup.data['blissful-pantry-stock-history']), {
  rice: { count: 3, lastStockedAt: '2026-08-14T10:00:00.000Z' },
});

const restored = makeStorage({
  'blissful-app-state': JSON.stringify({ pantryInventory: {} }),
  'blissful-pantry-stock-history': JSON.stringify({ old: { count: 1 } }),
});
assert.equal(baseTools.restoreBackup(backup, restored), true);
assert.deepEqual(JSON.parse(restored.getItem('blissful-pantry-stock-history')), {
  rice: { count: 3, lastStockedAt: '2026-08-14T10:00:00.000Z' },
});
assert.equal(restored.getItem('blissful-pantry-favorites-only'), 'true');

const invalid = {
  ...backup,
  data: { ...backup.data, 'blissful-pantry-stock-history': '[]' },
};
assert.throws(() => baseTools.restoreBackup(invalid, restored), /blissful-pantry-stock-history/);

console.log(`Persistence registry tests passed for ${registry.keys.length} registered keys.`);
