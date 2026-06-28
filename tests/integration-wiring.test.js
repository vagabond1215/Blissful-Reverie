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
  'scripts/productivity-backup.js',
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

const productivityStyles = read('styles/productivity.css');
assert(productivityStyles.includes('.productivity-dashboard'));
assert(productivityStyles.includes('.productivity-onboarding'));
assert(productivityStyles.includes('.productivity-backup'));
assert(productivityStyles.includes('.productivity-settings-advanced'));
assert(productivityStyles.includes('.productivity-shopping__source-control'));
assert(productivityStyles.includes('.productivity-shopping__source-pill'));
assert(productivityStyles.includes('.productivity-shopping__copy-status'));
assert(productivityStyles.includes('@media (max-width: 640px)'));

[
  'scripts/productivity-tools.js',
  'scripts/productivity-settings.js',
  'scripts/productivity-backup.js',
  'scripts/productivity-onboarding.js',
  'scripts/productivity-ui.js',
].forEach((relativePath) => {
  const content = read(relativePath);
  assert(!content.includes('style.textContent'), `${relativePath} should not embed long CSS strings`);
});

const productivitySettings = read('scripts/productivity-settings.js');
assert(productivitySettings.includes('styles/productivity.css'));

const productivityUi = read('scripts/productivity-ui.js');
assert(!productivityUi.includes('MutationObserver'));
assert(productivityUi.includes('global.BlissfulProductivityUI'));
assert(productivityUi.includes('From meal plan'));
assert(productivityUi.includes('Closest recipes'));
assert(productivityUi.includes('Planned meals are covered by your pantry'));
assert(productivityUi.includes('Add pantry items to compare closest recipes'));
assert(productivityUi.includes('Shopping list copied.'));
assert(productivityUi.includes('productivity-shopping__copy-status'));
assert(productivityUi.includes('productivity-shopping__source-pill'));

const app = read('scripts/app.js');
assert(app.includes('card.dataset.recipeId = recipe.id'));
assert(app.includes('productivityUi.render({'));
assert(app.includes('plannedRecipes'));
assert(app.includes('applyStarterState'));

console.log('Application wiring tests passed.');
