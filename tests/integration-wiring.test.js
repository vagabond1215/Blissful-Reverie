const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const indexHtml = read('index.html');
const expectedScripts = [
  'data/ingredients.js',
  'data/recipes.js',
  'scripts/ingredient-matching.js',
  'scripts/productivity-tools.js',
  'scripts/productivity-settings.js',
  'scripts/productivity-onboarding.js',
  'scripts/productivity-ui.js',
  'scripts/theme-utils.js',
  'scripts/app.js',
];

let previousIndex = -1;
expectedScripts.forEach((src) => {
  const currentIndex = indexHtml.indexOf(`src="${src}"`);
  assert(currentIndex > previousIndex, `${src} should load after the previous application script`);
  previousIndex = currentIndex;
});

const themeUtils = read('scripts/theme-utils.js');
assert(!themeUtils.includes('BLISSFUL_INGREDIENTS'));
assert(!themeUtils.includes('productivity-tools.js'));
assert(!themeUtils.includes('document.createElement(\'script\')'));

const productivityUi = read('scripts/productivity-ui.js');
assert(!productivityUi.includes('MutationObserver'));
assert(productivityUi.includes('global.BlissfulProductivityUI'));

const app = read('scripts/app.js');
assert(app.includes('card.dataset.recipeId = recipe.id'));
assert(app.includes('productivityUi.render({'));
assert(app.includes('applyStarterState'));

console.log('Application wiring tests passed.');
