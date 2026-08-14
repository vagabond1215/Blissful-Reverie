const assert = require('node:assert/strict');
const pagination = require('../scripts/recipe-pagination.js');

const recipes = Array.from({ length: 53 }, (_, index) => ({ id: `recipe-${index + 1}` }));
const first = pagination.paginateItems(recipes, 1, 24);
assert.equal(first.totalItems, 53);
assert.equal(first.pageCount, 3);
assert.equal(first.items.length, 24);
assert.equal(first.items[0].id, 'recipe-1');
assert.equal(first.items[23].id, 'recipe-24');

const last = pagination.paginateItems(recipes, 99, 24);
assert.equal(last.currentPage, 3);
assert.equal(last.items.length, 5);
assert.equal(last.items[0].id, 'recipe-49');

const reduced = pagination.paginateItems(recipes.slice(0, 8), last.currentPage, 24);
assert.equal(reduced.currentPage, 1);
assert.equal(reduced.items.length, 8);

assert.deepEqual(pagination.paginateItems([], -3, 0), {
  items: [],
  currentPage: 1,
  pageCount: 1,
  pageSize: 24,
  totalItems: 0,
  startIndex: 0,
  endIndex: 0,
});

console.log('Recipe pagination behavior tests passed.');
