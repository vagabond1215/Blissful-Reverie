const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
const productivityUi = require('../scripts/productivity-ui.js');
const recipeActions = require('../scripts/recipe-page-actions.js');
const shoppingRefine = require('../scripts/meal-plan-shopping-refine.js');
const tools = require('../scripts/productivity-tools.js');

assert.equal(productivityUi.normalizeReadinessLimit('0'), 0);
assert.equal(productivityUi.normalizeReadinessLimit('1'), 1);
assert.equal(productivityUi.normalizeReadinessLimit('2'), 2);
assert.equal(productivityUi.normalizeReadinessLimit('9'), 2);

const entries = [
  { recipe: { id: 'ready' }, fit: { missing: [] } },
  { recipe: { id: 'one' }, fit: { missing: ['a'] } },
  { recipe: { id: 'two' }, fit: { missing: ['a', 'b'] } },
  { recipe: { id: 'three' }, fit: { missing: ['a', 'b', 'c'] } },
];
assert.deepEqual(productivityUi.filterReadinessEntries(entries, 0), []);
assert.deepEqual(productivityUi.filterReadinessEntries(entries, 1).map(({ recipe }) => recipe.id), ['one']);
assert.deepEqual(productivityUi.filterReadinessEntries(entries, 2).map(({ recipe }) => recipe.id), ['one', 'two']);

const planned = [{ id: 'a' }, { id: 'b' }];
const matches = new Map([
  ['a', new Set(['olive-oil', 'egg'])],
  ['b', new Set(['egg', 'quinoa'])],
]);
assert.deepEqual(productivityUi.collectPlannedIngredientSlugs(planned, matches), ['egg', 'olive-oil', 'quinoa']);

assert.equal(recipeActions.normalizeReadinessLimit('bad'), 2);
assert.equal(recipeActions.nextReadinessLimit(0), 1);
assert.equal(recipeActions.nextReadinessLimit(1), 2);
assert.equal(recipeActions.nextReadinessLimit(2), 0);
assert.equal(recipeActions.formatReadinessLabel(0), 'Off');
assert.equal(recipeActions.formatReadinessLabel(1), '1 ingredient');
assert.equal(recipeActions.formatReadinessLabel(2), '2 ingredients');

const allowed = shoppingRefine.parseAllowedSlugs('["olives","milk"]');
assert.equal(allowed.has('olives'), true);
assert.equal(shoppingRefine.shouldKeepManagedRow({ slug: 'olives', restockOnly: true }, allowed), true);
assert.equal(shoppingRefine.shouldKeepManagedRow({ slug: 'coffee', restockOnly: true }, allowed), false);
assert.equal(shoppingRefine.shouldKeepManagedRow({ slug: 'coffee', restockOnly: false }, allowed), true);

const substitutionGraph = new Map([
  ['egg', { members: new Set(['egg', 'quinoa']) }],
]);
const withSubstitution = tools.analyzeRecipePantryFit({
  recipe: { id: 'sub-test' },
  pantryInventory: { quinoa: { quantity: '1', unit: 'cup' } },
  recipeIngredientMatches: new Set(['egg']),
  substitutionGraph,
  substitutionsAllowed: true,
});
const withoutSubstitution = tools.analyzeRecipePantryFit({
  recipe: { id: 'sub-test' },
  pantryInventory: { quinoa: { quantity: '1', unit: 'cup' } },
  recipeIngredientMatches: new Set(['egg']),
  substitutionGraph,
  substitutionsAllowed: false,
});
assert.equal(withSubstitution.missing.length, 0);
assert.equal(withSubstitution.substituted.length, 1);
assert.equal(withoutSubstitution.missing.length, 1);

const productivityScript = read('scripts/productivity-ui.js');
assert(productivityScript.includes("title.textContent = 'Missing or Low Meal Plan Ingredients'"));
assert(productivityScript.includes("panel.dataset.shoppingRecommendationScope = 'meal-plan'"));
assert(productivityScript.includes('productivity-dashboard__recipe-chip'));
assert(productivityScript.includes('recipe-preview-dialog'));
assert(!productivityScript.includes("createDashboardGroup('Cook now'"));
assert(!productivityScript.includes("createDashboardGroup('Shopping candidates'"));
assert(!productivityScript.includes("SHOPPING_SOURCE_CLOSEST"));
assert(!productivityScript.includes("createShoppingSourceControl"));

const actionScript = read('scripts/recipe-page-actions.js');
assert(actionScript.includes('recipe-readiness-action'));
assert(actionScript.includes('blissful-recipe-readiness-change'));

const refineScript = read('scripts/meal-plan-shopping-refine.js');
assert(refineScript.includes('shoppingRecommendationSlugs'));
assert(refineScript.includes("event.stopImmediatePropagation()"));
assert(refineScript.includes(".shopping-management__summary"));

const loader = read('scripts/productivity-settings.js');
assert(loader.includes('styles/shopping-readiness-refine.css'));
assert(loader.includes('scripts/meal-plan-shopping-refine.js'));

const css = read('styles/shopping-readiness-refine.css');
assert(css.includes('padding: 0 3px !important'));
assert(css.includes('.productivity-dashboard__recipe-chip'));
assert(css.includes('.recipe-preview-dialog'));

console.log('Shopping and recipe readiness refinement tests passed.');