;(function (global) {
  const SEARCH_PLACEHOLDER = 'Search...';
  const CATEGORY_SELECTOR = '#ingredient-options input[type="checkbox"]:checked';
  const getCheckedValues = (inputs) => Array.from(inputs || [])
    .filter((input) => Boolean(input?.checked))
    .map((input) => String(input?.value || '').trim())
    .filter(Boolean);

  const api = { SEARCH_PLACEHOLDER, CATEGORY_SELECTOR, getCheckedValues };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulPantryWorkspaceRefine = Object.assign({}, global.BlissfulPantryWorkspaceRefine || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;
  let clearingCategories = false;
  let clearAttempts = 0;

  const pantryActive = () => {
    const pantry = document.getElementById('pantry-view');
    return pantry instanceof HTMLElement && !pantry.hidden;
  };

  const syncSearchPlaceholder = () => {
    if (!pantryActive()) return;
    const search = document.getElementById('filter-search');
    if (search instanceof HTMLInputElement && search.placeholder !== SEARCH_PLACEHOLDER) {
      search.placeholder = SEARCH_PLACEHOLDER;
    }
  };

  const syncAllState = () => {
    const button = document.querySelector('.pantry-workspace__all-button');
    if (!(button instanceof HTMLButtonElement)) return;
    const hasSelectedCategory = Boolean(document.querySelector(CATEGORY_SELECTOR));
    button.setAttribute('aria-pressed', hasSelectedCategory ? 'false' : 'true');
    button.title = hasSelectedCategory ? 'Clear category filters' : 'All categories are shown';
  };

  const finishCategoryClear = () => {
    clearingCategories = false;
    clearAttempts = 0;
    syncAllState();
  };

  const clearNextCategory = () => {
    if (!clearingCategories) return;
    clearAttempts += 1;
    if (clearAttempts > 100) {
      finishCategoryClear();
      return;
    }
    const input = document.querySelector(CATEGORY_SELECTOR);
    if (!(input instanceof HTMLInputElement)) {
      finishCategoryClear();
      return;
    }
    input.click();
    global.requestAnimationFrame(clearNextCategory);
  };

  const clearCategoryFilters = () => {
    if (clearingCategories) return;
    clearingCategories = true;
    clearAttempts = 0;
    clearNextCategory();
  };

  const sync = () => {
    scheduled = false;
    syncSearchPlaceholder();
    syncAllState();
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(sync);
  };

  const start = () => {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest('.pantry-workspace__all-button');
      if (!(button instanceof HTMLButtonElement)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      clearCategoryFilters();
    }, true);

    document.addEventListener('change', (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.closest('#ingredient-options')) schedule();
    }, true);

    const observer = new MutationObserver((records) => {
      const relevant = records.some((record) => {
        if (record.type === 'childList') return true;
        const target = record.target;
        return target instanceof HTMLElement
          && (target.id === 'pantry-view' || target.id === 'filter-search');
      });
      if (relevant) schedule();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'placeholder'],
    });

    sync();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
