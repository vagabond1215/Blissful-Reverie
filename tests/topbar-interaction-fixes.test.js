const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (relativePath) => fs
  .readFileSync(path.join(rootDir, relativePath), 'utf8')
  .replace(/\r\n?/g, '\n');

const pantry = require('../scripts/pantry-topbar-controls.js');
const familyManage = require('../scripts/family-manage-fix.js');
const dislikes = require('../scripts/family-dislikes.js');
const dislikesFix = require('../scripts/family-dislikes-click-fix.js');
const recipeActions = require('../scripts/recipe-page-actions.js');
const kitchenSearch = require('../scripts/kitchen-topbar-search.js');

assert.equal(pantry.normalizeStockFilter('all'), 'all');
assert.equal(pantry.normalizeStockFilter('bad'), 'all');
assert.equal(pantry.nextStockFilter('all'), 'in');
assert.equal(pantry.nextStockFilter('in'), 'low');
assert.equal(pantry.nextStockFilter('low'), 'out');
assert.equal(pantry.nextStockFilter('out'), 'all');
assert.equal(pantry.normalizeSortMode('commonality'), 'alphabetical');
assert.equal(pantry.toggleSortMode('alphabetical'), 'frequent');
assert.equal(pantry.toggleSortMode('frequent'), 'alphabetical');

assert.equal(recipeActions.isRecipesViewOwned({ viewHidden: false, shopActive: false }), true);
assert.equal(recipeActions.isRecipesViewOwned({ viewHidden: false, shopActive: true }), false);
assert.equal(recipeActions.isRecipesViewOwned({ viewHidden: true, shopActive: false }), false);
assert.equal(kitchenSearch.isKitchenTabSelected({ active: true, ariaCurrent: '' }), true);
assert.equal(kitchenSearch.isKitchenTabSelected({ active: false, ariaCurrent: 'page' }), true);
assert.equal(kitchenSearch.isKitchenTabSelected({ active: false, ariaCurrent: '' }), false);

const familyState = {
  activeView: 'family',
  familyMembers: [{ id: 'a', name: 'Alex' }, { id: 'b', name: 'Riley' }],
  mealPlanMemberFilter: ['a', 'b'],
  pantryInventory: { olives: { quantity: '2', unit: 'can' } },
};
assert.deepEqual(familyManage.removeMemberFromState(familyState, 'a'), {
  ...familyState,
  familyMembers: [{ id: 'b', name: 'Riley' }],
  mealPlanMemberFilter: ['b'],
});

const token = { kind: 'ingredient', key: 'fruit-lemon', label: 'Lemon' };
let dislikeState = dislikesFix.toggleTokenInState(
  { members: { a: [] } },
  'a',
  token,
  dislikes.normalizeState,
  dislikes.normalizeTokenList,
);
assert.deepEqual(dislikeState.members.a, [token]);
dislikeState = dislikesFix.toggleTokenInState(
  dislikeState,
  'a',
  token,
  dislikes.normalizeState,
  dislikes.normalizeTokenList,
);
assert.deepEqual(dislikeState.members.a, []);

const loader = read('scripts/productivity-settings.js');
assert(loader.includes('styles/topbar-consistency.css'));
assert(loader.includes('scripts/pantry-topbar-controls.js'));
assert(loader.includes('scripts/family-manage-fix.js'));
assert(loader.includes('scripts/family-dislikes-click-fix.js'));
assert(loader.includes('styles/workspace-flow-fix.css'));
assert(loader.includes('scripts/kitchen-topbar-search.js'));
assert(loader.indexOf('ensureWorkspaceFlowAssets();') > loader.indexOf('ensureRestockAssets();'));

const recipeScript = read('scripts/recipe-page-actions.js');
assert(recipeScript.includes("document.getElementById('meal-view')"));
assert(!recipeScript.includes("document.getElementById('meals-view')"));
assert(recipeScript.includes("document.body.classList.contains('shop-view-active')"));
assert(recipeScript.includes("bar.appendChild(chip)"));
assert(recipeScript.includes("document.getElementById('recipe-family-filter')"));
assert(recipeScript.includes("'recipe-family-page-action'"));
assert(recipeScript.includes('syncActionEndcaps()'));
assert(recipeScript.includes("input.id = 'recipe-topbar-search-input'"));

const kitchenSearchScript = read('scripts/kitchen-topbar-search.js');
assert(kitchenSearchScript.includes("document.getElementById('filter-search')"));
assert(kitchenSearchScript.includes("input.id = 'kitchen-topbar-search-input'"));
assert(kitchenSearchScript.includes("input.setAttribute('aria-label', 'Search kitchen equipment')"));
assert(kitchenSearchScript.includes("source.dispatchEvent(new Event('input', { bubbles: true }))"));
assert(kitchenSearchScript.includes("#primary-nav [data-view-target=\"kitchen\"]"));

const pantryScript = read('scripts/pantry-topbar-controls.js');
assert(pantryScript.includes("'pantry-stock-cycle-action'"));
assert(pantryScript.includes("'pantry-sort-action'"));
assert(pantryScript.includes("'pantry-favorites-action'"));
assert(pantryScript.includes("settings.sortBy === 'commonality'"));
assert(pantryScript.includes("STOCK_LABELS = Object.freeze({ all: 'All', in: 'Stocked', low: 'Low', out: 'Out' })"));

const familyScript = read('scripts/family-manage-fix.js');
assert(familyScript.includes('All member data will be permanently lost'));
assert(familyScript.includes('app.applyStarterState(next)'));
assert(familyScript.includes('if (!memberId) {\n      syncMemberIds();'));

const dislikesScript = read('scripts/family-dislikes-click-fix.js');
assert(dislikesScript.includes("event.target.closest('.family-dislikes__add')"));
assert(dislikesScript.includes('renderChoices(root)'));
assert(dislikesScript.includes('event.stopImmediatePropagation()'));
assert(dislikesScript.includes('toggleTokenInState'));

const restockNav = read('scripts/restock-pantry-nav.js');
assert(restockNav.includes("target.dataset.viewTarget = KITCHEN_VIEW"));
assert(restockNav.includes('app.applyStarterState(next)'));
assert(restockNav.includes('new MutationObserver'));
assert(!restockNav.includes('CORRECTION_FRAMES'));

const topbarCss = read('styles/topbar-consistency.css');
assert(topbarCss.includes('--topbar-segment-height: 38px'));
assert(topbarCss.includes('#pantry-sort-filter'));
assert(topbarCss.includes('display: none !important'));
assert(topbarCss.includes('box-shadow: none !important'));

const uiPolishCss = read('styles/ui-polish.css');
assert(uiPolishCss.includes('gap: 0 !important;'));
assert(uiPolishCss.includes('#recipe-family-filter.recipe-family-filter--page-actions'));
assert(uiPolishCss.includes('transform: none !important;'));
assert(uiPolishCss.includes('.recipe-family-page-action:hover'));
assert(uiPolishCss.includes('z-index: 1;'));

const shopKitchenCss = read('styles/shop-kitchen-workspace.css');
assert(shopKitchenCss.includes('#kitchen-topbar-search'));
assert(shopKitchenCss.includes('#kitchen-topbar-search input'));
assert(shopKitchenCss.includes('#filter-panel .input-group--search:has(#filter-search)'));
assert(shopKitchenCss.includes('margin-inline-start: auto'));
assert(shopKitchenCss.includes('.kitchen-equipment-group__label {\n  min-height: 2.65rem;\n  padding: 0.3rem 0;'));

const shopTopbarCss = read('styles/shop-store-mode.css');
assert(shopTopbarCss.includes('@import url("./workspace-topbar-ownership.css")'));
assert(!shopTopbarCss.includes('body.shop-view-active #page-action-bar > :not(.shop-page-action)'));
assert(!shopTopbarCss.includes('body:not(.shop-view-active) #page-action-bar .shop-page-action'));

const shopStoreScript = read('scripts/shop-store-mode.js');
assert(shopStoreScript.includes('const restoreClickedCoreTab = (event) =>'));
assert(shopStoreScript.includes('#primary-nav .view-toggle__button:not([data-shop-tab="true"])'));
assert(shopStoreScript.includes("button.classList.toggle('view-toggle__button--active', selected)"));
assert(shopStoreScript.includes("button.setAttribute('aria-current', 'page')"));
assert(shopStoreScript.includes("document.addEventListener('click', restoreClickedCoreTab, true)"));

const ownershipCss = read('styles/workspace-topbar-ownership.css');
assert(ownershipCss.includes('#primary-nav [data-view-target="meals"]'));
assert(ownershipCss.includes('#primary-nav [data-view-target="pantry"]'));
assert(ownershipCss.includes('#primary-nav [data-shop-tab="true"]'));
assert(ownershipCss.includes('#primary-nav [data-view-target="family"]'));
assert(ownershipCss.includes('#primary-nav [data-view-target="kitchen"]'));
assert(ownershipCss.includes('#primary-nav [data-view-target="meal-plan"]'));
assert(ownershipCss.includes('#page-action-bar > #pantry-restock-button'));
assert(ownershipCss.includes('#page-action-bar > #shop-recipe-references-action'));
assert(ownershipCss.includes('#page-action-bar > #family-manage-action'));
assert(ownershipCss.includes('#recipe-topbar-search'));
assert(ownershipCss.includes('#pantry-topbar-search'));
assert(ownershipCss.includes('position: static !important'));
assert(ownershipCss.includes('transform: none !important'));
assert(ownershipCss.includes('display: none !important'));
assert(ownershipCss.includes('display: inline-flex !important'));

const flowCss = read('styles/workspace-flow-fix.css');
assert(flowCss.includes('html.recipes-view-active #page-action-bar.page-action-bar'));
assert(flowCss.includes('#recipe-family-filter.recipe-family-filter--page-actions:not([hidden])'));
assert(flowCss.includes('.page-action-bar__segment-last'));
assert(flowCss.includes('#family-view.family-view--refined'));
assert(flowCss.includes('max-height: none !important'));
assert(flowCss.includes('#pantry-grid[data-card-flow="vertical"] .pantry-category--card > .pantry-category__list'));
assert(flowCss.includes('overflow: visible !important'));
assert(flowCss.includes('#pantry-grid[data-card-flow="horizontal"]::-webkit-scrollbar'));

console.log('Topbar and interaction fix tests passed.');
