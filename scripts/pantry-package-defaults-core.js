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
  const normalizePackageUnit = (value) => {
    const normalized = clean(value);
    return PACKAGE_UNITS.includes(normalized) ? normalized : '';
  };

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
    const explicit = normalizePackageUnit(ingredient?.packageUnit);
    if (explicit) return explicit;

    const name = lower(ingredient?.name);
    const slug = lower(ingredient?.slug);
    const category = lower(ingredient?.category);
    const text = `${name} ${slug} ${category}`;
    if (!name && !slug && !category) return 'each';

    if (hasAny(text, ['canned ', 'canned-'])) return 'can';
    if (hasAny(text, ['frozen ', 'frozen-'])) {
      return hasAny(name, ['pizza', 'waffle', 'pancake', 'meal', 'lasagna']) ? 'box' : 'bag';
    }

    if (hasAny(name, ['broth', 'stock'])) return 'carton';
    if (name.includes('bouillon')) return 'jar';
    if (name.includes('powdered milk')) return 'box';
    if (name.includes('coconut milk') && !name.includes('beverage')) return 'can';
    if (name.includes('buttermilk')) return 'carton';
    if (name.includes('clarified butter')) return 'jar';
    if (name.includes('egg') && !hasAny(name, ['egg noodles', 'eggplant'])) return 'carton';
    if (
      name.includes('butter')
      && !hasAny(name, ['peanut butter', 'almond butter', 'cashew butter', 'sunflower butter', 'pumpkin seed butter'])
    ) {
      return name.includes('spread') ? 'tub' : 'box';
    }
    if (name.includes('milk')) {
      return category === 'dairy alternative' || hasAny(name, ['almond', 'oat', 'soy', 'pea', 'coconut'])
        ? 'carton'
        : 'jug';
    }
    if (hasAny(name, ['heavy cream', 'half-and-half', 'half and half', 'whipping cream'])) return 'carton';
    if (hasAny(name, ['yogurt', 'sour cream', 'cottage cheese', 'ricotta', 'skyr', 'quark', 'crème fraîche', 'creme fraiche'])) return 'tub';
    if (name.includes('cream cheese')) return 'pack';
    if (hasAny(name, ['ghee', 'coconut oil', 'shortening'])) return 'jar';
    if (hasAny(name, ['cheese shreds', 'shredded cheese'])) return 'bag';
    if (
      category === 'cheese'
      || category === 'dairy'
      || hasAny(name, ['cheddar', 'mozzarella', 'parmesan', 'feta cheese', 'monterey jack', 'queso fresco'])
    ) {
      return 'pack';
    }

    if (category === 'pasta' || category.includes('pasta & noodles')) {
      return hasAny(name, ['ramen', 'udon', 'somen', 'glass noodles']) ? 'pack' : 'box';
    }

    if (category === 'meat' || hasAny(category, ['meat', 'poultry'])) {
      if (hasAny(name, ['whole chicken', 'whole turkey', 'spiral-cut ham', 'cornish hen'])) return 'each';
      if (name.includes('ground ')) return 'tray';
      return 'pack';
    }

    if (category === 'seafood') {
      if (hasAny(name, ['whole fish'])) return 'each';
      if (hasAny(name, ['mussels', 'clams'])) return 'bag';
      if (hasAny(name, ['canned tuna', 'sardine'])) return 'can';
      return 'pack';
    }

    if (category.includes('mushroom')) return 'pack';
    if (category === 'herb' || hasAny(category, ['herbs & aromatics', 'fresh herbs'])) {
      return hasAny(name, ['garlic', 'ginger', 'shallot']) ? 'each' : 'bunch';
    }
    if (category === 'spice' || hasAny(category, ['spice', 'seasoning'])) return 'jar';

    if (hasAny(name, ['cilantro', 'parsley', 'basil', 'dill', 'mint', 'green onion', 'scallion', 'asparagus', 'celery'])) return 'bunch';
    if (hasAny(name, ['baby spinach', 'salad greens', 'spring mix', 'arugula', 'coleslaw mix'])) return 'bag';
    if (hasAny(name, ['strawberries', 'blueberries', 'raspberries', 'blackberries'])) return 'clamshell';
    if (hasAny(name, ['grapes', 'cherries'])) return 'bag';

    if (category === 'grain' || hasAny(category, ['grain', 'cereal'])) {
      if (name.includes('ready-to-eat')) return 'pouch';
      return hasAny(name, ['cereal', 'oats', 'oatmeal']) ? 'box' : 'bag';
    }

    if (category === 'legume' || category.includes('legume')) {
      if (name.includes('edamame')) return 'bag';
      if (name.includes('peanut')) return 'bag';
      if (hasAny(name, ['lentil', 'split pea', 'dal', 'dry ', 'dried '])) return 'bag';
      return 'can';
    }

    if (category === 'plant protein') {
      if (name.includes('jackfruit')) return 'can';
      if (hasAny(name, ['protein powder', 'textured vegetable protein', 'tvp', 'flour'])) return 'bag';
      return 'pack';
    }

    if (category === 'nut/seed' || hasAny(category, ['nut', 'seed', 'dried fruit'])) return 'bag';

    if (category === 'oil/fat' || hasAny(category, ['oils & fats'])) {
      return hasAny(name, ['fat', 'tallow', 'schmaltz', 'lard', 'cocoa butter', 'shortening', 'coconut oil'])
        ? 'jar'
        : 'bottle';
    }

    if (category === 'sweetener' || category.includes('sweetener')) {
      if (hasAny(name, ['honey', 'syrup', 'agave', 'molasses'])) return 'bottle';
      if (hasAny(name, ['extract', 'powder'])) return 'canister';
      return 'bag';
    }

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
      return 'bottle';
    }

    if (hasAny(category, ['fermented', 'pickled'])) return 'jar';

    if (category.includes('beverage')) {
      if (hasAny(name, ['coffee bean', 'ground coffee'])) return 'bag';
      if (name.includes('tea')) return 'box';
      if (hasAny(name, ['soda', 'sparkling water', 'seltzer'])) return 'can';
      if (name.includes('beer')) return 'pack';
      return 'bottle';
    }

    if (hasAny(category, ['baked goods', 'dough', 'bakery'])) {
      if (hasAny(name, ['bread', 'loaf'])) return 'loaf';
      if (hasAny(name, ['tortilla', 'pita', 'naan', 'bun', 'roll', 'bagel', 'english muffin', 'wrapper'])) return 'pack';
      if (hasAny(name, ['pie crust', 'puff pastry', 'phyllo'])) return 'box';
      return 'pack';
    }

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

  const api = {
    UNIT_PREFERENCE_STORAGE_KEY,
    PACKAGE_UNITS,
    normalizePackageUnit,
    normalizePreferenceMap,
    getDefaultPackageUnit,
    buildCatalogDefaults,
    resolvePantryUnit,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulPantryPackageDefaults = Object.assign({}, global.BlissfulPantryPackageDefaults || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
