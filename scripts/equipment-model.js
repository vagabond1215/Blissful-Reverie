;(function (global) {
  const TOKEN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const clean = (value) => String(value || '').trim();
  const normalizeLabel = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  const normalizeLegacyToken = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');

  const createIndex = (catalog = global.BLISSFUL_EQUIPMENT || []) => {
    const items = Array.isArray(catalog) ? catalog : [];
    const byToken = new Map();
    const legacyToToken = new Map();
    const variantIds = new Set();
    items.forEach((item) => {
      const token = clean(item?.token);
      if (!token) return;
      byToken.set(token, item);
      const labels = [item?.name, ...(Array.isArray(item?.aliases) ? item.aliases : [])];
      labels.forEach((label) => {
        const normalized = normalizeLabel(label);
        if (normalized) legacyToToken.set(normalized, token);
        const legacy = normalizeLegacyToken(label);
        if (legacy) legacyToToken.set(legacy, token);
      });
      [token, ...(Array.isArray(item?.legacyTokens) ? item.legacyTokens : [])].forEach((legacy) => {
        const normalized = normalizeLegacyToken(legacy);
        if (normalized) legacyToToken.set(normalized, token);
      });
      (Array.isArray(item?.variants) ? item.variants : []).forEach((variant) => {
        const id = clean(variant?.id);
        if (id) variantIds.add(id);
      });
    });
    return { catalog: items, byToken, legacyToToken, variantIds };
  };

  const resolveToken = (value, index = createIndex()) => {
    const raw = clean(value);
    if (!raw) return '';
    if (index?.byToken?.has?.(raw)) return raw;
    const legacy = normalizeLegacyToken(raw);
    if (index?.byToken?.has?.(legacy)) return legacy;
    return index?.legacyToToken?.get?.(normalizeLabel(raw))
      || index?.legacyToToken?.get?.(legacy)
      || '';
  };

  const getRequirementTokens = (requirement, index = createIndex()) => {
    if (typeof requirement === 'string') {
      const resolved = resolveToken(requirement, index);
      return resolved ? [resolved] : [];
    }
    if (!requirement || typeof requirement !== 'object' || Array.isArray(requirement)) return [];
    if (typeof requirement.token === 'string') {
      const resolved = resolveToken(requirement.token, index);
      return resolved ? [resolved] : [];
    }
    const values = Array.isArray(requirement.anyOf) ? requirement.anyOf : [];
    return Array.from(new Set(values.map((value) => resolveToken(value, index)).filter(Boolean)));
  };

  const formatRequirement = (requirement, index = createIndex()) => {
    const tokens = getRequirementTokens(requirement, index);
    if (!tokens.length) return typeof requirement === 'string' ? clean(requirement) : '';
    return tokens.map((token) => index.byToken.get(token)?.name || token).join(' or ');
  };

  const collectRecipeTokens = (recipe, index = createIndex()) => {
    const result = new Set();
    (Array.isArray(recipe?.equipment) ? recipe.equipment : []).forEach((requirement) => {
      getRequirementTokens(requirement, index).forEach((token) => result.add(token));
    });
    return result;
  };

  const requirementSatisfiedBy = (requirement, owned, index = createIndex()) => {
    const tokens = getRequirementTokens(requirement, index);
    if (!tokens.length) return false;
    const ownedSet = owned instanceof Set ? owned : new Set(Array.isArray(owned) ? owned : []);
    return tokens.some((token) => ownedSet.has(token));
  };

  const normalizeFilterValues = (values, index = createIndex()) => Array.from(new Set(
    (Array.isArray(values) ? values : []).map((value) => resolveToken(value, index)).filter(Boolean),
  ));

  const normalizeInventory = (value, index = createIndex()) => {
    const source = value instanceof Set
      ? Array.from(value)
      : Array.isArray(value)
        ? value
        : value && typeof value === 'object'
          ? Object.entries(value).filter(([, selected]) => Boolean(selected)).map(([key]) => key)
          : [];
    const result = new Set();
    source.forEach((entry) => {
      const raw = clean(entry);
      if (!raw) return;
      if (index.variantIds.has(raw)) {
        result.add(raw);
        return;
      }
      const resolved = resolveToken(raw, index);
      result.add(resolved || raw);
    });
    return result;
  };

  const validateCatalog = (catalog = global.BLISSFUL_EQUIPMENT || []) => {
    const errors = [];
    const seen = new Set();
    (Array.isArray(catalog) ? catalog : []).forEach((item, index) => {
      const ref = `equipment[${index}]`;
      const token = clean(item?.token);
      if (!TOKEN_PATTERN.test(token)) errors.push(`${ref} has invalid token '${token}'.`);
      else if (seen.has(token)) errors.push(`${ref} duplicates token '${token}'.`);
      else seen.add(token);
      if (!clean(item?.name)) errors.push(`${ref} is missing a name.`);
      if (!clean(item?.category)) errors.push(`${ref} is missing a category.`);
      if (item?.aliases !== undefined && !Array.isArray(item.aliases)) errors.push(`${ref} aliases must be an array.`);
      if (item?.variants !== undefined && !Array.isArray(item.variants)) errors.push(`${ref} variants must be an array.`);
    });
    return errors;
  };

  const api = {
    TOKEN_PATTERN,
    normalizeLabel,
    normalizeLegacyToken,
    createIndex,
    resolveToken,
    getRequirementTokens,
    formatRequirement,
    collectRecipeTokens,
    requirementSatisfiedBy,
    normalizeFilterValues,
    normalizeInventory,
    validateCatalog,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulEquipmentModel = Object.assign({}, global.BlissfulEquipmentModel || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
