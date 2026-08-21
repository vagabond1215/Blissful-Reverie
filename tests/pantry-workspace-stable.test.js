const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const workspace = require('../scripts/pantry-workspace-core.js');
const refine = require('../scripts/pantry-workspace-refine.js');
const inventoryUnits = require('../scripts/inventory-units-core.js');
require('../scripts/inventory-units-rebase.js');
const inventoryRuntime = require('../scripts/pantry-inventory-units-row-runtime.js');
const itemSettings = require('../scripts/pantry-item-settings.js');

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
assert.equal(refine.SEARCH_PLACEHOLDER, 'Search...');
assert.equal(refine.CATEGORY_SELECTOR, '#ingredient-options input[type="checkbox"]:checked');
assert.deepEqual(refine.getCheckedValues([
  { checked: true, value: 'Pasta' },
  { checked: false, value: 'Dairy' },
  { checked: true, value: 'Vegetable' },
]), ['Pasta', 'Vegetable']);

const butterProfile = inventoryUnits.DEFAULT_PROFILES['dairy-butter-salted'];
const butterConversions = itemSettings.buildConversionRows(butterProfile);
const tablespoonConversion = butterConversions.find((entry) => entry.unit === 'tbsp');
assert(tablespoonConversion, 'Butter settings should expose tablespoon conversion.');
assert(Math.abs(tablespoonConversion.quantity - 8) < 1e-8, 'One butter stick should convert to eight tablespoons.');
assert.deepEqual(itemSettings.processesForSlug('output-a', [
  { id: 'one', output: { slug: 'output-a' } },
  { id: 'two', output: { slug: 'output-b' } },
]), [{ id: 'one', output: { slug: 'output-a' } }]);
const butterStockUnits = inventoryRuntime.getStockUnitOptions('dairy-butter-salted', butterProfile);
assert(butterStockUnits.length > 0, 'Row runtime should expose validated stock-unit choices.');
assert(butterStockUnits.every((unit) => unit.group !== 'package'), 'Pantry row units must exclude purchase/package units.');

const runtimeValues = new Map([
  ['blissful-app-state', JSON.stringify({
    pantryInventory: { 'dairy-butter-salted': { quantity: 4, unit: 'stick' } },
  })],
]);
global.localStorage = {
  getItem: (key) => runtimeValues.get(key) ?? null,
  setItem: (key, value) => runtimeValues.set(key, String(value)),
};
const converted = inventoryRuntime.changeStockUnit('dairy-butter-salted', 'tbsp');
assert.equal(converted.ok, true);
assert.deepEqual(JSON.parse(runtimeValues.get('blissful-app-state')).pantryInventory['dairy-butter-salted'], {
  quantity: 32,
  unit: 'tbsp',
});
const beforeIncompatible = runtimeValues.get('blissful-app-state');
assert.equal(inventoryRuntime.changeStockUnit('dairy-butter-salted', 'each').ok, false);
assert.equal(runtimeValues.get('blissful-app-state'), beforeIncompatible, 'Incompatible conversion must not mutate inventory.');

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
assert(header.includes("closest('.pantry-workspace__add-item')"));
assert(header.includes("pantry-restock-button')?.click()"));
assert(header.includes("more.id = 'pantry-workspace-overflow'"));
const actions = read('scripts/pantry-workspace-actions.js');
assert(actions.includes('scripts/pantry-workspace-popover.js'));
assert(actions.includes('scripts/pantry-workspace-refine.js'));
assert(actions.includes('scripts/inventory-units-core.js'));
assert(actions.includes('scripts/inventory-units-rebase.js'));
assert(actions.includes('data/ingredient-processes.js'));
assert(actions.includes('scripts/pantry-package-defaults-core.js'));
assert(actions.includes('scripts/inventory-unit-legacy-preferences.js'));
assert(!actions.includes('scripts/pantry-package-unit-runtime.js'));
assert(!actions.includes('scripts/pantry-package-unit-migration.js'));
assert(actions.includes('scripts/pantry-inventory-units-row-runtime.js'));
assert(!actions.includes("'scripts/pantry-inventory-units-runtime.js'"));
assert(actions.includes('scripts/shopping-inventory-units-sync.js'));
assert(!actions.includes('scripts/ingredient-process-runtime.js'));
assert(actions.includes('scripts/pantry-item-settings.js'));
assert(actions.includes('scripts/pantry-item-settings-focus-trap.js'));
assert(actions.indexOf('scripts/pantry-item-settings.js') > actions.indexOf('scripts/pantry-inventory-units-row-runtime.js'));
assert(actions.indexOf('scripts/pantry-item-settings-focus-trap.js') > actions.indexOf('scripts/pantry-item-settings.js'));
assert(actions.includes('scripts/recipe-inventory-runtime.js'));
const inventoryRuntimeSource = read('scripts/pantry-inventory-units-row-runtime.js');
assert(inventoryRuntimeSource.includes("unit?.group !== 'package'"));
assert(!inventoryRuntimeSource.includes("purchaseText.textContent = 'Buy as'"));
assert(inventoryRuntimeSource.includes('changeStockUnit'));
assert(inventoryRuntimeSource.includes('rebaseProfile'));
const itemSettingsSource = read('scripts/pantry-item-settings.js');
assert(itemSettingsSource.includes("trigger.textContent = '⚙'"));
assert(itemSettingsSource.includes("conversionHeading.textContent = 'Compatible unit conversions'"));
assert(!itemSettingsSource.includes("packageText.textContent = 'Buy as'"));
assert(itemSettingsSource.includes("heading.textContent = 'Make this ingredient'"));
assert(itemSettingsSource.includes('core.executeProcess'));
assert(!itemSettingsSource.includes('core.addPurchase'));
const focusTrapSource = read('scripts/pantry-item-settings-focus-trap.js');
assert(focusTrapSource.includes("event.key !== 'Tab'"));
assert(focusTrapSource.includes('event.shiftKey'));
const legacyPreferences = read('scripts/inventory-unit-legacy-preferences.js');
assert(legacyPreferences.includes('blissful-pantry-unit-preferences'));
assert(legacyPreferences.includes('migratePreferenceMap'));
const shoppingUnitSync = read('scripts/shopping-inventory-units-sync.js');
assert(!shoppingUnitSync.includes("purchaseMode: 'package'"));
assert(shoppingUnitSync.includes('normalizeUsageToStock'));
const refineSource = read('scripts/pantry-workspace-refine.js');
assert(refineSource.includes('requestAnimationFrame(clearNextCategory)'));
assert(refineSource.includes('stopImmediatePropagation()'));
assert(refineSource.includes("search.placeholder = SEARCH_PLACEHOLDER"));
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
assert(actionsCss.includes('pantry-workspace-row-controls.css'));
assert(actionsCss.includes('pantry-inventory-units.css'));
assert(actionsCss.includes('pantry-item-settings.css'));
const unitCss = read('styles/pantry-inventory-units.css');
assert(unitCss.includes('.pantry-card__unit-select'));
assert(unitCss.includes('.pantry-unit-profile'));
assert(unitCss.includes('.ingredient-processes'));
assert(unitCss.includes('.recipe-inventory-action'));
const itemSettingsCss = read('styles/pantry-item-settings.css');
assert(itemSettingsCss.includes('.pantry-item-settings__trigger'));
assert(itemSettingsCss.includes('#pantry-grid .pantry-unit-profile'));
assert(itemSettingsCss.includes('#pantry-grid .ingredient-processes'));
assert(itemSettingsCss.includes('display: none !important'));
const rowControlsCss = read('styles/pantry-workspace-row-controls.css');
assert(rowControlsCss.includes('border-bottom: 1px solid'));
assert(rowControlsCss.includes('border: 0 !important'));
assert(rowControlsCss.includes('width: 52px !important'));
assert(rowControlsCss.includes('width: 94px !important'));
const popoverCss = read('styles/pantry-workspace-popover.css');
assert(popoverCss.includes('#page-action-bar[popover]:popover-open'));
assert(popoverCss.includes('#pantry-restock-button'));
assert(popoverCss.includes(':not(.pantry-page-action):not(#pantry-lists-action):not(#pantry-tags-action)'));
assert(popoverCss.includes('display: none !important'));

const loader = read('scripts/productivity-settings.js');
assert(loader.includes("styles/pantry-workspace.css"));
assert(loader.includes("scripts/pantry-workspace.js"));
assert(loader.includes("styles/pantry-workspace-actions.css"));
assert(loader.includes("scripts/pantry-workspace-actions.js"));
assert(loader.indexOf('ensurePantryWorkspaceAssets();') > loader.indexOf('ensureShoppingReadinessRefinementAssets();'));
require('./pantry-package-units.test.js');
console.log('Stable Pantry workspace tests passed.');
