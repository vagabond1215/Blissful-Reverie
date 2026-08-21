const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const workspace = require('../scripts/shop-kitchen-workspace.js');

const spoons = {
  ...workspace.GROUP_DEFINITIONS.find((group) => group.key === 'measuring-spoons'),
  legacyIds: ['measuring-spoons'],
};
assert(spoons, 'Measuring Spoons group should exist.');

const legacySelection = workspace.getGroupSelection(new Set(['measuring-spoons']), spoons);
assert.equal(legacySelection.checked, true, 'A legacy generic selection should read as the complete set.');
assert.equal(legacySelection.selectedCount, spoons.variants.length);
assert.equal(legacySelection.legacySelected, true);

const partial = workspace.setVariantOwned(new Set(['measuring-spoons']), spoons, 'measuring-spoons-1-4-tsp', false);
assert.equal(partial.has('measuring-spoons'), false, 'Granular edits should retire the generic legacy marker.');
assert.equal(partial.has('measuring-spoons-1-4-tsp'), false);
assert.equal(partial.has('measuring-spoons-1-2-tsp'), true);
const partialSelection = workspace.getGroupSelection(partial, spoons);
assert.equal(partialSelection.checked, false);
assert.equal(partialSelection.indeterminate, true);
assert.equal(partialSelection.selectedCount, spoons.variants.length - 1);

const all = workspace.setGroupOwned(partial, spoons, true);
assert.equal(workspace.getGroupSelection(all, spoons).checked, true);
spoons.variants.forEach((variant) => assert(all.has(variant.id), `${variant.id} should be selected.`));

const none = workspace.setGroupOwned(all, spoons, false);
assert.equal(workspace.getGroupSelection(none, spoons).selectedCount, 0);
assert.equal(none.has('measuring-spoons'), false);

workspace.GROUP_DEFINITIONS.forEach((group) => {
  assert.equal(
    workspace.shouldRenderGroup(group, '', false),
    true,
    `${group.label} should be available as first-class Kitchen inventory even without a recipe-derived generic row.`,
  );
});
assert.equal(workspace.groupMatchesSearch(spoons, 'measuring spoons'), true);
assert.equal(workspace.groupMatchesSearch(spoons, '1/4 tsp'), true);
assert.equal(workspace.groupMatchesSearch(spoons, 'blender'), false);
assert.equal(workspace.shouldRenderGroup(spoons, 'blender', false), false);

const sheetGroup = workspace.GROUP_DEFINITIONS.find((group) => group.key === 'baking-sheets');
assert(sheetGroup.variants.some((variant) => variant.label.includes('9 × 13 in')));
assert(sheetGroup.variants.some((variant) => variant.label.includes('13 × 18 in')));
assert.equal(workspace.normalizeLabel('  Measuring   Cups '), 'measuring cups');

const recipeSource = fs.readFileSync(path.resolve(__dirname, '../data/recipes.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(recipeSource, sandbox, { filename: 'data/recipes.js' });
const equipmentLabels = new Set(
  (Array.isArray(sandbox.window.BLISSFUL_RECIPES) ? sandbox.window.BLISSFUL_RECIPES : [])
    .flatMap((recipe) => Array.isArray(recipe?.equipment) ? recipe.equipment : [])
    .map((label) => String(label || '').trim())
    .filter(Boolean),
);
const catalogMatches = (group) => {
  const aliases = new Set([group.label, ...(group.aliases || [])].map(workspace.normalizeLabel));
  return Array.from(equipmentLabels).filter((label) => aliases.has(workspace.normalizeLabel(label)));
};
const measuringCups = workspace.GROUP_DEFINITIONS.find((group) => group.key === 'measuring-cups');
assert(catalogMatches(measuringCups).includes('Measuring Cups'));
const bakingSheetMatches = catalogMatches(sheetGroup);
assert(bakingSheetMatches.includes('Baking Sheet'));
assert(bakingSheetMatches.includes('Sheet Pan'));

const appCss = fs.readFileSync(path.resolve(__dirname, '../styles/app.css'), 'utf8');
const kitchenCleanupCss = fs.readFileSync(path.resolve(__dirname, '../styles/kitchen-workspace-cleanup.css'), 'utf8');
assert(appCss.includes("@import url('./kitchen-workspace-cleanup.css');"));
assert(kitchenCleanupCss.includes('#filter-panel.filter-panel'));
assert(kitchenCleanupCss.includes('grid-template-columns: minmax(0, 1fr) !important;'));
assert(kitchenCleanupCss.includes('#kitchen-view > .pantry-view__header'));
assert(kitchenCleanupCss.includes('#kitchen-view > .kitchen-view__intro'));
assert(kitchenCleanupCss.includes('grid-column: 1 / -1 !important;'));

console.log('Shop and grouped Kitchen workspace tests passed.');
