const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const units = require('../scripts/pantry-package-defaults-core.js');

const ingredient = (slug, name, category) => ({ slug, name, category, tags: [] });

assert.equal(units.getDefaultPackageUnit(ingredient('pasta-spaghetti', 'Spaghetti', 'Pasta')), 'box');
assert.equal(units.getDefaultPackageUnit(ingredient('egg-large', 'Large Eggs', 'Dairy & Refrigerated')), 'carton');
assert.equal(units.getDefaultPackageUnit(ingredient('dairy-butter', 'Butter (Unsalted)', 'Dairy')), 'box');
assert.equal(units.getDefaultPackageUnit(ingredient('dairy-milk', 'Milk (Whole)', 'Dairy')), 'jug');
assert.equal(units.getDefaultPackageUnit(ingredient('alt-milk-almond', 'Almond Milk', 'Dairy Alternative')), 'carton');
assert.equal(units.getDefaultPackageUnit(ingredient('condiment-coconut-milk', 'Coconut Milk', 'Condiment/Sauce')), 'can');
assert.equal(units.getDefaultPackageUnit(ingredient('meat-beef-ground', 'Ground Beef', 'Meat')), 'tray');
assert.equal(units.getDefaultPackageUnit(ingredient('herb-cilantro', 'Cilantro', 'Herb')), 'bunch');
assert.equal(units.getDefaultPackageUnit(ingredient('spice-cumin', 'Ground Cumin', 'Spice')), 'jar');
assert.equal(units.getDefaultPackageUnit(ingredient('legume-black-beans', 'Black Beans', 'Legume')), 'can');
assert.equal(units.getDefaultPackageUnit(ingredient('legume-red-lentils', 'Red Lentils', 'Legume')), 'bag');
assert.equal(units.getDefaultPackageUnit(ingredient('grain-white-rice', 'White Rice', 'Grain')), 'bag');
assert.equal(units.getDefaultPackageUnit(ingredient('veg-frozen-broccoli', 'Frozen Broccoli Florets', 'Vegetable')), 'bag');
assert.equal(units.getDefaultPackageUnit(ingredient('bakery-bread', 'Sandwich Bread', 'Baked Goods & Doughs')), 'loaf');
assert.equal(units.getDefaultPackageUnit(ingredient('produce-onion', 'Yellow Onion', 'Vegetable')), 'each');

const spaghetti = ingredient('pasta-spaghetti', 'Spaghetti', 'Pasta');
assert.equal(units.resolvePantryUnit({ ingredient: spaghetti, inventoryEntry: null, preferences: {} }), 'box');
assert.equal(units.resolvePantryUnit({ ingredient: spaghetti, inventoryEntry: { unit: 'bag' }, preferences: {} }), 'bag');
assert.equal(units.resolvePantryUnit({ ingredient: spaghetti, inventoryEntry: { unit: 'bag' }, preferences: { 'pasta-spaghetti': 'each' } }), 'each');
assert.equal(units.resolvePantryUnit({ ingredient: spaghetti, inventoryEntry: { unit: 'bag' }, preferences: { 'pasta-spaghetti': 'case' } }), 'case');

['case', 'carton', 'tub', 'bunch', 'tray', 'pouch', 'loaf', 'jug', 'canister', 'clamshell'].forEach((unit) => {
  assert(units.PACKAGE_UNITS.includes(unit), `Missing package unit suggestion: ${unit}`);
});

const sandbox = { window: {} };
vm.runInNewContext(read('data/ingredients.js'), sandbox, { filename: 'data/ingredients.js' });
const catalog = sandbox.window.BLISSFUL_INGREDIENTS;
assert(Array.isArray(catalog) && catalog.length > 0, 'Ingredient catalog did not load');
const catalogDefaults = units.buildCatalogDefaults(catalog);
assert.equal(Object.keys(catalogDefaults).length, catalog.length, 'Every ingredient slug must have one package default');
catalog.forEach((item) => {
  const unit = catalogDefaults[item.slug];
  assert.equal(typeof unit, 'string', `Missing package unit for ${item.slug}`);
  assert(unit.length > 0, `Empty package unit for ${item.slug}`);
  assert(units.PACKAGE_UNITS.includes(unit), `Unsupported package unit ${unit} for ${item.slug}`);
});

const runtime = read('scripts/pantry-package-unit-runtime.js');
assert(runtime.includes('blissful-pantry-unit-preferences'));
assert(runtime.includes('packageDefaultUnit'));
assert(runtime.includes('packageUnitSync'));
assert(runtime.includes('__pantryPackageUnitsBackupExtended'));
assert(runtime.includes("document.getElementById('pantry-unit-options')"));

const migration = read('scripts/pantry-package-unit-migration.js');
assert(migration.includes("unit === 'each'"));
assert(migration.includes("input.value = 'each'"));
assert(migration.includes('preferences[slug] = unit'));

const loader = read('scripts/pantry-workspace-actions.js');
assert(loader.includes('scripts/pantry-package-defaults-core.js'));
assert(loader.includes('scripts/pantry-package-unit-runtime.js'));
assert(loader.includes('scripts/pantry-package-unit-migration.js'));

console.log(`Pantry package-unit tests passed for ${catalog.length} ingredients.`);
