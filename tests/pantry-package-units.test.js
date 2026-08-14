const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const units = require('../scripts/pantry-package-defaults-core.js');

const ingredient = (slug, name, category, packageUnit) => ({
  slug,
  name,
  category,
  tags: [],
  ...(packageUnit ? { packageUnit } : {}),
});

assert.equal(units.getDefaultPackageUnit(ingredient('pasta-spaghetti', 'Spaghetti', 'Pasta')), 'box');
assert.equal(units.getDefaultPackageUnit(ingredient('pasta-bucatini', 'Bucatini', 'Pasta & Noodles')), 'box');
assert.equal(units.getDefaultPackageUnit(ingredient('egg-large', 'Large Eggs', 'Dairy & Refrigerated')), 'carton');
assert.equal(units.getDefaultPackageUnit(ingredient('dairy-butter', 'Butter (Unsalted)', 'Dairy')), 'box');
assert.equal(units.getDefaultPackageUnit(ingredient('dairy-milk', 'Milk (Whole)', 'Dairy')), 'jug');
assert.equal(units.getDefaultPackageUnit(ingredient('dairy-powdered-milk', 'Powdered Milk', 'Dairy & Refrigerated')), 'box');
assert.equal(units.getDefaultPackageUnit(ingredient('alt-milk-almond', 'Almond Milk', 'Dairy Alternative')), 'carton');
assert.equal(units.getDefaultPackageUnit(ingredient('condiment-coconut-milk', 'Coconut Milk', 'Condiment/Sauce')), 'can');
assert.equal(units.getDefaultPackageUnit(ingredient('meat-beef-ground', 'Ground Beef', 'Meat')), 'tray');
assert.equal(units.getDefaultPackageUnit(ingredient('herb-cilantro', 'Cilantro', 'Herb')), 'bunch');
assert.equal(units.getDefaultPackageUnit(ingredient('spice-cumin', 'Ground Cumin', 'Spice')), 'jar');
assert.equal(units.getDefaultPackageUnit(ingredient('legume-black-beans', 'Black Beans', 'Legume')), 'can');
assert.equal(units.getDefaultPackageUnit(ingredient('legume-borlotti', 'Borlotti Beans', 'Legumes & Pulses')), 'can');
assert.equal(units.getDefaultPackageUnit(ingredient('legume-red-lentils', 'Red Lentils', 'Legume')), 'bag');
assert.equal(units.getDefaultPackageUnit(ingredient('grain-white-rice', 'White Rice', 'Grain')), 'bag');
assert.equal(units.getDefaultPackageUnit(ingredient('veg-frozen-broccoli', 'Frozen Broccoli Florets', 'Vegetable')), 'bag');
assert.equal(units.getDefaultPackageUnit(ingredient('mushroom-shiitake', 'Shiitake Mushrooms', 'Mushrooms & Fungi')), 'pack');
assert.equal(units.getDefaultPackageUnit(ingredient('bev-chicken-stock', 'Chicken Stock', 'Beverage')), 'carton');
assert.equal(units.getDefaultPackageUnit(ingredient('bev-chicken-bouillon', 'Chicken Bouillon', 'Beverage')), 'jar');
assert.equal(units.getDefaultPackageUnit(ingredient('fat-duck', 'Duck Fat', 'Oils & Fats')), 'jar');
assert.equal(units.getDefaultPackageUnit(ingredient('bakery-bread', 'Sandwich Bread', 'Baked Goods & Doughs')), 'loaf');
assert.equal(units.getDefaultPackageUnit(ingredient('produce-onion', 'Yellow Onion', 'Vegetable')), 'each');
assert.equal(units.getDefaultPackageUnit(ingredient('explicit-jar', 'Example', 'Vegetable', 'jar')), 'jar');

const spaghetti = ingredient('pasta-spaghetti', 'Spaghetti', 'Pasta');
assert.equal(units.resolvePantryUnit({ ingredient: spaghetti, inventoryEntry: null, preferences: {} }), 'box');
assert.equal(units.resolvePantryUnit({ ingredient: spaghetti, inventoryEntry: { unit: 'bag' }, preferences: {} }), 'bag');
assert.equal(units.resolvePantryUnit({ ingredient: spaghetti, inventoryEntry: { unit: 'bag' }, preferences: { 'pasta-spaghetti': 'each' } }), 'each');
assert.equal(units.resolvePantryUnit({ ingredient: spaghetti, inventoryEntry: { unit: 'bag' }, preferences: { 'pasta-spaghetti': 'case' } }), 'case');

['case', 'carton', 'tub', 'bunch', 'tray', 'pouch', 'loaf', 'jug', 'canister', 'clamshell'].forEach((unit) => {
  assert(units.PACKAGE_UNITS.includes(unit), `Missing package unit suggestion: ${unit}`);
});

const sandbox = { window: {}, console };
vm.runInNewContext(read('data/ingredients.js'), sandbox, { filename: 'data/ingredients.js' });
const rawCatalogCount = sandbox.window.BLISSFUL_INGREDIENTS.length;
vm.runInNewContext(read('data/recipes.js'), sandbox, { filename: 'data/recipes.js' });
vm.runInNewContext(read('scripts/ingredient-matching.js'), sandbox, { filename: 'scripts/ingredient-matching.js' });

const catalog = sandbox.window.BLISSFUL_INGREDIENTS;
const recipes = sandbox.window.BLISSFUL_RECIPES;
const matching = sandbox.window.BlissfulMatching;
assert(Array.isArray(catalog) && catalog.length > rawCatalogCount, 'Specificity pass should add canonical variants');
assert(Array.isArray(recipes) && recipes.length > 0, 'Recipe catalog did not load');
assert(matching && typeof matching.applyIngredientSpecificity === 'function');

const rerun = matching.applyIngredientSpecificity(catalog);
assert.equal(rerun.length, catalog.length, 'Specificity pass must be idempotent by slug');
assert.equal(new Set(catalog.map((item) => item.slug)).size, catalog.length, 'Effective ingredient slugs must remain unique');
assert.equal(new Set(catalog.map((item) => item.name.toLowerCase())).size, catalog.length, 'Effective ingredient names must remain unique');

const forbiddenGenericNames = new Set([
  'tuna',
  'salmon',
  'crab',
  'lobster',
  'mushrooms',
  'bell pepper',
  'corn',
  'spinach',
  'green beans',
  'artichoke hearts',
  'mixed berries',
  'chocolate chips',
  'bacon',
  'ham',
  'cooked rice',
  'coconut milk',
  'bone broth',
  'kidney beans',
  'pimento peppers',
  'hearts of palm',
  'canned beans',
]);
catalog.forEach((item) => {
  assert(
    !forbiddenGenericNames.has(String(item.name || '').trim().toLowerCase()),
    `Ambiguous canonical ingredient remains: ${item.name}`,
  );
});

const bySlug = new Map(catalog.map((item) => [item.slug, item]));
const requireIngredient = (slug, expectedName, expectedUnit) => {
  const item = bySlug.get(slug);
  assert(item, `Missing specific ingredient ${slug}`);
  if (expectedName) assert.equal(item.name, expectedName, `Unexpected name for ${slug}`);
  if (expectedUnit) assert.equal(units.getDefaultPackageUnit(item), expectedUnit, `Unexpected package for ${slug}`);
  return item;
};

requireIngredient('seafood-tuna', 'Canned Tuna (Solid White)', 'can');
requireIngredient('seafood-tuna-ahi', 'Ahi Tuna Loin', 'pack');
requireIngredient('seafood-salmon', 'Fresh Salmon Fillets', 'pack');
requireIngredient('seafood-salmon-smoked', 'Smoked Salmon', 'pack');
requireIngredient('seafood-crab', 'Lump Crab Meat', 'can');
requireIngredient('seafood-lobster', 'Lobster Meat', 'pack');
requireIngredient('veg-mushroom', 'Cremini Mushrooms (Baby Bella)', 'pack');
requireIngredient('mushroom-shiitake', 'Shiitake Mushrooms', 'pack');
requireIngredient('mushroom-mixed-wild', 'Mixed Wild Mushrooms', 'pack');
requireIngredient('veg-bell-pepper', 'Bell Pepper (Any Color)', 'each');
requireIngredient('veg-bell-pepper-green', 'Bell Pepper (Green)', 'each');
requireIngredient('veg-corn', 'Corn Kernels (Any Form)', 'bag');
requireIngredient('veg-corn-kernels-frozen', 'Corn Kernels (Frozen)', 'bag');
requireIngredient('veg-corn-kernels-canned', 'Corn Kernels (Canned)', 'can');
requireIngredient('veg-spinach', 'Baby Spinach (Fresh)', 'bag');
requireIngredient('veg-spinach-frozen-chopped', 'Spinach (Frozen Chopped)', 'bag');
requireIngredient('veg-artichoke', 'Artichoke Hearts (Canned)', 'can');
requireIngredient('veg-artichoke-hearts-marinated', 'Artichoke Hearts (Marinated)', 'jar');
requireIngredient('veg-roasted-red-peppers-jarred', 'Roasted Red Peppers (Jarred)', 'jar');
requireIngredient('fruit-mixed-berries', 'Mixed Berries (Fresh)', 'clamshell');
requireIngredient('fruit-mixed-berries-frozen', 'Mixed Berries (Frozen)', 'bag');
requireIngredient('baking-chocolate-chips', 'Semi-Sweet Chocolate Chips', 'bag');
requireIngredient('baking-chocolate-chips-dark-dairy-free', 'Dark Chocolate Chips (Dairy-Free)', 'bag');
requireIngredient('meat-bacon', 'Pork Bacon', 'pack');
requireIngredient('meat-turkey-bacon', 'Turkey Bacon', 'pack');
requireIngredient('meat-ham', 'Diced Ham', 'pack');
requireIngredient('meat-ham-spiral-cut', 'Spiral-Cut Ham', 'each');
requireIngredient('grain-rice-cooked', 'Ready-to-Eat Cooked Rice', 'pouch');
requireIngredient('grain-rice-jasmine', 'Rice (Jasmine)', 'bag');
requireIngredient('grain-rice-arborio', 'Rice (Arborio)', 'bag');
requireIngredient('bev-coconut-milk', 'Coconut Milk (Canned, Culinary)', 'can');
requireIngredient('bev-bone-broth', 'Chicken Bone Broth', 'carton');
requireIngredient('bev-bone-broth-beef', 'Beef Bone Broth', 'carton');
requireIngredient('bev-seafood-stock', 'Seafood Stock (Mixed/Fish)', 'carton');
requireIngredient('bev-shellfish-stock', 'Shellfish Stock', 'carton');
requireIngredient('legume-kidney-beans', 'Kidney Beans (Dark Red)', 'can');
requireIngredient('legume-kidney-beans-light-red', 'Kidney Beans (Light Red)', 'can');
requireIngredient('legume-baked-beans', 'Baked Beans', 'can');
requireIngredient('veg-pimento', 'Pimento Peppers (Jarred)', 'jar');
requireIngredient('veg-hearts-of-palm', 'Hearts of Palm (Canned)', 'can');
requireIngredient('dairy-powdered-milk', 'Powdered Milk', 'box');

const chickpeas = requireIngredient('legume-chickpea', 'Chickpeas', 'can');
assert(chickpeas.aliases.includes('Garbanzo Beans'), 'Chickpeas should match the common Garbanzo Beans name');

const catalogDefaults = units.buildCatalogDefaults(catalog);
assert.equal(Object.keys(catalogDefaults).length, catalog.length, 'Every effective ingredient slug must have one package default');
catalog.forEach((item) => {
  const unit = catalogDefaults[item.slug];
  assert.equal(typeof unit, 'string', `Missing package unit for ${item.slug}`);
  assert(unit.length > 0, `Empty package unit for ${item.slug}`);
  assert(units.PACKAGE_UNITS.includes(unit), `Unsupported package unit ${unit} for ${item.slug}`);
});

const matcherIndex = matching.createIngredientMatcherIndex(catalog);
const { recipeIngredientMatches } = matching.mapRecipesToIngredientMatches(recipes, matcherIndex);
const expectRecipeMatch = (recipeId, expected, excluded = []) => {
  const matches = recipeIngredientMatches.get(recipeId);
  assert(matches && typeof matches.has === 'function', `Missing recipe match set for ${recipeId}`);
  expected.forEach((slug) => assert(matches.has(slug), `${recipeId} should match ${slug}`));
  excluded.forEach((slug) => assert(!matches.has(slug), `${recipeId} should not retain generic ${slug}`));
};

expectRecipeMatch('classic-tuna-melt', ['seafood-tuna'], ['seafood-tuna-ahi']);
expectRecipeMatch('seared-ahi-tuna-bites', ['seafood-tuna-ahi'], ['seafood-tuna']);
expectRecipeMatch('citrus-herb-baked-salmon', ['seafood-salmon'], ['seafood-salmon-smoked']);
expectRecipeMatch('smoked-salmon-bagel-platter', ['seafood-salmon-smoked'], ['seafood-salmon']);
expectRecipeMatch('mushroom-spinach-lasagna', ['veg-mushroom'], ['mushroom-shiitake', 'mushroom-mixed-wild']);
expectRecipeMatch('turkey-soba-noodle-soup', ['mushroom-shiitake'], ['veg-mushroom']);
expectRecipeMatch('turkey-wild-mushroom-risotto', ['mushroom-mixed-wild'], ['veg-mushroom']);
expectRecipeMatch('chicken-fajita-tacos', ['veg-bell-pepper-red', 'veg-bell-pepper-green'], ['veg-bell-pepper']);
expectRecipeMatch('turkey-chili-stuffed-peppers', ['veg-bell-pepper']);
expectRecipeMatch('spinach-artichoke-dip', ['veg-spinach-frozen-chopped', 'veg-artichoke'], ['veg-spinach']);
expectRecipeMatch(
  'turkey-artichoke-pesto-flatbread',
  ['veg-artichoke-hearts-marinated', 'veg-roasted-red-peppers-jarred'],
  ['veg-artichoke'],
);
expectRecipeMatch('mixed-berry-protein-smoothie', ['fruit-mixed-berries-frozen'], ['fruit-mixed-berries']);
expectRecipeMatch('matcha-white-chocolate-blondies', ['baking-chocolate-chips-white'], ['baking-chocolate-chips']);
expectRecipeMatch('smores-brownies', ['baking-chocolate-chips-milk'], ['baking-chocolate-chips']);
expectRecipeMatch('maple-dijon-holiday-ham', ['meat-ham-spiral-cut'], ['meat-ham']);
expectRecipeMatch('ham-cheese-breakfast-sandwich', ['meat-ham-smoked-sliced'], ['meat-ham']);
expectRecipeMatch('denver-omelet-plate', ['meat-ham']);
expectRecipeMatch('pork-fried-rice', ['grain-rice-jasmine'], ['grain-rice-cooked']);
expectRecipeMatch('coconut-lime-chicken-curry', ['bev-coconut-milk']);

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

console.log(`Pantry package-unit and ingredient-specificity tests passed for ${catalog.length} effective ingredients.`);
