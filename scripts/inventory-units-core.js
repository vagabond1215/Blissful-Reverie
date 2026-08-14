;(function (global) {
  const PROFILE_STORAGE_KEY = 'blissful-inventory-unit-profiles';

  const DEFINITIONS = [
    // Count / discrete stock units.
    { id: 'each', label: 'each', group: 'count', dimension: 'count', toBase: 1, aliases: ['ea', 'count', 'ct', 'unit', 'units'] },
    { id: 'piece', label: 'piece', group: 'count', dimension: 'count', toBase: 1, aliases: ['pieces', 'pc', 'pcs'] },
    { id: 'dozen', label: 'dozen', group: 'count', dimension: 'count', toBase: 12, aliases: ['doz'] },
    { id: 'stick', label: 'stick', group: 'count', dimension: 'ingredient-count', aliases: ['sticks'] },
    { id: 'slice', label: 'slice', group: 'count', dimension: 'ingredient-count', aliases: ['slices'] },
    { id: 'clove', label: 'clove', group: 'count', dimension: 'ingredient-count', aliases: ['cloves'] },

    // Volume. Base unit is milliliter.
    { id: 'tsp', label: 'tsp', group: 'volume', dimension: 'volume', toBase: 4.92892159375, aliases: ['teaspoon', 'teaspoons'] },
    { id: 'tbsp', label: 'tbsp', group: 'volume', dimension: 'volume', toBase: 14.78676478125, aliases: ['tablespoon', 'tablespoons'] },
    { id: 'fl oz', label: 'fl oz', group: 'volume', dimension: 'volume', toBase: 29.5735295625, aliases: ['fluid ounce', 'fluid ounces', 'floz'] },
    { id: 'cup', label: 'cup', group: 'volume', dimension: 'volume', toBase: 236.5882365, aliases: ['cups'] },
    { id: 'pint', label: 'pint', group: 'volume', dimension: 'volume', toBase: 473.176473, aliases: ['pints', 'pt'] },
    { id: 'quart', label: 'quart', group: 'volume', dimension: 'volume', toBase: 946.352946, aliases: ['quarts', 'qt'] },
    { id: 'gallon', label: 'gallon', group: 'volume', dimension: 'volume', toBase: 3785.411784, aliases: ['gallons', 'gal'] },
    { id: 'ml', label: 'mL', group: 'volume', dimension: 'volume', toBase: 1, aliases: ['milliliter', 'milliliters', 'millilitre', 'millilitres'] },
    { id: 'liter', label: 'liter', group: 'volume', dimension: 'volume', toBase: 1000, aliases: ['liters', 'litre', 'litres', 'l'] },

    // Mass. Base unit is gram.
    { id: 'gram', label: 'gram', group: 'mass', dimension: 'mass', toBase: 1, aliases: ['grams', 'g'] },
    { id: 'kilogram', label: 'kilogram', group: 'mass', dimension: 'mass', toBase: 1000, aliases: ['kilograms', 'kg'] },
    { id: 'oz', label: 'oz', group: 'mass', dimension: 'mass', toBase: 28.349523125, aliases: ['ounce', 'ounces'] },
    { id: 'pound', label: 'pound', group: 'mass', dimension: 'mass', toBase: 453.59237, aliases: ['pounds', 'lb', 'lbs'] },

    // Purchase/package forms. These need an ingredient profile to convert to stock.
    { id: 'pack', label: 'pack', group: 'package', dimension: 'package', aliases: ['packs', 'package', 'packages'] },
    { id: 'bag', label: 'bag', group: 'package', dimension: 'package', aliases: ['bags'] },
    { id: 'box', label: 'box', group: 'package', dimension: 'package', aliases: ['boxes'] },
    { id: 'case', label: 'case', group: 'package', dimension: 'package', aliases: ['cases'] },
    { id: 'carton', label: 'carton', group: 'package', dimension: 'package', aliases: ['cartons'] },
    { id: 'tub', label: 'tub', group: 'package', dimension: 'package', aliases: ['tubs'] },
    { id: 'bunch', label: 'bunch', group: 'package', dimension: 'package', aliases: ['bunches'] },
    { id: 'tray', label: 'tray', group: 'package', dimension: 'package', aliases: ['trays'] },
    { id: 'jar', label: 'jar', group: 'package', dimension: 'package', aliases: ['jars'] },
    { id: 'can', label: 'can', group: 'package', dimension: 'package', aliases: ['cans'] },
    { id: 'bottle', label: 'bottle', group: 'package', dimension: 'package', aliases: ['bottles'] },
    { id: 'pouch', label: 'pouch', group: 'package', dimension: 'package', aliases: ['pouches'] },
    { id: 'loaf', label: 'loaf', group: 'package', dimension: 'package', aliases: ['loaves'] },
    { id: 'jug', label: 'jug', group: 'package', dimension: 'package', aliases: ['jugs'] },
    { id: 'canister', label: 'canister', group: 'package', dimension: 'package', aliases: ['canisters'] },
    { id: 'clamshell', label: 'clamshell', group: 'package', dimension: 'package', aliases: ['clamshells'] },
  ];

  const UNIT_REGISTRY = Object.freeze(DEFINITIONS.map((entry) => Object.freeze({ ...entry })));
  const BY_ID = new Map(UNIT_REGISTRY.map((entry) => [entry.id, entry]));
  const ALIASES = new Map();
  UNIT_REGISTRY.forEach((entry) => {
    ALIASES.set(entry.id.toLowerCase(), entry.id);
    (entry.aliases || []).forEach((alias) => ALIASES.set(String(alias).toLowerCase(), entry.id));
  });

  const BUTTER_EQUIVALENTS = Object.freeze({
    stick: 1,
    tbsp: 1 / 8,
    tsp: 1 / 24,
    cup: 2,
    'fl oz': 1 / 4,
    oz: 1 / 4,
    pound: 4,
    gram: 1 / 113.3980925,
    kilogram: 1000 / 113.3980925,
  });

  const DEFAULT_PROFILES = Object.freeze({
    'dairy-butter-unsalted': Object.freeze({
      stockUnit: 'stick',
      purchaseUnit: 'box',
      unitsPerPurchase: 4,
      equivalentsToStock: BUTTER_EQUIVALENTS,
    }),
    'dairy-butter-salted': Object.freeze({
      stockUnit: 'stick',
      purchaseUnit: 'box',
      unitsPerPurchase: 4,
      equivalentsToStock: BUTTER_EQUIVALENTS,
    }),
    'dairy-buttermilk': Object.freeze({
      stockUnit: 'cup',
      purchaseUnit: 'carton',
      unitsPerPurchase: 4,
    }),
  });

  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const finitePositive = (value, fallback = null) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  };
  const round = (value, precision = 6) => {
    const factor = 10 ** precision;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
  };

  const normalizeUnit = (value) => {
    const text = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!text) return '';
    return ALIASES.get(text) || '';
  };

  const getUnit = (value) => BY_ID.get(normalizeUnit(value)) || null;
  const isValidUnit = (value) => Boolean(getUnit(value));
  const getUnitGroups = () => ({
    count: UNIT_REGISTRY.filter((entry) => entry.group === 'count'),
    volume: UNIT_REGISTRY.filter((entry) => entry.group === 'volume'),
    mass: UNIT_REGISTRY.filter((entry) => entry.group === 'mass'),
    package: UNIT_REGISTRY.filter((entry) => entry.group === 'package'),
  });

  const convertUniversal = (quantity, fromUnit, toUnit) => {
    const quantityNumber = Number(quantity);
    const from = getUnit(fromUnit);
    const to = getUnit(toUnit);
    if (!Number.isFinite(quantityNumber) || !from || !to) return null;
    if (from.id === to.id) return quantityNumber;
    if (!from.toBase || !to.toBase || from.dimension !== to.dimension) return null;
    return quantityNumber * from.toBase / to.toBase;
  };

  const normalizeEquivalents = (value) => {
    if (!isRecord(value)) return {};
    const result = {};
    Object.entries(value).forEach(([unit, factor]) => {
      const normalized = normalizeUnit(unit);
      const numeric = finitePositive(factor);
      if (normalized && numeric) result[normalized] = numeric;
    });
    return result;
  };

  const normalizeProfile = (value, fallback = null) => {
    const base = isRecord(fallback) ? fallback : {};
    const source = isRecord(value) ? value : {};
    const stockUnit = normalizeUnit(source.stockUnit) || normalizeUnit(base.stockUnit) || 'each';
    const purchaseUnit = normalizeUnit(source.purchaseUnit) || normalizeUnit(base.purchaseUnit) || '';
    const unitsPerPurchase = finitePositive(source.unitsPerPurchase, finitePositive(base.unitsPerPurchase, 1));
    return {
      stockUnit,
      purchaseUnit,
      unitsPerPurchase,
      equivalentsToStock: {
        ...normalizeEquivalents(base.equivalentsToStock),
        ...normalizeEquivalents(source.equivalentsToStock),
      },
    };
  };

  const normalizeProfiles = (value) => {
    if (!isRecord(value)) return {};
    const result = {};
    Object.entries(value).forEach(([slug, profile]) => {
      if (!slug || !isRecord(profile)) return;
      result[slug] = normalizeProfile(profile, DEFAULT_PROFILES[slug]);
    });
    return result;
  };

  const resolveProfile = (slug, customProfiles = {}) => {
    const key = String(slug || '').trim();
    return normalizeProfile(isRecord(customProfiles) ? customProfiles[key] : null, DEFAULT_PROFILES[key]);
  };

  const toStockQuantity = (quantity, unit, profile) => {
    const amount = Number(quantity);
    const normalizedUnit = normalizeUnit(unit);
    if (!Number.isFinite(amount) || !normalizedUnit) return null;
    const normalizedProfile = normalizeProfile(profile);
    const stockUnit = normalizedProfile.stockUnit;
    if (normalizedUnit === stockUnit) return amount;
    if (normalizedProfile.purchaseUnit && normalizedUnit === normalizedProfile.purchaseUnit) {
      return amount * normalizedProfile.unitsPerPurchase;
    }
    const factor = normalizedProfile.equivalentsToStock[normalizedUnit];
    if (finitePositive(factor)) return amount * factor;
    return convertUniversal(amount, normalizedUnit, stockUnit);
  };

  const fromStockQuantity = (stockQuantity, unit, profile) => {
    const amount = Number(stockQuantity);
    const normalizedUnit = normalizeUnit(unit);
    if (!Number.isFinite(amount) || !normalizedUnit) return null;
    const normalizedProfile = normalizeProfile(profile);
    const stockUnit = normalizedProfile.stockUnit;
    if (normalizedUnit === stockUnit) return amount;
    if (normalizedProfile.purchaseUnit && normalizedUnit === normalizedProfile.purchaseUnit) {
      return amount / normalizedProfile.unitsPerPurchase;
    }
    const factor = normalizedProfile.equivalentsToStock[normalizedUnit];
    if (finitePositive(factor)) return amount / factor;
    return convertUniversal(amount, stockUnit, normalizedUnit);
  };

  const convertQuantity = (quantity, fromUnit, toUnit, profile = null) => {
    const direct = convertUniversal(quantity, fromUnit, toUnit);
    if (direct !== null) return direct;
    const normalizedProfile = normalizeProfile(profile);
    const stock = toStockQuantity(quantity, fromUnit, normalizedProfile);
    if (stock === null) return null;
    return fromStockQuantity(stock, toUnit, normalizedProfile);
  };

  const inferLegacyStockUnit = (entry, profile) => {
    const entryUnit = normalizeUnit(entry?.unit);
    if (entryUnit) return entryUnit;
    return normalizeProfile(profile).stockUnit;
  };

  const normalizeInventoryEntry = (entry, profile) => {
    if (!isRecord(entry)) return null;
    const quantity = Number(entry.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) return null;
    const normalizedProfile = normalizeProfile(profile);
    const unit = normalizeUnit(entry.unit) || normalizedProfile.stockUnit;
    const stockQuantity = toStockQuantity(quantity, unit, normalizedProfile);
    if (stockQuantity === null) return { quantity, unit, convertible: false };
    return { quantity: round(stockQuantity), unit: normalizedProfile.stockUnit, convertible: true };
  };

  const copyInventory = (inventory) => {
    const source = isRecord(inventory) ? inventory : {};
    const result = {};
    Object.entries(source).forEach(([slug, entry]) => {
      if (isRecord(entry)) result[slug] = { ...entry };
    });
    return result;
  };

  const applyInventoryDelta = ({ inventory, slug, quantity, unit, direction = 'add', profile = null } = {}) => {
    const key = String(slug || '').trim();
    const amount = Number(quantity);
    if (!key || !Number.isFinite(amount) || amount < 0) {
      return { ok: false, reason: 'invalid-quantity', inventory: copyInventory(inventory) };
    }
    const nextInventory = copyInventory(inventory);
    const existing = isRecord(nextInventory[key]) ? nextInventory[key] : null;
    const inferredStockUnit = normalizeUnit(profile?.stockUnit) || normalizeUnit(existing?.unit) || normalizeUnit(unit) || 'each';
    const normalizedProfile = normalizeProfile({ ...(isRecord(profile) ? profile : {}), stockUnit: inferredStockUnit });
    let beforeStock = 0;
    if (existing) {
      const normalizedExisting = normalizeInventoryEntry(existing, normalizedProfile);
      if (!normalizedExisting || !normalizedExisting.convertible) {
        return { ok: false, reason: 'incompatible-existing-unit', inventory: nextInventory, slug: key };
      }
      beforeStock = normalizedExisting.quantity;
    }
    const deltaStock = toStockQuantity(amount, unit || normalizedProfile.stockUnit, normalizedProfile);
    if (deltaStock === null) {
      return { ok: false, reason: 'incompatible-unit', inventory: nextInventory, slug: key };
    }
    const sign = direction === 'consume' || direction === 'subtract' ? -1 : 1;
    const afterStock = round(beforeStock + sign * deltaStock);
    if (afterStock < -1e-6) {
      return {
        ok: false,
        reason: 'insufficient-stock',
        inventory: nextInventory,
        slug: key,
        available: beforeStock,
        requested: deltaStock,
        stockUnit: normalizedProfile.stockUnit,
      };
    }
    if (afterStock <= 1e-6) delete nextInventory[key];
    else nextInventory[key] = { quantity: afterStock, unit: normalizedProfile.stockUnit };
    return {
      ok: true,
      inventory: nextInventory,
      slug: key,
      before: round(beforeStock),
      after: Math.max(0, afterStock),
      delta: round(deltaStock),
      stockUnit: normalizedProfile.stockUnit,
    };
  };

  const addPurchase = ({ inventory, slug, purchaseQuantity = 1, profile = null } = {}) => {
    const normalizedProfile = normalizeProfile(profile);
    if (!normalizedProfile.purchaseUnit) {
      return { ok: false, reason: 'missing-purchase-unit', inventory: copyInventory(inventory), slug };
    }
    return applyInventoryDelta({
      inventory,
      slug,
      quantity: purchaseQuantity,
      unit: normalizedProfile.purchaseUnit,
      direction: 'add',
      profile: normalizedProfile,
    });
  };

  const consumeIngredient = ({ inventory, slug, quantity, unit, profile = null } = {}) => applyInventoryDelta({
    inventory,
    slug,
    quantity,
    unit,
    direction: 'consume',
    profile,
  });

  const normalizeRecipeUnit = (unit, quantity = 1) => {
    const raw = String(unit || '').trim().toLowerCase();
    if (!raw) return { quantity: Number(quantity), unit: 'each' };
    const direct = normalizeUnit(raw);
    if (direct) return { quantity: Number(quantity), unit: direct };
    if (['small', 'medium', 'large', 'whole', 'item', 'items', 'pepper', 'peppers', 'potato', 'potatoes', 'avocado', 'avocados', 'cucumber', 'cucumbers', 'shallot', 'shallots', 'jalapeño', 'jalapeno'].includes(raw)) {
      return { quantity: Number(quantity), unit: 'each' };
    }
    const packagePrefix = raw.match(/^(cans?|jars?|bottles?|boxes?|bags?|packs?|cartons?|pouches?)\b/i);
    if (packagePrefix) return { quantity: Number(quantity), unit: normalizeUnit(packagePrefix[1]) };
    const eachWeight = raw.match(/\((\d+(?:\.\d+)?)\s*(ounces?|oz|grams?|g)\s+each\)/i);
    if (eachWeight) {
      const parsedUnit = normalizeUnit(eachWeight[2]);
      return { quantity: Number(quantity) * Number(eachWeight[1]), unit: parsedUnit || '' };
    }
    return { quantity: Number(quantity), unit: '' };
  };

  const mapRecipeEntryToSlug = (entry, ingredients, matching) => {
    if (!entry || typeof matching?.createIngredientMatcherIndex !== 'function' || typeof matching?.mapRecipesToIngredientMatches !== 'function') return '';
    const index = matching.createIngredientMatcherIndex(Array.isArray(ingredients) ? ingredients : []);
    const synthetic = [{ id: '__inventory-entry__', ingredients: [entry] }];
    const result = matching.mapRecipesToIngredientMatches(synthetic, index);
    const matches = result?.recipeIngredientMatches?.get?.('__inventory-entry__');
    if (!matches || typeof matches.values !== 'function') return '';
    const values = Array.from(matches.values());
    return values.length === 1 ? values[0] : (values[0] || '');
  };

  const consumeRecipe = ({ inventory, recipe, ingredients, matching, profiles = {}, servingScale = 1 } = {}) => {
    if (!recipe || !Array.isArray(recipe.ingredients)) return { ok: false, reason: 'invalid-recipe', inventory: copyInventory(inventory) };
    let working = copyInventory(inventory);
    const changes = [];
    const skipped = [];
    const scale = finitePositive(servingScale, 1);
    for (const entry of recipe.ingredients) {
      const slug = mapRecipeEntryToSlug(entry, ingredients, matching);
      if (!slug) {
        skipped.push({ entry, reason: 'unmatched' });
        continue;
      }
      if (!isRecord(working[slug])) {
        skipped.push({ entry, slug, reason: 'untracked' });
        continue;
      }
      const request = normalizeRecipeUnit(entry.unit, Number(entry.quantity) * scale);
      if (!request.unit || !Number.isFinite(request.quantity)) {
        skipped.push({ entry, slug, reason: 'unsupported-unit' });
        continue;
      }
      const hasDefinedProfile = Boolean(DEFAULT_PROFILES[slug] || (isRecord(profiles) && isRecord(profiles[slug])));
      const profile = hasDefinedProfile
        ? resolveProfile(slug, profiles)
        : normalizeProfile({ stockUnit: normalizeUnit(working[slug]?.unit) || request.unit });
      const result = consumeIngredient({ inventory: working, slug, quantity: request.quantity, unit: request.unit, profile });
      if (!result.ok) {
        return { ok: false, reason: result.reason, inventory: copyInventory(inventory), failed: { entry, slug, result }, changes: [], skipped };
      }
      working = result.inventory;
      changes.push({ slug, before: result.before, after: result.after, amount: result.delta, unit: result.stockUnit, entry });
    }
    return { ok: true, inventory: working, changes, skipped };
  };

  const validateProcess = (process, ingredientSlugs = null) => {
    const errors = [];
    if (!process || typeof process !== 'object') return ['Process must be an object.'];
    if (!String(process.id || '').trim()) errors.push('Process is missing id.');
    if (!process.output || !String(process.output.slug || '').trim()) errors.push(`${process.id || 'Process'} is missing output slug.`);
    if (!finitePositive(process.output?.quantity)) errors.push(`${process.id || 'Process'} output quantity must be positive.`);
    if (!normalizeUnit(process.output?.unit)) errors.push(`${process.id || 'Process'} output unit is invalid.`);
    if (!Array.isArray(process.inputs) || !process.inputs.length) errors.push(`${process.id || 'Process'} requires at least one input.`);
    const outputSlug = String(process.output?.slug || '').trim();
    (Array.isArray(process.inputs) ? process.inputs : []).forEach((input, index) => {
      const slug = String(input?.slug || '').trim();
      if (!slug) errors.push(`${process.id || 'Process'} input ${index + 1} is missing slug.`);
      if (!finitePositive(input?.quantity)) errors.push(`${process.id || 'Process'} input ${index + 1} quantity must be positive.`);
      if (!normalizeUnit(input?.unit)) errors.push(`${process.id || 'Process'} input ${index + 1} unit is invalid.`);
      if (slug && slug === outputSlug) errors.push(`${process.id || 'Process'} directly cycles ${slug}.`);
      if (ingredientSlugs instanceof Set && slug && !ingredientSlugs.has(slug)) errors.push(`${process.id || 'Process'} references missing input ${slug}.`);
    });
    if (ingredientSlugs instanceof Set && outputSlug && !ingredientSlugs.has(outputSlug)) errors.push(`${process.id || 'Process'} references missing output ${outputSlug}.`);
    return errors;
  };

  const executeProcess = ({ inventory, process, profiles = {} } = {}) => {
    const validationErrors = validateProcess(process);
    if (validationErrors.length) return { ok: false, reason: 'invalid-process', errors: validationErrors, inventory: copyInventory(inventory) };
    let working = copyInventory(inventory);
    const consumed = [];
    for (const input of process.inputs) {
      const hasDefinedProfile = Boolean(DEFAULT_PROFILES[input.slug] || (isRecord(profiles) && isRecord(profiles[input.slug])));
      const profile = hasDefinedProfile
        ? resolveProfile(input.slug, profiles)
        : normalizeProfile({ stockUnit: normalizeUnit(working[input.slug]?.unit) || input.unit });
      const result = consumeIngredient({ inventory: working, slug: input.slug, quantity: input.quantity, unit: input.unit, profile });
      if (!result.ok) {
        return { ok: false, reason: result.reason, failed: input, details: result, inventory: copyInventory(inventory), consumed: [] };
      }
      working = result.inventory;
      consumed.push({ slug: input.slug, before: result.before, after: result.after, amount: result.delta, unit: result.stockUnit });
    }
    const hasOutputProfile = Boolean(DEFAULT_PROFILES[process.output.slug] || (isRecord(profiles) && isRecord(profiles[process.output.slug])));
    const outputProfile = hasOutputProfile
      ? resolveProfile(process.output.slug, profiles)
      : normalizeProfile({ stockUnit: normalizeUnit(working[process.output.slug]?.unit) || process.output.unit });
    const produced = applyInventoryDelta({
      inventory: working,
      slug: process.output.slug,
      quantity: process.output.quantity,
      unit: process.output.unit,
      direction: 'add',
      profile: outputProfile,
    });
    if (!produced.ok) return { ok: false, reason: produced.reason, inventory: copyInventory(inventory), consumed: [] };
    return {
      ok: true,
      inventory: produced.inventory,
      consumed,
      produced: { slug: process.output.slug, before: produced.before, after: produced.after, amount: produced.delta, unit: produced.stockUnit },
    };
  };

  const getSelectableUnits = (profile = null) => {
    const normalizedProfile = normalizeProfile(profile);
    const specific = new Set([normalizedProfile.stockUnit, normalizedProfile.purchaseUnit]);
    Object.keys(normalizedProfile.equivalentsToStock).forEach((unit) => specific.add(unit));
    const stockDefinition = getUnit(normalizedProfile.stockUnit);
    if (stockDefinition?.toBase) {
      UNIT_REGISTRY.forEach((unit) => {
        if (unit.toBase && unit.dimension === stockDefinition.dimension) specific.add(unit.id);
      });
    }
    return UNIT_REGISTRY.filter((unit) => specific.has(unit.id));
  };

  const api = {
    PROFILE_STORAGE_KEY,
    UNIT_REGISTRY,
    DEFAULT_PROFILES,
    normalizeUnit,
    getUnit,
    isValidUnit,
    getUnitGroups,
    convertUniversal,
    normalizeProfile,
    normalizeProfiles,
    resolveProfile,
    toStockQuantity,
    fromStockQuantity,
    convertQuantity,
    inferLegacyStockUnit,
    normalizeInventoryEntry,
    applyInventoryDelta,
    addPurchase,
    consumeIngredient,
    normalizeRecipeUnit,
    mapRecipeEntryToSlug,
    consumeRecipe,
    validateProcess,
    executeProcess,
    getSelectableUnits,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulInventoryUnits = Object.assign({}, global.BlissfulInventoryUnits || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
