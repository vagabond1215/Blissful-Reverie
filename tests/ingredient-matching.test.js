const assert = require('assert');
const matching = require('../scripts/ingredient-matching.js');

const tests = [];

const test = (name, fn) => {
  tests.push({ name, fn });
};

test('buildTokenSet removes descriptors and normalizes tokens', () => {
  const tokens = matching.buildTokenSet('2 Large, diced Sweet Potatoes');
  assert(tokens.has('sweet'), 'expected token set to include "sweet"');
  assert(tokens.has('potato'), 'expected token set to include "potato"');
  assert(!tokens.has('large'), 'expected descriptor tokens to be removed');
  assert(!tokens.has('diced'), 'expected descriptor tokens to be removed');
});

test('createIngredientMatcher captures slug-derived tokens', () => {
  const matcher = matching.createIngredientMatcher({
    slug: 'veg-sweet-potato',
    name: 'Sweet Potatoes',
  });
  assert(matcher.tokens.has('sweet'));
  assert(matcher.tokens.has('potato'));
  assert(matcher.variants.has('sweet potatoes'));
});

test('doesEntryMatchIngredient matches pluralized ingredient entries', () => {
  const matcher = matching.createIngredientMatcher({
    slug: 'veg-sweet-potato',
    name: 'Sweet Potato',
  });
  const entry = {
    text: matching.sanitizeComparisonText('3 sweet potatoes, diced'),
    tokens: matching.buildTokenSet('3 sweet potatoes, diced'),
  };
  assert(
    matching.doesEntryMatchIngredient(entry, matcher),
    'expected sweet potato matcher to match plural entry',
  );
});

test('doesEntryMatchIngredient avoids false positives for different items', () => {
  const matcher = matching.createIngredientMatcher({
    slug: 'oil-peanut',
    name: 'Peanut Oil',
  });
  const entry = {
    text: matching.sanitizeComparisonText('creamy peanut butter'),
    tokens: matching.buildTokenSet('creamy peanut butter'),
  };
  assert(
    !matching.doesEntryMatchIngredient(entry, matcher),
    'expected peanut oil matcher not to match peanut butter',
  );
});

test('mapRecipesToIngredientMatches maps matches and usage flags', () => {
  const ingredients = [
    { slug: 'veg-sweet-potato', name: 'Sweet Potato', category: 'Vegetable' },
    { slug: 'oil-peanut', name: 'Peanut Oil', category: 'Oil/Fat' },
    { slug: 'oil-olive', name: 'Olive Oil', category: 'Oil/Fat' },
    { slug: 'meat-chicken-breast', name: 'Chicken Breast', category: 'Meat' },
    { slug: 'meat-chicken-thigh', name: 'Chicken Thigh', category: 'Meat' },
  ];
  const recipes = [
    {
      id: 'sheet-pan-dinner',
      ingredients: [
        { item: '2 large sweet potatoes, diced' },
        { item: '2 tablespoons olive oil' },
      ],
    },
    {
      id: 'stir-fry',
      ingredients: [
        { item: '1 lb chicken breast (boneless, skinless)' },
        { item: '2 tablespoons peanut oil' },
      ],
    },
  ];

  const index = matching.createIngredientMatcherIndex(ingredients);
  const { recipeIngredientMatches, ingredientUsage } = matching.mapRecipesToIngredientMatches(
    recipes,
    index,
  );

  const sheetPanMatches = recipeIngredientMatches.get('sheet-pan-dinner');
  assert(sheetPanMatches instanceof Set, 'expected matches to be a set');
  assert(sheetPanMatches.has('veg-sweet-potato'));
  assert(sheetPanMatches.has('oil-olive'));
  assert(!sheetPanMatches.has('oil-peanut'));

  const stirFryMatches = recipeIngredientMatches.get('stir-fry');
  assert(stirFryMatches.has('meat-chicken-breast'));
  assert(stirFryMatches.has('oil-peanut'));
  assert(!stirFryMatches.has('meat-chicken-thigh'));

  assert.strictEqual(ingredientUsage.get('veg-sweet-potato'), true);
  assert.strictEqual(ingredientUsage.get('oil-olive'), true);
  assert.strictEqual(ingredientUsage.get('meat-chicken-breast'), true);
  assert.strictEqual(ingredientUsage.get('oil-peanut'), true);
  assert.strictEqual(ingredientUsage.get('meat-chicken-thigh'), false);
});

(async () => {
  let failures = 0;
  tests.forEach(({ name, fn }) => {
    try {
      fn();
      console.log(`✓ ${name}`);
    } catch (error) {
      failures += 1;
      console.error(`✗ ${name}`);
      console.error(error);
    }
  });
  if (failures) {
    console.error(`\n${failures} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\nAll ${tests.length} tests passed.`);
  }
})();
