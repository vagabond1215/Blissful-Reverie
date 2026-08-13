;(function (global) {
  const LIMITS = Object.freeze({ categories: 12, tags: 5, allergens: 5 });
  const normalize = (value) => String(value || '').trim().toLowerCase();
  const countOptions = (items, mode) => {
    const counts = {};
    (Array.isArray(items) ? items : []).forEach((item) => {
      const values = mode === 'categories' ? [item?.category] : (Array.isArray(item?.tags) ? item.tags : []);
      new Set(values.map((value) => String(value || '').trim()).filter(Boolean)).forEach((value) => {
        if (mode === 'tags' && /(contains|free)/i.test(value)) return;
        if (mode === 'allergens' && !/(contains|free)/i.test(value)) return;
        const key = normalize(value);
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    return counts;
  };
  const visibleIndexes = (options, limit, expanded) => {
    if (expanded) return options.map((_, index) => index);
    const shown = new Set(options.slice(0, Math.max(1, Number(limit) || 1)).map((_, index) => index));
    options.forEach((option, index) => { if (option?.selected) shown.add(index); });
    return [...shown].sort((a, b) => a - b);
  };
  const api = { LIMITS, normalize, countOptions, visibleIndexes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulPantryWorkspaceCore = Object.assign({}, global.BlissfulPantryWorkspaceCore || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
