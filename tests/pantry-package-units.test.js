const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const packages = require('../scripts/pantry-package-defaults-core.js');

const ingredient = (slug, name, category, packageUnit) => ({
  slug,
  name,
  category,
  tags: [],
  ...(packageUnit ? { packageUnit } : {}),
});

[
  ['pasta-spaghetti', 'Spaghetti', 'Pasta', 'box'],
  ['pasta-bucatini', 'Bucatini', 'Pasta & Noodles', 'box'],
  ['egg-large', 'Large Eggs', 'Dairy & Refrigerated', 'carton'],
  ['dairy-butter', 'Butter (Unsalted)', 'Dairy', 'box'],
  ['dairy-buttermilk', 'Buttermilk', 'Dairy', 'carton'],
  ['oil-clarified-butter', 'Clarified Butter', 'Oil/Fat', 'jar'],
  ['dairy-milk', 'Milk (Whole)', 'Dairy', 'jug'],
  ['dairy-powdered-milk', 'Powdered Milk', 'Dairy & Refrigerated', 'box'],
  ['alt-milk-almond', 'Almond Milk', 'Dairy Alternative', 'carton'],
  ['condiment-coconut-milk', 'Coconut Milk', 'Condiment/Sauce', 'can'],
  ['meat-beef-ground', 'Ground Beef', 'Meat', 'tray'],
  ['herb-cilantro', 'Cilantro', 'Herb', 'bunch'],
  ['spice-cumin', 'Ground Cumin', 'Spice', 'jar'],
  ['legume-black-beans', 'Black Beans', 'Legume', 'can'],
  ['legume-borlotti', 'Borlotti Beans', 'Legumes & Pulses', 'can'],
  ['legume-red-lentils', 'Red Lentils', 'Legume', 'bag'],
  ['grain-white-rice', 'White Rice', 'Grain', 'bag'],
  ['veg-frozen-broccoli', 'Frozen Broccoli Florets', 'Vegetable', 'bag'],
  ['mushroom-shiitake', 'Shiitake Mushrooms', 'Mushrooms & Fungi', 'pack'],
  ['bev-chicken-stock', 'Chicken Stock', 'Beverage', 'carton'],
  ['bev-chicken-bouillon', 'Chicken Bouillon', 'Beverage', 'jar'],
  ['fat-duck', 'Duck Fat', 'Oils & Fats', 'jar'],
  ['bakery-bread', 'Sandwich Bread', 'Baked Goods & Doughs', 'loaf'],
  ['produce-onion', 'Yellow Onion', 'Vegetable', 'each'],
].forEach(([slug, name, category, expected]) => {
  assert.equal(packages.getDefaultPackageUnit(ingredient(slug, name, category)), expected, `${name} package default`);
});
assert.equal(packages.getDefaultPackageUnit(ingredient('explicit-jar', 'Example', 'Vegetable', 'jar')), 'jar');

const spaghetti = ingredient('pasta-spaghetti', 'Spaghetti', 'Pasta');
assert.equal(packages.resolvePantryUnit({ ingredient: spaghetti, inventoryEntry: null, preferences: {} }), 'box');
assert.equal(packages.resolvePantryUnit({ ingredient: spaghetti, inventoryEntry: { unit: 'bag' }, preferences: {} }), 'bag');
assert.equal(packages.resolvePantryUnit({ ingredient: spaghetti, inventoryEntry: { unit: 'bag' }, preferences: { 'pasta-spaghetti': 'each' } }), 'each');

['case', 'carton', 'tub', 'bunch', 'tray', 'pouch', 'loaf', 'jug', 'canister', 'clamshell'].forEach((unit) => {
  assert(packages.PACKAGE_UNITS.includes(unit), `Missing package suggestion ${unit}`);
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
assert.equal(matching.applyIngredientSpecificity(catalog).length, catalog.length, 'Specificity pass must be idempotent');
assert.equal(new Set(catalog.map((item) => item.slug)).size, catalog.length, 'Effective ingredient slugs must be unique');
assert.equal(new Set(catalog.map((item) => item.name.toLowerCase())).size, catalog.length, 'Effective ingredient names must be unique');

const forbiddenGenericNames = new Set([
  'tuna', 'salmon', 'crab', 'lobster', 'mushrooms', 'bell pepper', 'corn', 'spinach', 'green beans',
  'artichoke hearts', 'mixed berries', 'chocolate chips', 'bacon', 'ham', 'cooked rice', 'coconut milk',
  'bone broth', 'kidney beans', 'pimento peppers', 'hearts of palm', 'canned beans',
]);
catalog.forEach((item) => {
  assert(!forbiddenGenericNames.has(String(item.name || '').trim().toLowerCase()), `Ambiguous canonical ingredient remains: ${item.name}`);
});

const bySlug = new Map(catalog.map((item) => [item.slug, item]));
const requireIngredient = (slug, expectedName, expectedPackage) => {
  const item = bySlug.get(slug);
  assert(item, `Missing specific ingredient ${slug}`);
  if (expectedName) assert.equal(item.name, expectedName, `Unexpected name for ${slug}`);
  if (expectedPackage) assert.equal(packages.getDefaultPackageUnit(item), expectedPackage, `Unexpected package for ${slug}`);
  return item;
};

[
  ['seafood-tuna', 'Canned Tuna (Solid White)', 'can'],
  ['seafood-tuna-ahi', 'Ahi Tuna Loin', 'pack'],
  ['seafood-salmon', 'Fresh Salmon Fillets', 'pack'],
  ['seafood-salmon-smoked', 'Smoked Salmon', 'pack'],
  ['veg-mushroom', 'Cremini Mushrooms (Baby Bella)', 'pack'],
  ['mushroom-shiitake', 'Shiitake Mushrooms', 'pack'],
  ['veg-bell-pepper', 'Bell Pepper (Any Color)', 'each'],
  ['veg-bell-pepper-green', 'Bell Pepper (Green)', 'each'],
  ['veg-corn', 'Corn Kernels (Any Form)', 'bag'],
  ['veg-corn-kernels-frozen', 'Corn Kernels (Frozen)', 'bag'],
  ['veg-corn-kernels-canned', 'Corn Kernels (Canned)', 'can'],
  ['veg-spinach', 'Baby Spinach (Fresh)', 'bag'],
  ['veg-spinach-frozen-chopped', 'Spinach (Frozen Chopped)', 'bag'],
  ['veg-artichoke', 'Artichoke Hearts (Canned)', 'can'],
  ['veg-artichoke-hearts-marinated', 'Artichoke Hearts (Marinated)', 'jar'],
  ['veg-roasted-red-peppers-jarred', 'Roasted Red Peppers (Jarred)', 'jar'],
  ['fruit-mixed-berries', 'Mixed Berries (Fresh)', 'clamshell'],
  ['fruit-mixed-berries-frozen', 'Mixed Berries (Frozen)', 'bag'],
  ['baking-chocolate-chips-dark-dairy-free', 'Dark Chocolate Chips (Dairy-Free)', 'bag'],
  ['meat-bacon', 'Pork Bacon', 'pack'],
  ['meat-turkey-bacon', 'Turkey Bacon', 'pack'],
  ['meat-ham', 'Diced Ham', 'pack'],
  ['meat-ham-spiral-cut', 'Spiral-Cut Ham', 'each'],
  ['grain-rice-cooked', 'Ready-to-Eat Cooked Rice', 'pouch'],
  ['grain-rice-jasmine', 'Rice (Jasmine)', 'bag'],
  ['bev-coconut-milk', 'Coconut Milk (Canned, Culinary)', 'can'],
  ['bev-bone-broth', 'Chicken Bone Broth', 'carton'],
  ['legume-kidney-beans', 'Kidney Beans (Dark Red)', 'can'],
  ['legume-kidney-beans-light-red', 'Kidney Beans (Light Red)', 'can'],
  ['legume-baked-beans', 'Baked Beans', 'can'],
].forEach((args) => requireIngredient(...args));
const chickpeas = requireIngredient('legume-chickpea', 'Chickpeas', 'can');
assert(chickpeas.aliases.includes('Garbanzo Beans'));

const catalogDefaults = packages.buildCatalogDefaults(catalog);
assert.equal(Object.keys(catalogDefaults).length, catalog.length, 'Every effective ingredient needs a package suggestion');
catalog.forEach((item) => assert(packages.PACKAGE_UNITS.includes(catalogDefaults[item.slug]), `Unsupported package for ${item.slug}`));

const matcherIndex = matching.createIngredientMatcherIndex(catalog);
const { recipeIngredientMatches } = matching.mapRecipesToIngredientMatches(recipes, matcherIndex);
const expectRecipeMatch = (recipeId, expected, excluded = []) => {
  const matches = recipeIngredientMatches.get(recipeId);
  assert(matches && typeof matches.has === 'function', `Missing recipe matches for ${recipeId}`);
  expected.forEach((slug) => assert(matches.has(slug), `${recipeId} should match ${slug}`));
  excluded.forEach((slug) => assert(!matches.has(slug), `${recipeId} should not match ${slug}`));
};
expectRecipeMatch('classic-tuna-melt', ['seafood-tuna'], ['seafood-tuna-ahi']);
expectRecipeMatch('seared-ahi-tuna-bites', ['seafood-tuna-ahi'], ['seafood-tuna']);
expectRecipeMatch('citrus-herb-baked-salmon', ['seafood-salmon'], ['seafood-salmon-smoked']);
expectRecipeMatch('smoked-salmon-bagel-platter', ['seafood-salmon-smoked'], ['seafood-salmon']);
expectRecipeMatch('turkey-soba-noodle-soup', ['mushroom-shiitake'], ['veg-mushroom']);
expectRecipeMatch('chicken-fajita-tacos', ['veg-bell-pepper-red', 'veg-bell-pepper-green'], ['veg-bell-pepper']);
expectRecipeMatch('spinach-artichoke-dip', ['veg-spinach-frozen-chopped', 'veg-artichoke'], ['veg-spinach']);
expectRecipeMatch('mixed-berry-protein-smoothie', ['fruit-mixed-berries-frozen'], ['fruit-mixed-berries']);
expectRecipeMatch('maple-dijon-holiday-ham', ['meat-ham-spiral-cut'], ['meat-ham']);

const loader = read('scripts/pantry-workspace-actions.js');
assert(loader.includes('scripts/pantry-package-defaults-core.js'));
assert(loader.includes('scripts/inventory-unit-legacy-preferences.js'));
assert(loader.includes('scripts/pantry-inventory-units-row-runtime.js'));
assert(!loader.includes('scripts/pantry-inventory-units-runtime.js'));
assert(!loader.includes('scripts/pantry-package-unit-runtime.js'), 'Legacy package unit writer must not load');
assert(!loader.includes('scripts/pantry-package-unit-migration.js'), 'Legacy package migration must not load');
const legacyMigration = read('scripts/inventory-unit-legacy-preferences.js');
assert(legacyMigration.includes('blissful-pantry-unit-preferences'));
assert(legacyMigration.includes("definition.group === 'package'"));
assert(legacyMigration.includes('rebaseProfile'));

console.log(`Pantry package suggestions and ingredient-specificity tests passed for ${catalog.length} effective ingredients.`);
