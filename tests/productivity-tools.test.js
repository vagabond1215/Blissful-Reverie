const assert = require('assert');
const tools = require('../scripts/productivity-tools.js');

assert.equal(tools.getRecipeTypeLabel({ id: 'roasted-vegetable-quinoa-bowls', category: 'Vegetarian' }), 'Curated recipe');
assert.equal(tools.getRecipeTypeLabel({ id: 'ingredient-spotlight-veg-carrot', category: 'Ingredient Spotlight' }), 'Ingredient idea');
assert.equal(tools.getRecipeTypeLabel({ id: 'diet-vegan-1', category: 'Diet Collection' }), 'Generated template');
assert.equal(tools.getRecipeTypeLabel({ id: 'menu-weeknight-1', category: 'Menu Collection' }), 'Generated template');
assert.equal(tools.getRecipeTypeLabel({ id: 'custom-generated', generated: true }), 'Generated template');
assert.equal(tools.getRecipeTypeLabel({ id: 'regional-coastal-1' }), 'Generated template');

const backupStorage = new Map();
const storage = {
  getItem: (key) => (backupStorage.has(key) ? backupStorage.get(key) : null),
  setItem: (key, value) => backupStorage.set(key, String(value)),
};
storage.setItem('blissful-app-state', JSON.stringify({ activeView: 'meals' }));
storage.setItem('blissful-meal-plan', JSON.stringify({ '2026-06-09': [] }));
storage.setItem('blissful-favorites', JSON.stringify(['recipe-a']));
storage.setItem('blissful-pantry-favorites', JSON.stringify(['grain-quinoa']));
storage.setItem('blissful-theme', JSON.stringify({ mode: 'dark' }));
storage.setItem('blissful-holiday-themes', JSON.stringify({ enabled: true }));
storage.setItem('blissful-measurement', 'metric');
const backup = tools.createBackup(storage);
assert.equal(backup.app, 'Blissful Reverie');
assert.equal(backup.version, 1);
assert.equal(typeof backup.exportedAt, 'string');
assert.deepEqual(Object.keys(backup.data).sort(), [...tools.BACKUP_KEYS].sort());
assert.equal(backup.data['blissful-app-state'], JSON.stringify({ activeView: 'meals' }));
assert.equal(backup.data['blissful-meal-plan'], JSON.stringify({ '2026-06-09': [] }));
assert.equal(backup.data['blissful-favorites'], JSON.stringify(['recipe-a']));
assert.equal(backup.data['blissful-pantry-favorites'], JSON.stringify(['grain-quinoa']));
assert.equal(backup.data['blissful-theme'], JSON.stringify({ mode: 'dark' }));
assert.equal(backup.data['blissful-holiday-themes'], JSON.stringify({ enabled: true }));
assert.equal(backup.data['blissful-measurement'], 'metric');
assert.equal(backup.data['blissful-measurement-system'], undefined);

const restoreStorage = new Map();
tools.restoreBackup(backup, {
  setItem: (key, value) => restoreStorage.set(key, value),
});
assert.equal(restoreStorage.get('blissful-favorites'), JSON.stringify(['recipe-a']));
assert.equal(restoreStorage.get('blissful-measurement'), 'metric');

assert.throws(
  () => tools.restoreBackup({ app: 'Another Planner', version: 1, data: {} }, storage),
  /not for Blissful Reverie/,
);
assert.throws(
  () => tools.restoreBackup({ app: 'Blissful Reverie', version: 2, data: {} }, storage),
  /Unsupported Blissful Reverie backup version/,
);
assert.throws(
  () => tools.restoreBackup({ app: 'Blissful Reverie', version: 1 }, storage),
  /Backup data is missing or invalid/,
);

let invalidBackupWrites = 0;
const invalidBackupStorage = {
  getItem: () => null,
  setItem: () => {
    invalidBackupWrites += 1;
  },
};
assert.throws(
  () => tools.restoreBackup({
    app: 'Blissful Reverie',
    version: 1,
    data: {
      'blissful-app-state': JSON.stringify({ activeView: 'meals' }),
      'blissful-favorites': ['recipe-a'],
    },
  }, invalidBackupStorage),
  /Backup data for blissful-favorites is invalid/,
);
assert.equal(invalidBackupWrites, 0);
assert.throws(
  () => tools.restoreBackup({
    app: 'Blissful Reverie',
    version: 1,
    data: {
      'blissful-app-state': JSON.stringify({ activeView: 'meals' }),
      'blissful-favorites': '{broken json',
    },
  }, invalidBackupStorage),
  /Backup data for blissful-favorites is invalid/,
);
assert.equal(invalidBackupWrites, 0);

assert.equal(tools.hasMeaningfulAppState(null), false);
assert.equal(tools.hasMeaningfulAppState({
  activeView: 'meals',
  mealFilters: {
    search: '',
    ingredients: [],
    ingredientsExcluded: [],
    tags: [],
    tagsExcluded: [],
    allergies: [],
    allergiesExcluded: [],
    equipment: [],
    equipmentExcluded: [],
    favoritesOnly: false,
    familyMembers: [],
    pantryOnly: false,
    substitutionsAllowed: false,
  },
  pantryInventory: {},
  kitchenInventory: [],
  familyMembers: [{ name: 'Alex' }, { name: 'Riley' }],
}), false);
assert.equal(tools.hasMeaningfulAppState({
  activeView: 'meals',
  pantryInventory: { 'grain-quinoa': { quantity: '1', unit: 'each' } },
}), true);

const existingFavoritesStorage = {
  getItem: (key) => (key === 'blissful-favorites' ? JSON.stringify(['recipe-a']) : null),
};
assert.equal(tools.hasMeaningfulStoredState(existingFavoritesStorage), true);
const existingMealPlanStorage = {
  getItem: (key) => (
    key === 'blissful-meal-plan'
      ? JSON.stringify({ '2026-06-09': [{ id: 'entry-a', title: 'Dinner', type: 'meal' }] })
      : null
  ),
};
assert.equal(tools.hasMeaningfulStoredState(existingMealPlanStorage), true);
const existingMeasurementStorage = {
  getItem: (key) => (key === 'blissful-measurement' ? 'metric' : null),
};
assert.equal(tools.hasMeaningfulStoredState(existingMeasurementStorage), true);
assert.equal(tools.hasMeaningfulStoredState({ getItem: () => null }), false);

const starter = tools.createStarterState({
  familyName: 'Test Household',
  allergies: ['nuts', 'nuts'],
  diets: ['Vegetarian', 'Vegetarian'],
  pantrySlugs: ['grain-quinoa', 'grain-quinoa'],
  kitchenItems: ['Skillet', 'Skillet'],
});
assert.equal(starter.mealFilters.pantryOnly, true);
assert.equal(starter.mealFilters.substitutionsAllowed, true);
assert.deepEqual(starter.mealFilters.tags, ['Vegetarian']);
assert.deepEqual(starter.mealFilters.allergies, []);
assert.deepEqual(starter.mealFilters.allergiesExcluded, ['nuts']);
assert.deepEqual(starter.familyMembers[0].allergies, ['nuts']);
assert.equal(starter.pantryInventory['grain-quinoa'].unit, 'each');
assert.deepEqual(starter.pantryFilters, {
  search: '',
  categories: [],
  tags: [],
  allergens: [],
});
assert.deepEqual(starter.kitchenInventory, ['Skillet']);

const dashboard = tools.summarizeDashboard({
  recipes: [
    { id: 'ready', name: 'Ready' },
    { id: 'near', name: 'Near' },
  ],
  pantryInventory: { a: { quantity: '1', unit: 'each' } },
  recipeMatchesById: new Map([
    ['ready', new Set(['a'])],
    ['near', new Set(['a', 'b'])],
  ]),
});
assert.equal(dashboard.cookNow.length, 1);
assert.equal(dashboard.nearlyReady.length, 1);

console.log('Productivity helper tests passed.');
