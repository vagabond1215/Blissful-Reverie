const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const workspace = require('../scripts/pantry-workspace-core.js');

const sample = [
  { category: 'Pasta', tags: ['Vegan', 'Contains Gluten'] },
  { category: 'Pasta', tags: ['Vegan', 'Organic'] },
  { category: 'Dairy', tags: ['Vegetarian', 'Contains Dairy'] },
];
assert.deepEqual(workspace.countOptions(sample, 'categories'), { pasta: 2, dairy: 1 });
assert.deepEqual(workspace.countOptions(sample, 'tags'), { vegan: 2, organic: 1, vegetarian: 1 });
assert.deepEqual(workspace.countOptions(sample, 'allergens'), { 'contains gluten': 1, 'contains dairy': 1 });
assert.deepEqual(workspace.visibleIndexes([{ selected: false }, { selected: false }, { selected: false }, { selected: true }], 2, false), [0, 1, 3]);
assert.deepEqual(workspace.visibleIndexes([{}, {}, {}], 2, true), [0, 1, 2]);

const bootstrap = read('scripts/pantry-workspace.js');
assert(bootstrap.includes('scripts/pantry-workspace-core.js'));
assert(bootstrap.includes('scripts/pantry-workspace-filters.js'));
assert(bootstrap.includes('scripts/pantry-workspace-header.js'));
const filters = read('scripts/pantry-workspace-filters.js');
assert(filters.includes('pantry-workspace__filter-count'));
assert(filters.includes('pantry-workspace__show-more'));
assert(filters.includes('input.click()'));
assert(filters.includes('node.textContent !== next'));
const header = read('scripts/pantry-workspace-header.js');
assert(header.includes("classList.toggle('pantry-workspace-active'"));
assert(header.includes("pantry-restock-button')?.click()"));
assert(header.includes("more.id = 'pantry-workspace-overflow'"));
const actions = read('scripts/pantry-workspace-actions.js');
assert(actions.includes('scripts/pantry-workspace-popover.js'));
const popover = read('scripts/pantry-workspace-popover.js');
assert(popover.includes("bar.setAttribute('popover', 'auto')"));
assert(popover.includes('bar.togglePopover()'));

const css = read('styles/pantry-workspace.css');
assert(css.includes('.pantry-workspace__filter-card'));
assert(css.includes('#pantry-count::after'));
assert(css.includes('.pantry-workspace__add-item'));
assert(css.includes('#pantry-grid .pantry-category--card'));
assert(css.includes('display: contents !important'));
const actionsCss = read('styles/pantry-workspace-actions.css');
assert(actionsCss.includes('pantry-workspace-popover.css'));
const popoverCss = read('styles/pantry-workspace-popover.css');
assert(popoverCss.includes('#page-action-bar[popover]:popover-open'));
assert(popoverCss.includes('#pantry-restock-button'));

const loader = read('scripts/productivity-settings.js');
assert(loader.includes("styles/pantry-workspace.css"));
assert(loader.includes("scripts/pantry-workspace.js"));
assert(loader.includes("styles/pantry-workspace-actions.css"));
assert(loader.includes("scripts/pantry-workspace-actions.js"));
assert(loader.indexOf('ensurePantryWorkspaceAssets();') > loader.indexOf('ensureShoppingReadinessRefinementAssets();'));
console.log('Stable Pantry workspace tests passed.');
