const allowedIngredientCategories = new Set([
  'Pasta',
  'Dairy',
  'Dairy Alternative',
  'Meat',
  'Seafood',
  'Herb',
  'Spice',
  'Vegetable',
  'Fruit',
  'Nut/Seed',
  'Grain',
  'Legume',
  'Plant Protein',
  'Oil/Fat',
  'Sweetener',
  'Baking',
  'Baking Alternative',
  'Condiment/Sauce',
  'Beverage',
  'Baked Goods & Doughs',
  'Beverages & Mixers',
  'Cheese',
  'Condiments & Spreads',
  'Dairy & Refrigerated',
  'Dried Fruits',
  'Fermented & Pickled',
  'Grains & Cereals',
  'Herbs & Aromatics',
  'Legumes & Pulses',
  'Meat & Poultry',
  'Mushrooms & Fungi',
  'Nuts & Seeds',
  'Oils & Fats',
  'Pasta & Noodles',
  'Spices & Seasonings',
  'Sweeteners & Baking',
]);

const canonicalAllergens = new Set([
  'dairy',
  'eggs',
  'fish',
  'gluten',
  'nuts',
  'peanuts',
  'sesame',
  'shellfish',
  'soy',
  'tree nuts',
  'wheat',
]);

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isEquipmentRequirement = (requirement, equipmentIndex, equipmentModel) => {
  if (!requirement || typeof requirement !== 'object' || Array.isArray(requirement)) return false;
  const tokens = typeof equipmentModel?.getRequirementTokens === 'function'
    ? equipmentModel.getRequirementTokens(requirement, equipmentIndex)
    : [];
  if (typeof requirement.token === 'string') return tokens.length === 1;
  if (Array.isArray(requirement.anyOf)) return requirement.anyOf.length >= 2 && tokens.length === requirement.anyOf.length;
  return false;
};

const validateData = ({
  ingredients = [],
  recipes = [],
  matching = {},
  equipment = [],
  equipmentModel = {},
} = {}) => {
  const errors = [];
  const warnings = [];
  const fail = (message) => errors.push(message);
  const warn = (message) => warnings.push(message);

  if (!Array.isArray(ingredients) || !ingredients.length) {
    fail('Ingredient dataset did not load.');
  }
  if (!Array.isArray(recipes) || !recipes.length) {
    fail('Recipe dataset did not load.');
  }
  if (typeof matching.createIngredientMatcherIndex !== 'function') {
    fail('Ingredient matching API did not load.');
  }

  const ingredientSlugs = new Set();
  const ingredientNames = new Map();

  (Array.isArray(ingredients) ? ingredients : []).forEach((ingredient, index) => {
    const ref = `ingredient[${index}]`;
    if (!ingredient || typeof ingredient !== 'object') {
      fail(`${ref} must be an object.`);
      return;
    }
    if (typeof ingredient.slug !== 'string' || !slugPattern.test(ingredient.slug)) {
      fail(`${ref} has invalid slug: ${ingredient.slug}`);
    } else if (ingredientSlugs.has(ingredient.slug)) {
      fail(`${ref} duplicates slug ${ingredient.slug}.`);
    } else {
      ingredientSlugs.add(ingredient.slug);
    }
    if (typeof ingredient.name !== 'string' || !ingredient.name.trim()) {
      fail(`${ref} is missing a display name.`);
    } else {
      const key = ingredient.name.trim().toLowerCase();
      if (ingredientNames.has(key)) {
        fail(`${ref} duplicates display name '${ingredient.name}' from ${ingredientNames.get(key)}.`);
      } else {
        ingredientNames.set(key, ref);
      }
    }
    if (!allowedIngredientCategories.has(ingredient.category)) {
      fail(`${ref} uses unsupported category '${ingredient.category}'.`);
    }
    if (!Array.isArray(ingredient.tags)) {
      fail(`${ref} tags must be an array.`);
    }
    if (ingredient.aliases !== undefined && !Array.isArray(ingredient.aliases)) {
      fail(`${ref} aliases must be an array when provided.`);
    }
  });

  const equipmentIndex = typeof equipmentModel?.createIndex === 'function'
    ? equipmentModel.createIndex(equipment)
    : null;
  if (Array.isArray(equipment) && equipment.length && typeof equipmentModel?.validateCatalog === 'function') {
    equipmentModel.validateCatalog(equipment).forEach((message) => fail(message));
  }

  const recipeIds = new Set();
  const recipeNames = new Map();

  (Array.isArray(recipes) ? recipes : []).forEach((recipe, index) => {
    const ref = `recipe[${index}]`;
    if (!recipe || typeof recipe !== 'object') {
      fail(`${ref} must be an object.`);
      return;
    }
    if (typeof recipe.id !== 'string' || !slugPattern.test(recipe.id)) {
      fail(`${ref} has invalid id: ${recipe.id}`);
    } else if (recipeIds.has(recipe.id)) {
      fail(`${ref} duplicates id ${recipe.id}.`);
    } else {
      recipeIds.add(recipe.id);
    }
    if (typeof recipe.name !== 'string' || !recipe.name.trim()) {
      fail(`${ref} is missing a name.`);
    } else {
      const key = recipe.name.trim().toLowerCase();
      if (recipeNames.has(key)) {
        fail(`${ref} duplicates recipe name '${recipe.name}' from ${recipeNames.get(key)}.`);
      } else {
        recipeNames.set(key, ref);
      }
    }
    if (!Number.isFinite(recipe.baseServings) || recipe.baseServings <= 0) {
      fail(`${ref} must define a positive baseServings number.`);
    }
    if (!Array.isArray(recipe.ingredients) || !recipe.ingredients.length) {
      fail(`${ref} must include at least one ingredient.`);
    } else {
      recipe.ingredients.forEach((entry, ingredientIndex) => {
        const entryRef = `${ref}.ingredients[${ingredientIndex}]`;
        if (!entry || typeof entry !== 'object') {
          fail(`${entryRef} must be an object.`);
          return;
        }
        if (typeof entry.item !== 'string' || !entry.item.trim()) {
          fail(`${entryRef} must include a non-empty item.`);
        }
        if (typeof entry.token !== 'string' || !slugPattern.test(entry.token)) {
          fail(`${entryRef} must include a stable lowercase kebab-case token.`);
        } else if (!ingredientSlugs.has(entry.token) && !entry.token.startsWith('recipe-ingredient-')) {
          fail(`${entryRef} references unknown ingredient token '${entry.token}'.`);
        }
        if (entry.quantity !== undefined && entry.quantity !== null && entry.quantity !== '') {
          const quantity = Number(entry.quantity);
          if (!Number.isFinite(quantity) || quantity < 0) {
            fail(`${entryRef} has an invalid quantity '${entry.quantity}'.`);
          }
        }
        if (entry.unit !== undefined && typeof entry.unit !== 'string') {
          fail(`${entryRef} unit must be a string when provided.`);
        }
      });
    }
    if (!Array.isArray(recipe.instructions) || !recipe.instructions.length) {
      fail(`${ref} must include cooking instructions.`);
    }
    if (!Array.isArray(recipe.equipment)) {
      fail(`${ref} equipment must be an array.`);
    } else if (Array.isArray(equipment) && equipment.length) {
      recipe.equipment.forEach((requirement, equipmentIndexNumber) => {
        const equipmentRef = `${ref}.equipment[${equipmentIndexNumber}]`;
        if (!isEquipmentRequirement(requirement, equipmentIndex, equipmentModel)) {
          fail(`${equipmentRef} must reference canonical equipment token(s).`);
        }
      });
    }
    if (!Array.isArray(recipe.tags)) {
      fail(`${ref} tags must be an array.`);
    }
    if (!Array.isArray(recipe.allergens)) {
      fail(`${ref} allergens must be an array.`);
    } else {
      recipe.allergens.forEach((allergen) => {
        const normalized = String(allergen || '').trim().toLowerCase();
        if (!canonicalAllergens.has(normalized)) {
          fail(`${ref} uses non-canonical allergen '${allergen}'.`);
        }
      });
    }
    const nutrition = recipe.nutritionPerServing;
    ['calories', 'protein', 'carbs', 'fat'].forEach((key) => {
      if (!nutrition || !Number.isFinite(Number(nutrition[key])) || Number(nutrition[key]) < 0) {
        fail(`${ref} nutritionPerServing.${key} must be a non-negative number.`);
      }
    });
  });

  if (
    typeof matching.createIngredientMatcherIndex === 'function'
    && typeof matching.mapRecipesToIngredientMatches === 'function'
  ) {
    const index = matching.createIngredientMatcherIndex(ingredients);
    const { recipeIngredientMatches, ingredientUsage } = matching.mapRecipesToIngredientMatches(
      recipes,
      index,
    );
    recipes.forEach((recipe) => {
      const matches = recipeIngredientMatches.get(recipe.id);
      if (!(matches instanceof Set) || matches.size === 0) {
        warn(`Recipe '${recipe.name}' has no canonical ingredient matches.`);
      }
    });
    const unusedIngredients = ingredients.filter(
      (ingredient) => ingredient && !ingredientUsage.get(ingredient.slug),
    );
    if (unusedIngredients.length) {
      warn(
        `${unusedIngredients.length} canonical ingredients are not used by curated recipes before runtime coverage generation.`,
      );
    }
  }

  return { errors, warnings };
};

module.exports = {
  allowedIngredientCategories,
  canonicalAllergens,
  validateData,
};
