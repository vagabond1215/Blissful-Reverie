;(function (global) {
  const LIMITS = Object.freeze({ categories: 12, tags: 5, allergens: 5 });
  const normalize = (value) => String(value || '').trim().toLowerCase();
  const isAllergenTag = (value) => /^contains\b/i.test(String(value || '').trim());
  const isDietaryFreeTag = (value) => /free\*?$/i.test(String(value || '').trim());
  const formatFilterLabel = (value, mode) => {
    const raw = String(value || '').trim();
    const qualified = /\*+$/.test(raw);
    let label = raw.replace(/\*+$/, '').trim();
    if (mode === 'allergens') label = label.replace(/^contains\s+/i, '');
    return qualified ? `${label} (check label)` : label;
  };
  const countOptions = (items, mode) => {
    const counts = {};
    (Array.isArray(items) ? items : []).forEach((item) => {
      const values = mode === 'categories' ? [item?.category] : (Array.isArray(item?.tags) ? item.tags : []);
      new Set(values.map((value) => String(value || '').trim()).filter(Boolean)).forEach((value) => {
        if (mode === 'tags' && isAllergenTag(value)) return;
        if (mode === 'allergens' && !isAllergenTag(value)) return;
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
  const normalizeFilterDom = () => {
    if (typeof document === 'undefined') return;
    const tags = document.getElementById('tag-options');
    const allergens = document.getElementById('allergy-options');
    if (!(tags instanceof HTMLElement) || !(allergens instanceof HTMLElement)) return;
    allergens.querySelectorAll(':scope > .checkbox-option').forEach((label) => {
      if (!(label instanceof HTMLElement)) return;
      const input = label.querySelector('input[type="checkbox"]');
      if (input instanceof HTMLInputElement && isDietaryFreeTag(input.value)) tags.appendChild(label);
    });
    [['tags', tags], ['allergens', allergens]].forEach(([mode, container]) => {
      container.querySelectorAll(':scope > .checkbox-option').forEach((label) => {
        const input = label.querySelector('input[type="checkbox"]');
        const text = label.querySelector(':scope > span');
        if (!(input instanceof HTMLInputElement) || !(text instanceof HTMLElement)) return;
        const next = formatFilterLabel(input.value, mode);
        if (text.textContent !== next) text.textContent = next;
      });
    });
  };
  const api = { LIMITS, normalize, isAllergenTag, isDietaryFreeTag, formatFilterLabel, countOptions, visibleIndexes, normalizeFilterDom };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulPantryWorkspaceCore = Object.assign({}, global.BlissfulPantryWorkspaceCore || {}, api);
  if (typeof document !== 'undefined') {
    normalizeFilterDom();
    const panel = document.getElementById('filter-panel');
    if (panel instanceof HTMLElement) new MutationObserver(normalizeFilterDom).observe(panel, { childList: true, subtree: true });
  }
})(typeof window !== 'undefined' ? window : globalThis);
