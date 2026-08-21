const assert = require('node:assert/strict');
const integration = require('../scripts/family-pagination-integration.js');
const safety = require('../scripts/family-dislikes-preferences-safety.js');

const recipes = [
  { id: 'chicken-soup' },
  { id: 'tomato-pasta' },
  { id: 'apple-oats' },
];
const recipeIngredientMatches = new Map([
  ['chicken-soup', new Set(['meat-chicken', 'vegetable-carrot'])],
  ['tomato-pasta', new Set(['vegetable-tomato', 'grain-pasta'])],
  ['apple-oats', new Set(['fruit-apple', 'grain-oats'])],
]);
const ingredientBySlug = new Map([
  ['meat-chicken', { slug: 'meat-chicken', category: 'Meat' }],
  ['vegetable-carrot', { slug: 'vegetable-carrot', category: 'Vegetable' }],
  ['vegetable-tomato', { slug: 'vegetable-tomato', category: 'Vegetable' }],
  ['grain-pasta', { slug: 'grain-pasta', category: 'Grain' }],
  ['fruit-apple', { slug: 'fruit-apple', category: 'Fruit' }],
  ['grain-oats', { slug: 'grain-oats', category: 'Grain' }],
]);

const state = {
  members: {
    sam: [{ kind: 'ingredient', key: 'vegetable-tomato', label: 'Tomato' }],
    lee: [{ kind: 'category', key: 'meat', label: 'Meat' }],
  },
};

assert.deepEqual(
  integration.resolveActiveMemberIds(
    [true, false],
    [{ id: 'sam', name: 'Sam' }, { id: 'lee', name: 'Lee' }],
  ),
  ['sam'],
  'Recipe Family buttons should resolve directly from persisted member order without requiring Family-view cards.',
);
assert.deepEqual(
  integration.resolveActiveMemberIds(
    [true, true],
    [{ id: 'sam' }, { id: 'lee' }],
  ),
  ['sam', 'lee'],
);
assert.deepEqual(integration.resolveActiveMemberIds([true], []), []);

const repairedStartup = safety.preserveMountedIndependentDislikes({
  initialState: state,
  currentState: { version: 1, members: {} },
  familyMembers: [{ id: 'sam' }, { id: 'lee' }],
});
assert.deepEqual(repairedStartup.restoredIds, ['sam', 'lee']);
assert.deepEqual(repairedStartup.state.members, state.members);

const intentionalClear = safety.preserveMountedIndependentDislikes({
  initialState: state,
  currentState: { version: 1, members: { sam: [], lee: state.members.lee } },
  familyMembers: [{ id: 'sam' }, { id: 'lee' }],
});
assert.deepEqual(intentionalClear.restoredIds, [], 'An explicit empty dislike list must not be mistaken for startup data loss.');
assert.deepEqual(intentionalClear.state.members.sam, []);

const removedMember = safety.preserveMountedIndependentDislikes({
  initialState: state,
  currentState: { version: 1, members: {} },
  familyMembers: [{ id: 'lee' }],
});
assert.deepEqual(removedMember.restoredIds, ['lee']);
assert.equal(Object.prototype.hasOwnProperty.call(removedMember.state.members, 'sam'), false, 'A member removed from app state should not be restored.');

assert.deepEqual(
  integration.filterRecipesForActiveDislikes({ recipes, memberIds: [], state, recipeIngredientMatches, ingredientBySlug }).map((recipe) => recipe.id),
  ['chicken-soup', 'tomato-pasta', 'apple-oats'],
);
assert.deepEqual(
  integration.filterRecipesForActiveDislikes({ recipes, memberIds: ['sam'], state, recipeIngredientMatches, ingredientBySlug }).map((recipe) => recipe.id),
  ['chicken-soup', 'apple-oats'],
);
assert.deepEqual(
  integration.filterRecipesForActiveDislikes({ recipes, memberIds: ['sam', 'lee'], state, recipeIngredientMatches, ingredientBySlug }).map((recipe) => recipe.id),
  ['apple-oats'],
);
assert.equal(
  integration.recipeConflictsWithTokens({
    recipe: recipes[0],
    tokens: [{ kind: 'category', key: 'meat', label: 'Meat' }],
    recipeIngredientMatches,
    ingredientBySlug,
  }),
  true,
);

const indexed = new Set(recipes.map((recipe) => recipe.id));
assert.equal(integration.hasUnindexedRecipes(recipes, indexed), false);
assert.equal(
  integration.hasUnindexedRecipes([...recipes, { id: 'ingredient-spotlight-late' }], indexed),
  true,
  'Late runtime-generated recipes should trigger a recipe-match index refresh.',
);

console.log('Family Dislikes pre-pagination filtering tests passed.');
