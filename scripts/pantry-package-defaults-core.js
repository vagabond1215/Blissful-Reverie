;(function (global) {
  const UNIT_PREFERENCE_STORAGE_KEY = 'blissful-pantry-unit-preferences';
  const PACKAGE_UNITS = Object.freeze([
    'each', 'pack', 'bag', 'box', 'case', 'carton', 'tub', 'bunch', 'tray',
    'jar', 'can', 'bottle', 'pouch', 'loaf', 'jug', 'canister', 'clamshell',
  ]);
  const clean = (value) => String(value || '').trim();
  const lower = (value) => clean(value).toLowerCase();
  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const hasAny = (value, terms) => terms.some((term) => value.includes(term));

  const normalizePreferenceMap = (value) => {
    if (!isRecord(value)) return {};
    const result = {};
    Object.entries(value).forEach(([slug, unit]) => {
      const key = clean(slug);
      const normalized = clean(unit);
      if (key && normalized) result[key] = normalized;
    });
    return result;
  };

  const getDefaultPackageUnit = (ingredient) => {
    const name = lower(ingredient?.name);
    const slug = lower(ingredient?.slug);
    const category = lower(ingredient?.category);
    const text = `${name} ${slug} ${category}`;
    if (!name && !slug && !category) return 'each';

    if (hasAny(text, ['canned ', 'canned-'])) return 'can';
    if (hasAny(text, ['frozen ', 'frozen-'])) return hasAny(name, ['pizza', 'waffle', 'pancake', 'meal', 'lasagna']) ? 'box' : 'bag';
    if (name.includes('egg') && !hasAny(name, ['egg noodles', 'eggplant'])) return 'carton';
    if (name.includes('butter') && !hasAny(name, ['peanut butter', 'almond butter', 'cashew butter', 'sunflower butter'])) return name.includes('spread') ? 'tub' : 'box';
    if (name.includes('milk')) return category === 'dairy alternative' || hasAny(name, ['almond', 'oat', 'soy', 'pea', 'coconut']) ? 'carton' : 'jug';
    if (hasAny(name, ['heavy cream', 'half-and-half', 'half and half', 'buttermilk'])) return 'carton';
    if (hasAny(name, ['yogurt', 'sour cream', 'cottage cheese', 'ricotta'])) return 'tub';
    if (name.includes('cream cheese')) return 'pack';
    if (hasAny(name, ['ghee', 'coconut oil', 'shortening'])) return 'jar';
    if (hasAny(name, ['cheese shreds', 'shredded cheese'])) return 'bag';
    if (category === 'cheese' || category === 'dairy' || hasAny(name, ['cheddar', 'mozzarella', 'parmesan', 'feta cheese', 'monterey jack', 'queso fresco'])) return 'pack';

    if (category === 'pasta') return name.includes('ramen') ? 'pack' : 'box';
    if (category === 'meat' || hasAny(category, ['meat', 'poultry'])) {
      if (hasAny(name, ['whole chicken', 'whole turkey'])) return 'each';
      return name.includes('ground ') ? 'tray' : 'pack';
    }
    if (category === 'seafood') {
      if (hasAny(name, ['lobster', 'whole fish'])) return 'each';
      return hasAny(name, ['mussels', 'clams']) ? 'bag' : 'pack';
    }
    if (category === 'herb' || hasAny(category, ['herbs & aromatics', 'fresh herbs'])) return hasAny(name, ['garlic', 'ginger', 'shallot']) ? 'each' : 'bunch';
    if (category === 'spice' || hasAny(category, ['spice', 'seasoning'])) return 'jar';

    if (hasAny(name, ['cilantro', 'parsley', 'basil', 'dill', 'mint', 'green onion', 'scallion', 'asparagus', 'celery'])) return 'bunch';
    if (hasAny(name, ['baby spinach', 'salad greens', 'spring mix', 'arugula'])) return 'bag';
    if (hasAny(name, ['strawberries', 'blueberries', 'raspberries', 'blackberries'])) return 'clamshell';
    if (hasAny(name, ['grapes', 'cherries'])) return 'bag';

    if (category === 'grain' || hasAny(category, ['grain', 'cereal'])) return hasAny(name, ['cereal', 'oats', 'oatmeal']) ? 'box' : 'bag';
    if (category === 'legume') return hasAny(name, ['lentil', 'split pea', 'dry ', 'dried ']) ? 'bag' : 'can';
    if (category === 'plant protein') {
      if (name.includes('jackfruit')) return 'can';
      if (hasAny(name, ['protein powder', 'textured vegetable protein', 'tvp'])) return 'bag';
      return 'pack';
    }
    if (category === 'nut/seed' || hasAny(category, ['nut', 'seed', 'dried fruit'])) return 'bag';
    if (category === 'oil/fat') return hasAny(name, ['coconut oil', 'shortening', 'lard']) ? 'jar' : 'bottle';
    if (category === 'sweetener') return hasAny(name, ['honey', 'maple syrup', 'agave', 'molasses']) ? 'bottle' : 'bag';

    if (category === 'baking' || category.includes('baking alternative')) {
      if (hasAny(name, ['flour', 'sugar', 'starch', 'chocolate chip', 'coconut flakes', 'coconut shreds'])) return 'bag';
      if (name.includes('yeast')) return 'pack';
      if (hasAny(name, ['vanilla', 'extract', 'food coloring'])) return 'bottle';
      if (name.includes('baking soda')) return 'box';
      if (hasAny(name, ['baking powder', 'cocoa powder'])) return 'canister';
      if (hasAny(name, ['cake mix', 'brownie mix', 'pancake mix'])) return 'box';
      return 'bag';
    }

    if (hasAny(category, ['condiment', 'sauce', 'spread'])) {
      if (hasAny(name, ['mayonnaise', 'mayo', 'salsa', 'pesto', 'pasta sauce', 'marinara', 'jam', 'jelly', 'preserve', 'relish', 'peanut butter', 'almond butter', 'cashew butter'])) return 'jar';
      if (name.includes('tomato paste')) return 'can';
      if (hasAny(name, ['broth', 'stock'])) return 'carton';
      return 'bottle';
    }
    if (hasAny(category, ['fermented', 'pickled'])) return 'jar';
    if (category.includes('beverage')) {
      if (hasAny(name, ['coffee bean', 'ground coffee'])) return 'bag';
      if (name.includes('tea')) return 'box';
      if (hasAny(name, ['soda', 'sparkling water', 'seltzer'])) return 'can';
      return 'bottle';
    }
    if (hasAny(category, ['baked goods', 'dough', 'bakery'])) {
      if (hasAny(name, ['bread', 'loaf'])) return 'loaf';
      if (hasAny(name, ['tortilla', 'pita', 'naan', 'bun', 'roll', 'bagel', 'english muffin'])) return 'pack';
      if (hasAny(name, ['pie crust', 'puff pastry'])) return 'box';
      return 'pack';
    }

    if (hasAny(name, ['broth', 'stock'])) return 'carton';
    if (hasAny(name, ['tomato paste', 'diced tomatoes', 'crushed tomatoes', 'whole peeled tomatoes', 'coconut milk'])) return 'can';
    if (hasAny(name, ['vinegar', 'oil', 'soy sauce', 'hot sauce', 'worcestershire', 'ketchup', 'mustard', 'dressing', 'syrup'])) return 'bottle';
    if (hasAny(name, ['jam', 'jelly', 'preserve', 'pickle', 'olives', 'capers', 'pesto', 'salsa'])) return 'jar';
    if (hasAny(name, ['rice', 'quinoa', 'barley', 'farro', 'bulgur', 'couscous', 'flour', 'granulated sugar', 'brown sugar', 'powdered sugar'])) return 'bag';
    if (name.includes('bread')) return 'loaf';
    return 'each';
  };

  const buildCatalogDefaults = (ingredients) => {
    const result = {};
    (Array.isArray(ingredients) ? ingredients : []).forEach((ingredient) => {
      const slug = clean(ingredient?.slug);
      if (slug) result[slug] = getDefaultPackageUnit(ingredient);
    });
    return result;
  };

  const resolvePantryUnit = ({ ingredient, inventoryEntry, preferences } = {}) => {
    const slug = clean(ingredient?.slug);
    const preferred = slug ? clean(normalizePreferenceMap(preferences)[slug]) : '';
    if (preferred) return preferred;
    const stored = clean(inventoryEntry?.unit);
    return stored || getDefaultPackageUnit(ingredient);
  };

  const api = { UNIT_PREFERENCE_STORAGE_KEY, PACKAGE_UNITS, normalizePreferenceMap, getDefaultPackageUnit, buildCatalogDefaults, resolvePantryUnit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulPantryPackageDefaults = Object.assign({}, global.BlissfulPantryPackageDefaults || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
