;(function (global) {
  const units = global.BlissfulInventoryUnits
    || (typeof require === 'function' ? require('./inventory-units-core.js') : {});

  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const clean = (value) => String(value || '').trim();
  const finitePositive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

  const add = (target, message) => {
    if (message && !target.includes(message)) target.push(message);
  };

  const isStockUnit = (value) => {
    const unit = typeof units.getUnit === 'function' ? units.getUnit(value) : null;
    return Boolean(unit && unit.group !== 'package');
  };

  const isPurchaseUnit = (value) => {
    const unit = typeof units.getUnit === 'function' ? units.getUnit(value) : null;
    return Boolean(unit && (unit.group === 'package' || unit.id === 'each'));
  };

  const validateAliases = (ingredient, errors) => {
    if (ingredient.aliases === undefined) return;
    if (!Array.isArray(ingredient.aliases)) {
      add(errors, 'aliases must be an array when provided.');
      return;
    }
    const seen = new Set();
    const canonicalName = clean(ingredient.name).toLowerCase();
    ingredient.aliases.forEach((alias, index) => {
      if (typeof alias !== 'string' || !alias.trim()) {
        add(errors, `alias ${index + 1} must be a non-empty string.`);
        return;
      }
      const normalized = alias.trim().toLowerCase();
      if (normalized === canonicalName) add(errors, `alias '${alias}' duplicates the display name.`);
      if (seen.has(normalized)) add(errors, `alias '${alias}' is duplicated.`);
      seen.add(normalized);
    });
  };

  const validateInventoryProfile = (profile, errors, prefix = 'inventory profile') => {
    if (!isRecord(profile)) {
      add(errors, `${prefix} must be an object.`);
      return;
    }
    if (!isStockUnit(profile.stockUnit)) add(errors, `${prefix} stockUnit must be a recognized non-package unit.`);
    if (profile.purchaseUnit && !isPurchaseUnit(profile.purchaseUnit)) {
      add(errors, `${prefix} purchaseUnit must be a recognized purchase/package unit.`);
    }
    if (profile.purchaseUnit && !finitePositive(profile.unitsPerPurchase)) {
      add(errors, `${prefix} unitsPerPurchase must be positive when purchaseUnit is configured.`);
    }
  };

  const validateCuratedIngredient = (ingredient, {
    existingIngredients = [],
    inventoryProfiles = units.DEFAULT_PROFILES || {},
    allowedCategories = null,
  } = {}) => {
    const errors = [];
    const warnings = [];
    if (!isRecord(ingredient)) return { errors: ['ingredient must be an object.'], warnings };

    const slug = clean(ingredient.slug);
    const name = clean(ingredient.name);
    if (!slugPattern.test(slug)) add(errors, 'slug must be lowercase kebab-case.');
    if (!name) add(errors, 'display name is required.');
    if (!clean(ingredient.category)) add(errors, 'category is required.');
    if (allowedCategories instanceof Set && !allowedCategories.has(ingredient.category)) {
      add(errors, `category '${ingredient.category}' is not canonical.`);
    }
    if (!Array.isArray(ingredient.tags)) add(errors, 'tags must be an array.');
    validateAliases(ingredient, errors);

    const slugCollision = existingIngredients.find((item) => item && item !== ingredient && clean(item.slug) === slug);
    if (slug && slugCollision) add(errors, `slug '${slug}' already exists.`);
    const nameCollision = existingIngredients.find((item) => (
      item && item !== ingredient && clean(item.name).toLowerCase() === name.toLowerCase()
    ));
    if (name && nameCollision) add(errors, `display name '${name}' already exists.`);

    if (ingredient.packageUnit !== undefined && !isPurchaseUnit(ingredient.packageUnit)) {
      add(errors, `packageUnit '${ingredient.packageUnit}' must be a recognized purchase/package unit.`);
    }

    const profile = isRecord(inventoryProfiles) ? inventoryProfiles[slug] : null;
    if (profile) validateInventoryProfile(profile, errors, `inventory profile for ${slug}`);

    return { errors, warnings };
  };

  const matchRecipeEntry = (entry, ingredients, matching) => {
    if (typeof units.mapRecipeEntryToSlug === 'function') {
      return units.mapRecipeEntryToSlug(entry, ingredients, matching);
    }
    return '';
  };

  const validateCuratedRecipe = (recipe, {
    ingredients = [],
    existingRecipes = [],
    matching = global.BlissfulMatching || {},
  } = {}) => {
    const errors = [];
    const warnings = [];
    if (!isRecord(recipe)) return { errors: ['recipe must be an object.'], warnings };

    const id = clean(recipe.id);
    const name = clean(recipe.name);
    if (!slugPattern.test(id)) add(errors, 'id must be lowercase kebab-case.');
    if (!name) add(errors, 'recipe name is required.');
    if (!finitePositive(recipe.baseServings)) add(errors, 'baseServings must be positive.');
    if (!Array.isArray(recipe.ingredients) || !recipe.ingredients.length) add(errors, 'at least one ingredient is required.');
    if (!Array.isArray(recipe.instructions) || !recipe.instructions.length) add(errors, 'at least one instruction is required.');
    if (!Array.isArray(recipe.equipment)) add(errors, 'equipment must be an array.');
    if (!Array.isArray(recipe.tags)) add(errors, 'tags must be an array.');
    if (!Array.isArray(recipe.allergens)) add(errors, 'allergens must be an array.');

    const idCollision = existingRecipes.find((item) => item && item !== recipe && clean(item.id) === id);
    if (id && idCollision) add(errors, `id '${id}' already exists.`);
    const nameCollision = existingRecipes.find((item) => (
      item && item !== recipe && clean(item.name).toLowerCase() === name.toLowerCase()
    ));
    if (name && nameCollision) add(errors, `recipe name '${name}' already exists.`);

    (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).forEach((entry, index) => {
      const ref = `ingredient ${index + 1}`;
      if (!isRecord(entry)) {
        add(errors, `${ref} must be an object.`);
        return;
      }
      if (!clean(entry.item)) add(errors, `${ref} must include an item name.`);

      const hasQuantity = entry.quantity !== undefined && entry.quantity !== null && entry.quantity !== '';
      if (hasQuantity) {
        const quantity = Number(entry.quantity);
        if (!Number.isFinite(quantity) || quantity < 0) add(errors, `${ref} quantity must be non-negative.`);
        const rawUnit = clean(entry.unit);
        if (rawUnit && Number.isFinite(quantity) && quantity > 0 && typeof units.normalizeRecipeUnit === 'function') {
          const normalized = units.normalizeRecipeUnit(rawUnit, quantity);
          if (!normalized.unit) add(errors, `${ref} unit '${entry.unit}' is not recognized by the inventory unit parser.`);
        }
      }
      if (entry.unit !== undefined && typeof entry.unit !== 'string') add(errors, `${ref} unit must be a string when provided.`);

      if (clean(entry.item) && Array.isArray(ingredients) && ingredients.length) {
        const slug = matchRecipeEntry(entry, ingredients, matching);
        if (!slug) add(errors, `${ref} '${entry.item}' does not resolve to a canonical ingredient.`);
      }
    });

    return { errors, warnings };
  };

  const validateCustomIngredient = (ingredient) => {
    const errors = [];
    const warnings = [];
    if (!isRecord(ingredient)) return { errors: ['custom ingredient must be an object.'], warnings };

    if (!clean(ingredient.id)) add(errors, 'custom ingredient id is required.');
    if (!clean(ingredient.name)) add(errors, 'custom ingredient name is required.');

    const trackingEnabled = Boolean(
      ingredient.trackQuantity
      || ingredient.quantityTracking
      || clean(ingredient.stockUnit)
      || ingredient.packagePurchasing
      || clean(ingredient.purchaseUnit),
    );
    if (trackingEnabled && !isStockUnit(ingredient.stockUnit)) {
      add(errors, 'custom ingredient stockUnit must be a recognized non-package unit when quantity tracking is enabled.');
    }

    const packageEnabled = Boolean(ingredient.packagePurchasing || clean(ingredient.purchaseUnit));
    if (packageEnabled) {
      if (!isPurchaseUnit(ingredient.purchaseUnit)) {
        add(errors, 'custom ingredient purchaseUnit must be a recognized purchase/package unit when package purchasing is enabled.');
      }
      if (!finitePositive(ingredient.unitsPerPurchase)) {
        add(errors, 'custom ingredient unitsPerPurchase must be positive when package purchasing is enabled.');
      }
    }

    if (ingredient.tags !== undefined && !Array.isArray(ingredient.tags)) {
      add(errors, 'custom ingredient tags must be an array when provided.');
    }

    return { errors, warnings };
  };

  const api = {
    validateCuratedIngredient,
    validateCuratedRecipe,
    validateCustomIngredient,
    validateInventoryProfile,
    isStockUnit,
    isPurchaseUnit,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulCatalogAdmission = Object.assign({}, global.BlissfulCatalogAdmission || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
