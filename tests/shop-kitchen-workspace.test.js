const assert = require('node:assert/strict');
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

const sheetGroup = workspace.GROUP_DEFINITIONS.find((group) => group.key === 'baking-sheets');
assert(sheetGroup.variants.some((variant) => variant.label.includes('9 × 13 in')));
assert(sheetGroup.variants.some((variant) => variant.label.includes('13 × 18 in')));
assert.equal(workspace.normalizeLabel('  Measuring   Cups '), 'measuring cups');

console.log('Shop and grouped Kitchen workspace tests passed.');
