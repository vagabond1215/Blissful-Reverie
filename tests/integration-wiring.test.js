const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const indexHtml = read('index.html');
const expectedScripts = [
  'data/ingredients.js',
  'data/recipes.js',
  'scripts/ingredient-matching.js',
  'scripts/productivity-tools.js',
  'scripts/productivity-settings.js',
  'scripts/productivity-backup.js',
  'scripts/productivity-onboarding.js',
  'scripts/productivity-ui.js',
  'scripts/theme-utils.js',
  'scripts/app.js',
];

let previousIndex = -1;
expectedScripts.forEach((src) => {
  const currentIndex = indexHtml.indexOf(`src="${src}"`);
  assert(currentIndex > previousIndex, `${src} should load after the previous application script`);
  previousIndex = currentIndex;
});

const themeUtils = read('scripts/theme-utils.js');
assert(!themeUtils.includes('BLISSFUL_INGREDIENTS'));
assert(!themeUtils.includes('productivity-tools.js'));
assert(!themeUtils.includes('document.createElement(\'script\')'));

const productivityStyles = read('styles/productivity.css');
assert(productivityStyles.includes('.productivity-dashboard'));
assert(productivityStyles.includes('.productivity-onboarding'));
assert(productivityStyles.includes('.productivity-backup'));
assert(productivityStyles.includes('.productivity-settings-advanced'));
assert(productivityStyles.includes('.productivity-shopping__source-control'));
assert(productivityStyles.includes('.productivity-shopping__source-pill'));
assert(productivityStyles.includes('.productivity-shopping__copy-status'));
assert(productivityStyles.includes('@media (max-width: 640px)'));

[
  'scripts/productivity-tools.js',
  'scripts/productivity-settings.js',
  'scripts/productivity-backup.js',
  'scripts/productivity-onboarding.js',
  'scripts/productivity-ui.js',
  'scripts/shopping-reference-settings.js',
  'scripts/shopping-management.js',
  'scripts/restock-wizard.js',
].forEach((relativePath) => {
  const content = read(relativePath);
  assert(!content.includes('style.textContent'), `${relativePath} should not embed long CSS strings`);
});

const productivitySettings = read('scripts/productivity-settings.js');
assert(productivitySettings.includes('styles/productivity.css'));
assert(productivitySettings.includes('scripts/shopping-reference-settings.js'));
assert(productivitySettings.includes('styles/shopping-management.css'));
assert(productivitySettings.includes('scripts/shopping-management.js'));
assert(productivitySettings.includes('styles/restock-wizard.css'));
assert(productivitySettings.includes('scripts/restock-wizard.js'));

const productivityUi = read('scripts/productivity-ui.js');
assert(!productivityUi.includes('MutationObserver'));
assert(productivityUi.includes('global.BlissfulProductivityUI'));
assert(productivityUi.includes('From meal plan'));
assert(productivityUi.includes('Closest recipes'));
assert(productivityUi.includes('Planned meals are covered by your pantry'));
assert(productivityUi.includes('Add pantry items to compare closest recipes'));
assert(productivityUi.includes('Shopping list copied.'));
assert(productivityUi.includes('productivity-shopping__copy-status'));
assert(productivityUi.includes('productivity-shopping__source-pill'));

const shoppingReferences = require('../scripts/shopping-reference-settings.js');
assert.equal(shoppingReferences.parseStoredPreference('show'), true);
assert.equal(shoppingReferences.parseStoredPreference('hide'), false);
assert.equal(shoppingReferences.parseStoredPreference(null), null);
assert.equal(shoppingReferences.resolveReferenceVisibility(null, ['One recipe']), false);
assert.equal(shoppingReferences.resolveReferenceVisibility(null, ['One recipe', 'Second recipe']), true);
assert.equal(shoppingReferences.resolveReferenceVisibility(false, ['One recipe', 'Second recipe']), false);
assert.equal(
  shoppingReferences.buildShoppingText([
    {
      category: 'Produce',
      items: [{ name: 'Spinach', recipes: ['Pasta Verde'] }],
    },
  ], false),
  'Blissful Reverie shopping list\n\nProduce\n- Spinach',
);
assert.equal(
  shoppingReferences.buildShoppingText([
    {
      category: 'Produce',
      items: [{ name: 'Spinach', recipes: ['Pasta Verde'] }],
    },
  ], true),
  'Blissful Reverie shopping list\n\nProduce\n- Spinach — for Pasta Verde',
);

const shopping = require('../scripts/shopping-management.js');
const shoppingNow = Date.parse('2026-08-12T12:00:00.000Z');
const usageHistory = shopping.appendUsageEvent({}, {
  slug: 'olives',
  before: 13,
  after: 6,
  unit: 'can',
  at: '2026-08-10T12:00:00.000Z',
  now: shoppingNow,
});
assert.equal(usageHistory.olives.events[0].amount, 7);
assert.deepEqual(
  shopping.appendUsageEvent(usageHistory, {
    slug: 'olives',
    before: 6,
    after: 12,
    unit: 'can',
    at: '2026-08-11T12:00:00.000Z',
    now: shoppingNow,
  }),
  usageHistory,
);
assert.equal(shopping.getRecentUsage(usageHistory.olives, 'can', { now: shoppingNow }), 7);
assert.equal(
  shopping.getRecommendedStock({
    usageEntry: usageHistory.olives,
    unit: 'can',
    frequencyDays: 30,
    now: shoppingNow,
  }),
  7,
);

const shoppingIngredients = [
  { slug: 'olives', name: 'Olives', category: 'Condiment/Sauce' },
];
const unitRecommendation = shopping.buildRestockRecommendations({
  ingredients: shoppingIngredients,
  inventory: { olives: { quantity: '6', unit: 'can' } },
  profiles: { olives: { store: 'Giant', purchaseMode: 'unit', packageSize: 1 } },
  usageHistory,
  settings: { frequencyDays: 30, groupBy: 'category', automaticRestock: true },
  now: shoppingNow,
})[0];
assert.equal(unitRecommendation.recommendedQuantity, 7);
assert.equal(unitRecommendation.currentQuantity, 6);
assert.equal(unitRecommendation.purchaseQuantity, 1);
assert.equal(unitRecommendation.store, 'Giant');

const packageRecommendation = shopping.buildRestockRecommendations({
  ingredients: shoppingIngredients,
  inventory: { olives: { quantity: '6', unit: 'can' } },
  profiles: { olives: { store: 'Costco', purchaseMode: 'package', packageSize: 6 } },
  usageHistory,
  settings: { frequencyDays: 30, groupBy: 'store', automaticRestock: true },
  now: shoppingNow,
})[0];
assert.equal(packageRecommendation.purchasePackages, 1);
assert.equal(packageRecommendation.purchaseQuantity, 6);
assert.equal(shopping.getPurchaseLabel(packageRecommendation), '1 × 6-can pack (6 cans)');

const mergedShoppingItems = shopping.mergeShoppingItems([
  {
    slug: 'olives',
    name: 'Olives',
    category: 'Condiment/Sauce',
    store: '',
    recipes: ['Mediterranean Bowl'],
    automaticRestock: false,
  },
  {
    slug: 'spinach',
    name: 'Spinach',
    category: 'Vegetable',
    store: '',
    recipes: ['Pasta Verde'],
    automaticRestock: false,
  },
], [packageRecommendation], {
  olives: { store: 'Costco', purchaseMode: 'package', packageSize: 6 },
});
assert.equal(mergedShoppingItems.length, 2);
assert.deepEqual(mergedShoppingItems.find((item) => item.slug === 'olives').recipes, ['Mediterranean Bowl']);
assert.equal(mergedShoppingItems.find((item) => item.slug === 'olives').automaticRestock, true);

const storeGroups = shopping.groupManagedShoppingItems(mergedShoppingItems, 'store');
assert.deepEqual(storeGroups.map((group) => group.label), ['Costco', 'Unassigned store']);
assert(
  shopping.buildManagedShoppingText(storeGroups, true).includes(
    '- Olives — buy 1 × 6-can pack (6 cans) — have 6 / target 7 cans — for Mediterranean Bowl',
  ),
);

const shoppingManagementStyles = read('styles/shopping-management.css');
assert(shoppingManagementStyles.includes('.shopping-management-settings'));
assert(shoppingManagementStyles.includes('.shopping-item-profile'));
assert(shoppingManagementStyles.includes('.shopping-management__purchase'));
assert(shoppingManagementStyles.includes('@media (max-width: 640px)'));
assert(read('styles/app.css').includes("@import url('./shopping-management.css');"));

const restock = require('../scripts/restock-wizard.js');
assert.deepEqual(restock.normalizeStockHistory({ eggs: 2, milk: { count: 3, lastStockedAt: '2026-08-12' }, bad: 0 }), {
  eggs: { count: 2, lastStockedAt: '' },
  milk: { count: 3, lastStockedAt: '2026-08-12' },
});
assert.equal(restock.getCategoryIcon('Vegetable'), '🥕');
assert.equal(restock.getCategoryIcon('Unmapped Category'), '📦');
assert.equal(restock.isPositiveQuantity('1.5'), true);
assert.equal(restock.isPositiveQuantity('0'), false);
assert.equal(restock.sanitizeDraftEntry({ quantity: '2', unit: '' }).unit, 'each');
assert.equal(restock.sanitizeDraftEntry({ quantity: '0', unit: 'cup' }), null);

const restockCategories = restock.buildRestockCategories({
  ingredients: [
    { slug: 'spinach', name: 'Spinach', category: 'Vegetable' },
    { slug: 'carrot', name: 'Carrot', category: 'Vegetable' },
    { slug: 'milk', name: 'Milk', category: 'Dairy' },
    { slug: 'unused', name: 'Unused', category: 'Dairy' },
  ],
  inventory: { spinach: { quantity: '1', unit: 'bag' } },
  favorites: ['milk'],
  history: { carrot: { count: 4, lastStockedAt: '' }, spinach: { count: 1, lastStockedAt: '' } },
});
assert.deepEqual(restockCategories.map((group) => group.category), ['Vegetable', 'Dairy']);
assert.deepEqual(restockCategories[0].items.map((item) => item.slug), ['carrot', 'spinach']);
assert.deepEqual(restockCategories[1].items.map((item) => item.slug), ['milk']);

const restockStyles = read('styles/restock-wizard.css');
assert(restockStyles.includes('.restock-wizard__rail'));
assert(restockStyles.includes('.restock-wizard__button--primary'));
assert(restockStyles.includes('@media (max-width: 760px)'));

const app = read('scripts/app.js');
assert(app.includes('card.dataset.recipeId = recipe.id'));
assert(app.includes('productivityUi.render({'));
assert(app.includes('plannedRecipes'));
assert(app.includes('applyStarterState'));

console.log('Application wiring tests passed.');
