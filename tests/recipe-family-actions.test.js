const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
const dislikes = require('../scripts/family-dislikes.js');
const recipeActions = require('../scripts/recipe-page-actions.js');

const ingredients = [
  { slug: 'fruit-lemon', name: 'Lemon', category: 'Fruit', aliases: ['lemons'] },
  { slug: 'meat-beef', name: 'Beef', category: 'Meat' },
  { slug: 'vegetable-mushroom', name: 'Mushroom', category: 'Vegetable' },
];
const catalog = dislikes.buildDislikeCatalog(ingredients);
assert(catalog.some((token) => token.kind === 'ingredient' && token.key === 'fruit-lemon'));
assert(catalog.some((token) => token.kind === 'category' && token.label === 'Meat'));
assert.equal(catalog.filter((token) => token.kind === 'category' && token.label === 'Meat').length, 1);

const ingredientBySlug = new Map(ingredients.map((ingredient) => [ingredient.slug, ingredient]));
assert.equal(dislikes.recipeConflictsWithTokens({
  recipeSlugs: new Set(['fruit-lemon']),
  tokens: [{ kind: 'ingredient', key: 'fruit-lemon', label: 'Lemon' }],
  ingredientBySlug,
}), true);
assert.equal(dislikes.recipeConflictsWithTokens({
  recipeSlugs: new Set(['meat-beef']),
  tokens: [{ kind: 'category', key: 'meat', label: 'Meat' }],
  ingredientBySlug,
}), true);
assert.equal(dislikes.recipeConflictsWithTokens({
  recipeSlugs: new Set(['vegetable-mushroom']),
  tokens: [{ kind: 'category', key: 'meat', label: 'Meat' }],
  ingredientBySlug,
}), false);
assert.deepEqual(dislikes.normalizeTokenList([
  { kind: 'ingredient', key: 'fruit-lemon', label: 'Lemon' },
  { kind: 'ingredient', key: 'fruit-lemon', label: 'Lemon' },
]), [{ kind: 'ingredient', key: 'fruit-lemon', label: 'Lemon' }]);
assert.deepEqual(dislikes.normalizeState({ members: { a: [{ kind: 'category', key: 'meat', label: 'Meat' }] } }), {
  version: 1,
  members: { a: [{ kind: 'category', key: 'meat', label: 'Meat' }] },
});

assert.equal(recipeActions.normalizeCount(-5), 0);
assert.equal(recipeActions.normalizeCount('19'), 19);
assert.equal(recipeActions.formatResultCount(19), '19');

const loader = read('scripts/productivity-settings.js');
assert(loader.includes('styles/recipe-page-actions.css'));
assert(loader.includes('scripts/recipe-page-actions.js'));
assert(loader.includes('styles/family-dislikes.css'));
assert(loader.includes('scripts/family-dislikes.js'));

const recipeScript = read('scripts/recipe-page-actions.js');
assert(recipeScript.includes("document.getElementById('recipe-action-chip')"));
assert(recipeScript.includes("bar.appendChild(chip)"));
assert(recipeScript.includes("input.id = 'recipe-topbar-search-input'"));
assert(recipeScript.includes("badge.id = 'recipe-result-badge'"));
assert(recipeScript.includes("meal-card--family-disliked"));

const recipeCss = read('styles/recipe-page-actions.css');
assert(recipeCss.includes('#page-action-bar[hidden]'));
assert(recipeCss.includes('#page-action-bar #family-manage-action'));
assert(recipeCss.includes('height: 38px !important'));
assert(recipeCss.includes('html.recipes-view-active #filter-panel .input-group--search'));
assert(recipeCss.includes('#page-action-bar #reset-filters'));

const familyScript = read('scripts/family-dislikes.js');
assert(familyScript.includes("add.textContent = 'Add'"));
assert(familyScript.includes("textarea.hidden = true"));
assert(familyScript.includes('blissful-family-dislikes'));
assert(familyScript.includes('schedule-dialog__member.schedule-dialog__member--active'));
assert(familyScript.includes("warning.id = 'schedule-dialog-dislike-warning'"));
assert(familyScript.includes('__familyDislikesBackupExtended'));

const familyCss = read('styles/family-dislikes.css');
assert(familyCss.includes('.family-dislikes__tokens'));
assert(familyCss.includes('.family-dislikes-picker__choice'));
assert(familyCss.includes('.meal-card--family-disliked'));
assert(familyCss.includes('.schedule-dialog__dislike-warning'));

console.log('Recipes and Family action/dislike tests passed.');
