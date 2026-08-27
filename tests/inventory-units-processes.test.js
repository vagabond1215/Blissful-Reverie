const assert = require('node:assert');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const units = require('../scripts/inventory-units-core.js');
const rebase = require('../scripts/inventory-units-rebase.js');
const packageDefaults = require('../scripts/pantry-package-defaults-core.js');
const legacyPreferences = require('../scripts/inventory-unit-legacy-preferences.js');
const shoppingSync = require('../scripts/shopping-inventory-units-sync.js');

assert.equal(units.normalizeUnit('tablespoons'), 'tbsp');
assert.equal(units.normalizeUnit('lbs'), 'pound');
assert.equal(units.normalizeUnit('cartons'), 'carton');
assert.equal(units.normalizeUnit('not-a-real-unit'), '');

const groups = units.getUnitGroups();
['count', 'volume', 'mass', 'package'].forEach((group) => {
  assert(Array.isArray(groups[group]) && groups[group].length > 0, `Missing unit group ${group}`);
});
['stick', 'tsp', 'tbsp', 'cup', 'pint', 'quart', 'gallon', 'ml', 'liter', 'gram', 'kilogram', 'oz', 'pound', 'box', 'carton', 'can', 'bag', 'jar', 'pack'].forEach((unit) => {
  assert(units.isValidUnit(unit), `Missing standard unit ${unit}`);
});

const butter = units.resolveProfile('dairy-butter-salted', {});
assert.equal(butter.stockUnit, 'stick');
assert.equal(butter.purchaseUnit, 'box');
assert.equal(butter.unitsPerPurchase, 4);
assert.equal(units.convertQuantity(1, 'box', 'stick', butter), 4);
assert.equal(units.convertQuantity(4, 'stick', 'tbsp', butter), 32);
assert.equal(units.convertQuantity(1, 'cup', 'stick', butter), 2);
assert(Math.abs(units.convertQuantity(4, 'oz', 'stick', butter) - 1) < 1e-8);
assert(Math.abs(units.convertQuantity(113.3980925, 'gram', 'stick', butter) - 1) < 1e-8);

let purchase = units.addPurchase({ inventory: {}, slug: 'dairy-butter-salted', purchaseQuantity: 1, profile: butter });
assert.equal(purchase.ok, true);
assert.deepEqual(purchase.inventory['dairy-butter-salted'], { quantity: 4, unit: 'stick' });
let used = units.consumeIngredient({ inventory: purchase.inventory, slug: 'dairy-butter-salted', quantity: 2, unit: 'tbsp', profile: butter });
assert.equal(used.ok, true);
assert.deepEqual(used.inventory['dairy-butter-salted'], { quantity: 3.75, unit: 'stick' });
used = units.consumeIngredient({ inventory: purchase.inventory, slug: 'dairy-butter-salted', quantity: 1, unit: 'cup', profile: butter });
assert.equal(used.ok, true);
assert.deepEqual(used.inventory['dairy-butter-salted'], { quantity: 2, unit: 'stick' });

const rebasedButter = rebase.rebaseProfile(butter, 'tbsp');
assert(rebasedButter, 'Butter should rebase from sticks to tablespoons');
assert.equal(rebasedButter.stockUnit, 'tbsp');
assert.equal(rebasedButter.purchaseUnit, 'box');
assert.equal(rebasedButter.unitsPerPurchase, 32);
assert.equal(units.convertQuantity(1, 'box', 'tbsp', rebasedButter), 32);
assert.equal(units.convertQuantity(1, 'cup', 'tbsp', rebasedButter), 16);
assert(Math.abs(units.convertQuantity(4, 'oz', 'tbsp', rebasedButter) - 8) < 1e-8);

const buttermilk = units.resolveProfile('dairy-buttermilk', {});
assert.equal(buttermilk.stockUnit, 'cup');
assert.equal(buttermilk.purchaseUnit, 'carton');
assert.equal(buttermilk.unitsPerPurchase, 4);
assert.equal(packageDefaults.getDefaultPackageUnit({ slug: 'dairy-buttermilk', name: 'Buttermilk', category: 'Dairy' }), 'carton');
assert(Math.abs(units.convertQuantity(1, 'quart', 'cup', buttermilk) - 4) < 1e-8);
assert.equal(units.resolveProfile('dairy-buttermilk', { 'dairy-buttermilk': { unitsPerPurchase: 2 } }).unitsPerPurchase, 2);
purchase = units.addPurchase({ inventory: {}, slug: 'dairy-buttermilk', purchaseQuantity: 1, profile: buttermilk });
assert.equal(purchase.ok, true);
assert.deepEqual(purchase.inventory['dairy-buttermilk'], { quantity: 4, unit: 'cup' });
used = units.consumeIngredient({ inventory: { 'dairy-buttermilk': { quantity: 1, unit: 'carton' } }, slug: 'dairy-buttermilk', quantity: 1, unit: 'cup', profile: buttermilk });
assert.equal(used.ok, true);
assert.deepEqual(used.inventory['dairy-buttermilk'], { quantity: 3, unit: 'cup' });

const rebasedButtermilk = rebase.rebaseProfile(buttermilk, 'quart');
assert(rebasedButtermilk, 'Buttermilk should rebase from cups to quarts');
assert.equal(rebasedButtermilk.stockUnit, 'quart');
assert.equal(rebasedButtermilk.purchaseUnit, 'carton');
assert(Math.abs(rebasedButtermilk.unitsPerPurchase - 1) < 1e-8);
assert(Math.abs(units.convertQuantity(1, 'carton', 'quart', rebasedButtermilk) - 1) < 1e-8);

const migratedLegacy = legacyPreferences.migratePreferenceMap({
  preferences: {
    'dairy-butter-salted': 'cup',
    'dairy-buttermilk': 'box',
    'grain-rice-jasmine': 'pound',
  },
  profiles: {},
  ingredients: [{ slug: 'grain-rice-jasmine', name: 'Rice (Jasmine)', category: 'Grain' }],
  packageCore: packageDefaults,
});
assert.equal(migratedLegacy.profiles['dairy-butter-salted'].stockUnit, 'cup');
assert.equal(migratedLegacy.profiles['dairy-butter-salted'].purchaseUnit, 'box');
assert.equal(migratedLegacy.profiles['dairy-butter-salted'].unitsPerPurchase, 2);
assert.equal(migratedLegacy.profiles['dairy-buttermilk'], undefined, 'Legacy package-shaped stock choices should be skipped');
assert.equal(migratedLegacy.profiles['grain-rice-jasmine'].stockUnit, 'pound');
assert.equal(migratedLegacy.profiles['grain-rice-jasmine'].purchaseUnit, 'bag');
assert(migratedLegacy.skipped.some((entry) => entry.slug === 'dairy-buttermilk' && entry.unit === 'box'));

const syncedShoppingProfiles = shoppingSync.syncShoppingProfiles(
  { 'dairy-butter-salted': { store: 'Giant', purchaseMode: 'unit', packageSize: 1 } },
);
assert.equal(syncedShoppingProfiles['dairy-butter-salted'].store, 'Giant');
assert.equal(syncedShoppingProfiles['dairy-butter-salted'].purchaseMode, 'unit');
assert.equal(syncedShoppingProfiles['dairy-butter-salted'].packageSize, 1);

const normalizedUsage = shoppingSync.normalizeUsageToStock({
  'dairy-butter-salted': {
    events: [{ at: '2026-08-13T12:00:00.000Z', amount: 0.25, unit: 'cup' }],
  },
}, { 'dairy-butter-salted': rebasedButter });
assert.equal(normalizedUsage['dairy-butter-salted'].events[0].unit, 'tbsp');
assert.equal(normalizedUsage['dairy-butter-salted'].events[0].amount, 4);

assert.deepEqual(units.normalizeRecipeUnit('tablespoons', 3), { quantity: 3, unit: 'tbsp' });
assert.deepEqual(units.normalizeRecipeUnit('large', 2), { quantity: 2, unit: 'each' });
assert.deepEqual(units.normalizeRecipeUnit('cans (15 ounces each)', 2), { quantity: 2, unit: 'can' });
assert.deepEqual(units.normalizeRecipeUnit('fillets (6 ounces each)', 4), { quantity: 24, unit: 'oz' });

global.window = global;
require('../data/ingredients.js');
require('../data/recipes.js');
require('../scripts/ingredient-matching.js');
const processes = require('../data/ingredient-processes.js');
const effectiveIngredients = global.BLISSFUL_INGREDIENTS;
const slugs = new Set(effectiveIngredients.map((ingredient) => ingredient.slug));
const processIds = new Set();
processes.forEach((process) => {
  assert(!processIds.has(process.id), `Duplicate process id ${process.id}`);
  processIds.add(process.id);
  assert.equal(process.buyable, true, `${process.id} output should remain buyable`);
  assert.deepEqual(units.validateProcess(process, slugs), [], `Invalid process ${process.id}`);
});
[
  'hot-smoked-salmon',
  'cook-jasmine-rice',
  'make-ghee',
  'make-refried-beans',
  'marinate-artichoke-hearts',
  'roast-red-peppers',
  'freeze-mixed-berries',
  'freeze-chopped-spinach',
  'freeze-corn-kernels',
].forEach((id) => assert(processIds.has(id), `Missing expected process ${id}`));

const smoked = processes.find((process) => process.id === 'hot-smoked-salmon');
const salmonInventory = {
  'seafood-salmon': { quantity: 1, unit: 'pound' },
  'spice-kosher-salt': { quantity: 2, unit: 'tbsp' },
  'sweetener-brown-sugar': { quantity: 2, unit: 'tbsp' },
};
const smokedResult = units.executeProcess({ inventory: salmonInventory, process: smoked, profiles: {} });
assert.equal(smokedResult.ok, true);
assert.equal(smokedResult.inventory['seafood-salmon'], undefined);
assert.deepEqual(smokedResult.inventory['seafood-salmon-smoked'], { quantity: 12, unit: 'oz' });
assert.equal(smokedResult.inventory['spice-kosher-salt'].quantity, 1);
assert.equal(smokedResult.inventory['sweetener-brown-sugar'].quantity, 1);

const failedSmoke = units.executeProcess({
  inventory: { ...salmonInventory, 'seafood-salmon': { quantity: 0.5, unit: 'pound' } },
  process: smoked,
  profiles: {},
});
assert.equal(failedSmoke.ok, false);
assert.deepEqual(failedSmoke.inventory['seafood-salmon'], { quantity: 0.5, unit: 'pound' });
assert.equal(failedSmoke.inventory['seafood-salmon-smoked'], undefined);

const syntheticButterRecipe = {
  id: 'unit-test-butter-recipe',
  baseServings: 4,
  ingredients: [{ token: 'dairy-butter-unsalted', item: 'butter, melted', quantity: 4, unit: 'tablespoons' }],
};
const butterConsumption = units.consumeRecipe({
  inventory: { 'dairy-butter-unsalted': { quantity: 4, unit: 'stick' } },
  recipe: syntheticButterRecipe,
  ingredients: effectiveIngredients,
  matching: global.BlissfulMatching,
  profiles: {},
});
assert.equal(butterConsumption.ok, true);
assert.deepEqual(butterConsumption.inventory['dairy-butter-unsalted'], { quantity: 3.5, unit: 'stick' });

const unresolvedTokenConsumption = units.consumeRecipe({
  inventory: { 'dairy-butter-unsalted': { quantity: 4, unit: 'stick' } },
  recipe: {
    id: 'unit-test-unknown-token',
    baseServings: 1,
    ingredients: [{ token: 'recipe-ingredient-butter-garnish', item: 'unsalted butter', quantity: 1, unit: 'tbsp' }],
  },
  ingredients: effectiveIngredients,
  matching: global.BlissfulMatching,
  profiles: {},
});
assert.equal(unresolvedTokenConsumption.ok, false, 'Explicit recipe-only tokens must not fall back to parsing display text.');

console.log(`Inventory unit and crafting tests passed for ${processes.length} processes and ${effectiveIngredients.length} effective ingredients.`);
