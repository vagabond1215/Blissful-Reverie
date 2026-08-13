const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
const productivityUi = require('../scripts/productivity-ui.js');
const recipeActions = require('../scripts/recipe-page-actions.js');
const shoppingRefine = require('../scripts/meal-plan-shopping-refine.js');
const tools = require('../scripts/productivity-tools.js');
const familyDislikes = require('../scripts/family-dislikes.js');
const dislikePicker = require('../scripts/family-dislikes-click-fix.js');
const previewActions = require('../scripts/discovery-preview-actions.js');

const mealHistory = {
  '2026-08-10': [
    { recipeId: 'past-b' },
    { recipeId: 'past-a' },
    { recipeId: 'past-a' },
  ],
  '2026-08-12': [{ recipeId: 'today' }],
  '2026-08-13': [{ recipeId: 'future' }],
  invalid: [{ recipeId: 'bad-date' }],
};
assert.deepEqual(
  productivityUi.collectPastMealPlanRecipeIds(mealHistory, '2026-08-12'),
  ['past-a', 'past-b'],
);

const discoveryEntries = [
  { recipe: { id: 'ready-new' }, fit: { total: 3, missing: [] } },
  { recipe: { id: 'ready-swap' }, fit: { total: 2, missing: [], substituted: [{ requested: 'a', substitute: 'b' }] } },
  { recipe: { id: 'made-before' }, fit: { total: 3, missing: [] } },
  { recipe: { id: 'missing-one' }, fit: { total: 3, missing: ['a'] } },
  { recipe: { id: 'unknown' }, fit: { total: 0, missing: [] } },
];
assert.deepEqual(
  productivityUi.filterDiscoveryEntries(discoveryEntries, new Set(['made-before'])).map(({ recipe }) => recipe.id),
  ['ready-new', 'ready-swap'],
);

const planned = [{ id: 'a' }, { id: 'b' }];
const matches = new Map([
  ['a', new Set(['olive-oil', 'egg'])],
  ['b', new Set(['egg', 'quinoa'])],
]);
assert.deepEqual(productivityUi.collectPlannedIngredientSlugs(planned, matches), ['egg', 'olive-oil', 'quinoa']);

assert.equal(recipeActions.normalizeCount('19'), 19);
assert.equal(recipeActions.normalizeCount('bad'), 0);
assert.equal(recipeActions.formatResultCount(1234), '1,234');

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
assert.equal(
  productivityUi.filterDiscoveryEntries([{ recipe: { id: 'sub-test' }, fit: withSubstitution }], []).length,
  1,
);

const ingredientCatalog = [
  { kind: 'category', key: 'dairy', label: 'Dairy' },
  ...Array.from({ length: 125 }, (_, index) => ({
    kind: 'ingredient',
    key: `ingredient-${index}`,
    label: index === 42 ? 'Whole Milk' : `Ingredient ${index}`,
    search: index === 42 ? ['whole milk', 'milk'] : [`ingredient ${index}`],
  })),
];
assert.equal(dislikePicker.filterIngredientTokens(ingredientCatalog, '').length, 125);
assert.deepEqual(dislikePicker.filterIngredientTokens(ingredientCatalog, 'milk').map((token) => token.key), ['ingredient-42']);

const dislikeToken = { kind: 'ingredient', key: 'ingredient-42', label: 'Whole Milk' };
let dislikeState = dislikePicker.toggleTokenInState(
  { version: 1, members: {} },
  'member-1',
  dislikeToken,
  familyDislikes.normalizeState,
  familyDislikes.normalizeTokenList,
);
assert.deepEqual(dislikeState.members['member-1'], [dislikeToken]);
dislikeState = dislikePicker.toggleTokenInState(
  dislikeState,
  'member-1',
  dislikeToken,
  familyDislikes.normalizeState,
  familyDislikes.normalizeTokenList,
);
assert.deepEqual(dislikeState.members['member-1'], []);

const fakePreviewButton = {
  closest: () => ({ dataset: { recipeId: 'recipe-42' } }),
};
assert.equal(previewActions.getRecipeIdFromPreviewButton(fakePreviewButton), 'recipe-42');

const productivityScript = read('scripts/productivity-ui.js');
assert(productivityScript.includes("heading.textContent = 'Discover new meals:'"));
assert(productivityScript.includes('collectPastMealPlanRecipeIds'));
assert(productivityScript.includes("const MEAL_PLAN_STORAGE_KEY = 'blissful-meal-plan'"));
assert(productivityScript.includes("title.textContent = 'Missing or Low Meal Plan Ingredients'"));
assert(productivityScript.includes("panel.dataset.shoppingRecommendationScope = 'meal-plan'"));
assert(productivityScript.includes('productivity-dashboard__recipe-chip'));
assert(productivityScript.includes('recipe-preview-dialog'));
assert(!productivityScript.includes('filterReadinessEntries'));
assert(!productivityScript.includes('READINESS_STORAGE_KEY'));
assert(!productivityScript.includes("createDashboardGroup('Cook now'"));
assert(!productivityScript.includes("createDashboardGroup('Shopping candidates'"));
assert(!productivityScript.includes('SHOPPING_SOURCE_CLOSEST'));
assert(!productivityScript.includes('createShoppingSourceControl'));

const actionScript = read('scripts/recipe-page-actions.js');
assert(!actionScript.includes('ensureReadinessAction'));
assert(!actionScript.includes('blissful-recipe-readiness-change'));
assert(!actionScript.includes('READINESS_STORAGE_KEY'));
assert(actionScript.includes("document.getElementById('recipe-readiness-action')?.remove()"));

const refineScript = read('scripts/meal-plan-shopping-refine.js');
assert(refineScript.includes('shoppingRecommendationSlugs'));
assert(refineScript.includes('event.stopImmediatePropagation()'));
assert(refineScript.includes('.shopping-management__summary'));

const dislikeScript = read('scripts/family-dislikes-click-fix.js');
assert(dislikeScript.includes(".filter((token) => token?.kind === 'ingredient')"));
assert(!dislikeScript.includes('choices.slice('));
assert(dislikeScript.includes("button.setAttribute('aria-pressed'"));
assert(dislikeScript.includes('toggleTokenInState'));

const previewScript = read('scripts/discovery-preview-actions.js');
assert(previewScript.includes("#recipe-preview-dialog .meal-card--preview .meal-card__schedule-button"));
assert(previewScript.includes("button.style.setProperty('pointer-events', 'auto', 'important')"));
assert(previewScript.includes('liveButton.click()'));
assert(previewScript.includes('global.scrollTo(scrollX, scrollY)'));

const densityScript = read('scripts/pantry-density-fix.js');
assert(densityScript.includes("card.style.setProperty('grid-template-rows', '26px auto', 'important')"));
assert(densityScript.includes("card.style.setProperty('padding', '0 3px', 'important')"));
assert(densityScript.includes("row.style.setProperty('margin', row.hidden ? '0' : '0 0 2px', 'important')"));

const loader = read('scripts/productivity-settings.js');
assert(loader.includes('styles/shopping-readiness-refine.css'));
assert(loader.includes('styles/recipe-card-layout.css'));
assert(loader.includes('scripts/meal-plan-shopping-refine.js'));
assert(loader.includes('scripts/discovery-preview-actions.js'));
assert(loader.includes('scripts/pantry-density-fix.js'));

const refineCss = read('styles/shopping-readiness-refine.css');
assert(refineCss.includes('padding: 0 3px !important'));
assert(refineCss.includes('.productivity-dashboard__group--discover'));
assert(refineCss.includes('.productivity-dashboard__recipe-chip'));
assert(refineCss.includes('.recipe-preview-dialog'));
assert(!refineCss.includes('.recipe-readiness-action'));

const layoutCss = read('styles/recipe-card-layout.css');
assert(layoutCss.includes('grid-template-columns: 8.75rem minmax(0, 1fr)'));
assert(layoutCss.includes('@media (min-width: 641px) and (max-width: 920px)'));
assert(layoutCss.includes(':has(> .ingredient-list)'));
assert(layoutCss.includes(':has(> .instruction-list)'));

console.log('Shopping, discovery, dislikes, preview actions, and recipe-card layout refinement tests passed.');