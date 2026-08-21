const assert = require('node:assert/strict');
const integration = require('../scripts/family-pagination-integration.js');
const dislikes = require('../scripts/family-dislikes.js');

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

const freshRecipesLoad = dislikes.pruneRemovedMemberDislikes({
  state,
  familyMembers: [{ id: 'sam' }, { id: 'lee' }],
  fallbackMemberIds: [],
});
assert.deepEqual(
  freshRecipesLoad.removedIds,
  [],
  'Persisted dislikes must survive a fresh Recipes load when Family cards have not rendered yet.',
);
assert.deepEqual(freshRecipesLoad.state.members, state.members);
assert.deepEqual(
  integration.filterRecipesForActiveDislikes({
    recipes,
    memberIds: ['sam'],
    state: freshRecipesLoad.state,
    recipeIngredientMatches,
    ingredientBySlug,
  }).map((recipe) => recipe.id),
  ['chicken-soup', 'apple-oats'],
  'The surviving persisted dislike must continue filtering Recipes before pagination.',
);

const removedMember = dislikes.pruneRemovedMemberDislikes({
  state,
  familyMembers: [{ id: 'lee' }],
  fallbackMemberIds: ['sam', 'lee'],
});
assert.deepEqual(removedMember.removedIds, ['sam']);
assert.equal(
  Object.prototype.hasOwnProperty.call(removedMember.state.members, 'sam'),
  false,
  'A member removed from persisted app state should still have stale dislike data cleaned up.',
);
assert.deepEqual(removedMember.state.members.lee, state.members.lee);

const noMemberEvidenceYet = dislikes.pruneRemovedMemberDislikes({
  state,
  familyMembers: null,
  fallbackMemberIds: [],
});
assert.deepEqual(
  noMemberEvidenceYet.state.members,
  state.members,
  'Cleanup should be non-destructive until either persisted members or rendered Family cards provide authoritative evidence.',
);

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
