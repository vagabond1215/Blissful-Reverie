const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
const lists = require('../scripts/pantry-lists.js');

const seeded = lists.normalizeListState(null);
assert.equal(seeded.lists.length, 1);
assert.equal(seeded.lists[0].id, 'instacart');
assert.equal(lists.getListDisplayName(seeded.lists[0]), 'Instacart');
assert.equal(lists.getListItemCount(seeded.lists[0]), 0);

assert.equal(lists.getListDisplayName({ name: '', store: 'Costco' }), 'Costco');
assert.equal(lists.getListDisplayName({ name: 'Bulk run', store: 'Costco' }), 'Bulk run');
assert.equal(lists.getListDisplayName({ name: '', store: '' }), 'Untitled List');

let state = lists.normalizeListState({
  lists: [
    { id: 'costco', name: '', store: 'Costco', items: ['olive', 'olive'] },
    { id: 'giant', name: 'Weekly', store: 'Giant', items: [] },
  ],
  activeListId: 'costco',
});
assert.equal(lists.getListItemCount(state.lists[0]), 1);
state = lists.assignItemToList(state, 'olive', 'giant');
assert.deepEqual(state.lists[0].items, []);
assert.deepEqual(state.lists[1].items, ['olive']);

assert.deepEqual(
  lists.migrateProfilesToUnitMode({
    olive: { store: 'Costco', purchaseMode: 'package', packageSize: 6 },
  }),
  { olive: { store: 'Costco' } },
);
assert.equal(lists.getPurchaseUnit({ unit: 'can' }), 'can');
assert.equal(lists.getPurchaseUnit({}), 'each');

const loader = read('scripts/productivity-settings.js');
assert(loader.includes('styles/pantry-lists.css'));
assert(loader.includes('scripts/pantry-lists.js'));
assert(loader.includes('scripts/pantry-result-badge.js'));

const script = read('scripts/pantry-lists.js');
assert(script.includes("button.textContent = 'Lists'"));
assert(script.includes("placeholder.textContent = 'List'"));
assert(script.includes("nameInput.placeholder = 'Defaults to store name'"));
assert(script.includes("chrome.id = 'pantry-topbar-search'"));
assert(script.includes("card.querySelectorAll('.shopping-item-profile').forEach((node) => node.remove())"));
assert(!script.includes('Buy as'));
assert(!script.includes('Units per package'));

const badgeScript = read('scripts/pantry-result-badge.js');
assert(badgeScript.includes("badge.id = 'pantry-result-badge-live'"));
assert(badgeScript.includes("if (badge.textContent !== text) badge.textContent = text"));

const css = read('styles/pantry-lists.css');
assert(css.includes('.pantry-topbar-search'));
assert(css.includes('.pantry-result-badge'));
assert(css.includes('.pantry-list-selector'));
assert(css.includes('.pantry-lists-dialog'));
assert(css.includes('.pantry-lists-sidebar__item--empty'));

console.log('Pantry lists tests passed.');
