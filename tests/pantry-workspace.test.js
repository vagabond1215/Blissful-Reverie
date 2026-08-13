const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const workspace = require('../scripts/pantry-workspace.js');

const sample = [
  { category: 'Pasta', tags: ['Vegan', 'Contains Gluten'] },
  { category: 'Pasta', tags: ['Vegan', 'Organic'] },
  { category: 'Dairy', tags: ['Vegetarian', 'Contains Dairy'] },
];
assert.deepEqual(workspace.countOptions(sample, 'categories'), { pasta: 2, dairy: 1 });
assert.deepEqual(workspace.countOptions(sample, 'tags'), { vegan: 2, organic: 1, vegetarian: 1 });
assert.deepEqual(workspace.countOptions(sample, 'allergens'), { 'contains gluten': 1, 'contains dairy': 1 });
assert.deepEqual(
  workspace.visibleIndexes([
    { selected: false },
    { selected: false },
    { selected: false },
    { selected: true },
  ], 2, false),
  [0, 1, 3],
);
assert.deepEqual(workspace.visibleIndexes([{}, {}, {}], 2, true), [0, 1, 2]);

const script = read('scripts/pantry-workspace.js');
assert(script.includes("['categories', 'ingredient-section', 'ingredient-options'"));
assert(script.includes("['tags', 'tag-section', 'tag-options'"));
assert(script.includes("['allergens', 'allergy-section', 'allergy-options'"));
assert(script.includes("forward('pantry-restock-button')"));
assert(script.includes("forward('pantry-lists-action')"));
assert(script.includes("document.documentElement.classList.toggle('pantry-workspace-active'"));
assert(script.includes('pantry-workspace__filter-count'));
assert(script.includes('pantry-workspace__show-more'));

const css = read('styles/pantry-workspace.css');
assert(css.includes('html.pantry-workspace-active #page-action-bar'));
assert(css.includes('.pantry-workspace__filter-card'));
assert(css.includes('.pantry-workspace__filter-count'));
assert(css.includes('#pantry-count::after'));
assert(css.includes('.pantry-workspace__add-item'));
assert(css.includes('#pantry-grid .pantry-category--card'));
assert(css.includes('display: contents !important'));
assert(css.includes("#pantry-grid[data-card-flow='vertical']"));
assert(css.includes('overflow: visible !important'));

const loader = read('scripts/productivity-settings.js');
assert(loader.includes("ensureStylesheet('styles/pantry-workspace.css')"));
assert(loader.includes("ensureScript('scripts/pantry-workspace.js')"));
assert(loader.indexOf('ensurePantryWorkspaceAssets();') > loader.indexOf('ensureShoppingReadinessRefinementAssets();'));

console.log('Pantry workspace reconciliation tests passed.');
