const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const polish = require('../scripts/ui-polish.js');
assert.equal(typeof polish.getShoppingItemCount, 'function');
assert.equal(typeof polish.buildShoppingTextFromPanel, 'function');

const loader = read('scripts/productivity-settings.js');
assert(loader.includes("ensureScript('scripts/restock-pantry-only.js')"));
assert(loader.includes("ensureStylesheet('styles/ui-polish.css')"));
assert(loader.includes("ensureScript('scripts/ui-polish.js')"));
assert(!loader.includes("ensureScript('scripts/restock-wizard.js')"));
assert(!loader.includes("ensureScript('scripts/restock-pantry-nav.js')"));

const restock = read('scripts/restock-pantry-only.js');
assert(restock.includes("document.getElementById('pantry-restock-button')"));
assert(!restock.includes('redirectLegacyKitchenView'));
assert(!restock.includes('configureTopbarTrigger'));
assert(!restock.includes('hideLegacyKitchenView'));
assert(!restock.includes('data-view-target="kitchen"'));

const runtimePolish = read('scripts/ui-polish.js');
assert(runtimePolish.includes("document.querySelector('#productivity-dashboard .productivity-shopping')"));
assert(runtimePolish.includes("candidate.id = 'pantry-smart-shopping'"));
assert(runtimePolish.includes("name.textContent = 'Smart Shopping'"));
assert(runtimePolish.includes('pantry-lists-editor--smart'));
assert(runtimePolish.includes('pantry-lists-dialog__close'));
assert(runtimePolish.includes('family-manage-dialog__trash'));

const css = read('styles/ui-polish.css');
assert(css.includes('.pantry-card__favorite-button'));
assert(css.includes('.meal-card__favorite-button'));
assert(css.includes("[aria-pressed='true']"));
assert(css.includes('.schedule-dialog__button--primary'));
assert(css.includes('var(--btn-primary-fg'));
assert(css.includes('.family-manage-dialog__trash'));
assert(css.includes('var(--base-danger'));
assert(css.includes('.pantry-lists-dialog__close svg'));
assert(css.includes('html.recipes-view-active #page-action-bar.page-action-bar'));

console.log('UI and Smart Shopping polish tests passed.');