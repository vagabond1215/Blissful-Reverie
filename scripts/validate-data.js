#!/usr/bin/env node

const path = require('node:path');
const { validateData } = require('./data-validation.js');

const rootDir = path.resolve(__dirname, '..');
global.window = global;
require(path.join(rootDir, 'data', 'ingredients.js'));
require(path.join(rootDir, 'data', 'recipes.js'));
require(path.join(rootDir, 'scripts', 'ingredient-matching.js'));

const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
const recipes = Array.isArray(global.BLISSFUL_RECIPES) ? global.BLISSFUL_RECIPES : [];
const matching = global.BlissfulMatching || {};
const { errors, warnings } = validateData({ ingredients, recipes, matching });

if (warnings.length) {
  console.warn(`Data validation warnings (${warnings.length}):`);
  warnings.slice(0, 40).forEach((message) => console.warn(`- ${message}`));
  if (warnings.length > 40) {
    console.warn(`- ...${warnings.length - 40} more warnings`);
  }
}

if (errors.length) {
  console.error(`Data validation failed with ${errors.length} error(s):`);
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`Validated ${ingredients.length} ingredients and ${recipes.length} curated recipes.`);
