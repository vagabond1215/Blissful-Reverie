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

const sheetGroup = workspace.GROUP_DEFINITIONS.find((group) => group.key === 'baking-sheet');
assert(sheetGroup, 'Canonical Baking Sheet group should exist.');
assert(sheetGroup.variants.some((variant) => variant.label.includes('9 × 13 in')));
assert(sheetGroup.variants.some((variant) => variant.label.includes('13 × 18 in')));
assert(sheetGroup.legacyIds.includes('baking-sheets'));
assert.equal(workspace.normalizeLabel('  Measuring   Cups '), 'measuring cups');

const equipmentCatalog = require('../data/equipment.js');
const equipmentModel = require('../scripts/equipment-model.js');
const equipmentIndex = equipmentModel.createIndex(equipmentCatalog);
const bakingSheet = equipmentIndex.byToken.get('baking-sheet');
assert.equal(bakingSheet.category, 'Bakeware');
assert(bakingSheet.aliases.includes('Sheet Pan'));
assert.equal(equipmentIndex.byToken.get('air-fryer').category, 'Small Appliances');
assert.equal(equipmentIndex.byToken.get('skillet').category, 'Cookware');
assert.equal(equipmentIndex.byToken.get('tongs').category, 'Utensils & Tools');

const recipeSource = fs.readFileSync(path.resolve(__dirname, '../data/recipes.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(recipeSource, sandbox, { filename: 'data/recipes.js' });
const catalogRecipes = Array.isArray(sandbox.window.BLISSFUL_RECIPES) ? sandbox.window.BLISSFUL_RECIPES : [];
assert(catalogRecipes.length > 0);
catalogRecipes.forEach((recipe) => {
  (recipe.equipment || []).forEach((requirement) => {
    const tokens = equipmentModel.getRequirementTokens(requirement, equipmentIndex);
    const expected = typeof requirement?.token === 'string'
      ? 1
      : Array.isArray(requirement?.anyOf)
        ? requirement.anyOf.length
        : 0;
    assert(expected > 0, `${recipe.id} should use token-based equipment requirements.`);
    assert.equal(tokens.length, expected, `${recipe.id} should resolve every equipment token.`);
  });
});
const bakingAlternative = catalogRecipes
  .flatMap((recipe) => recipe.equipment || [])
  .find((requirement) => Array.isArray(requirement?.anyOf)
    && requirement.anyOf.includes('baking-sheet')
    && requirement.anyOf.includes('pizza-stone'));
assert(bakingAlternative, 'Baking Sheet or Pizza Stone should be represented as explicit alternatives.');
assert.equal(equipmentModel.formatRequirement(bakingAlternative, equipmentIndex), 'Baking Sheet or Pizza Stone');

const appCss = fs.readFileSync(path.resolve(__dirname, '../styles/app.css'), 'utf8');
const sharedRailCss = fs.readFileSync(path.resolve(__dirname, '../styles/standard-filter-rail.css'), 'utf8');
const kitchenCleanupCss = fs.readFileSync(path.resolve(__dirname, '../styles/kitchen-workspace-cleanup.css'), 'utf8');
assert(appCss.includes("@import url('./standard-filter-rail.css');"));
assert(appCss.includes("@import url('./kitchen-workspace-cleanup.css');"));
assert(sharedRailCss.includes('html.standard-filter-workspace-active #app-layout.layout'));
assert(sharedRailCss.includes('grid-template-columns: minmax(235px, 308px) minmax(0, 1fr)'));
assert(sharedRailCss.includes('#filter-panel.filter-panel'));
assert(kitchenCleanupCss.includes('#kitchen-view > .pantry-view__header'));
assert(!kitchenCleanupCss.includes('#filter-panel.filter-panel'), 'Kitchen cleanup must not hide the shared category rail.');

console.log('Shop and grouped Kitchen workspace tests passed.');
