;(function (global) {
  const normalizeCount = (value) => Math.max(0, Number.parseInt(String(value ?? 0), 10) || 0);
  const formatResultCount = (value) => normalizeCount(value).toLocaleString();
  const isRecipesViewOwned = ({ viewHidden = true, shopActive = false } = {}) => !viewHidden && !shopActive;
  const api = { normalizeCount, formatResultCount, isRecipesViewOwned };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulRecipePageActions = Object.assign({}, global.BlissfulRecipePageActions || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;

  const isRecipesActive = () => {
    const view = document.getElementById('meal-view');
    return isRecipesViewOwned({
      viewHidden: !(view instanceof HTMLElement) || view.hidden,
      shopActive: document.body.classList.contains('shop-view-active'),
    });
  };

  const ensurePageActionBar = () => {
    const row = document.querySelector('#recipes-page .topbar__row');
    if (!row) return null;
    let bar = document.getElementById('page-action-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'page-action-bar';
      bar.className = 'page-action-bar';
      bar.setAttribute('role', 'group');
      bar.setAttribute('aria-label', 'Page actions');
      const primaryNav = document.getElementById('primary-nav');
      if (primaryNav?.nextSibling) row.insertBefore(bar, primaryNav.nextSibling);
      else row.appendChild(bar);
    }
    return bar;
  };

  const ensureRecipeActions = () => {
    const bar = ensurePageActionBar();
    const chip = document.getElementById('recipe-action-chip');
    if (!bar || !(chip instanceof HTMLElement)) return null;
    if (chip.parentElement !== bar) bar.appendChild(chip);
    chip.classList.add('recipe-action-chip--page-actions');
    ['favorite-filter', 'pantry-only-toggle', 'substitution-toggle', 'reset-filters'].forEach((id) => {
      const button = document.getElementById(id);
      if (!(button instanceof HTMLButtonElement)) return;
      button.classList.add('page-action-bar__button', 'page-action-bar__button--icon', 'recipe-page-action');
    });
    chip.hidden = !isRecipesActive();
    chip.setAttribute('aria-hidden', chip.hidden ? 'true' : 'false');
    return chip;
  };

  const ensureRecipeFamilyActions = () => {
    const bar = ensurePageActionBar();
    const family = document.getElementById('recipe-family-filter');
    if (!bar || !(family instanceof HTMLElement)) return null;
    const chip = document.getElementById('recipe-action-chip');
    const desiredAnchor = chip instanceof HTMLElement ? chip.nextSibling : null;
    if (family.parentElement !== bar || (chip instanceof HTMLElement && chip.nextSibling !== family)) {
      bar.insertBefore(family, desiredAnchor && desiredAnchor.parentElement === bar ? desiredAnchor : null);
    }
    family.classList.add('recipe-family-filter--page-actions');
    if (!isRecipesActive()) family.hidden = true;
    family.querySelectorAll('.recipe-family-filter__button').forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.classList.add('page-action-bar__button', 'page-action-bar__button--icon', 'recipe-family-page-action');
    });
    return family;
  };

  const syncActionEndcaps = () => {
    const bar = document.getElementById('page-action-bar');
    if (!(bar instanceof HTMLElement)) return;
    const buttons = Array.from(bar.querySelectorAll('button')).filter((button) => (
      button instanceof HTMLButtonElement && !button.hidden && !button.closest('[hidden]')
    ));
    buttons.forEach((button) => button.classList.remove('page-action-bar__segment-first', 'page-action-bar__segment-last'));
    buttons[0]?.classList.add('page-action-bar__segment-first');
    buttons[buttons.length - 1]?.classList.add('page-action-bar__segment-last');
  };

  const ensureRecipeSearch = () => {
    const row = document.querySelector('#recipes-page .topbar__row');
    const source = document.getElementById('filter-search');
    if (!row || !(source instanceof HTMLInputElement)) return null;
    let chrome = document.getElementById('recipe-topbar-search');
    if (!chrome) {
      chrome = document.createElement('div');
      chrome.id = 'recipe-topbar-search';
      chrome.className = 'recipe-topbar-search';
      const badge = document.createElement('span');
      badge.id = 'recipe-result-badge';
      badge.className = 'recipe-result-badge';
      badge.setAttribute('aria-live', 'polite');
      const input = document.createElement('input');
      input.type = 'search';
      input.id = 'recipe-topbar-search-input';
      input.placeholder = 'Search recipes';
      input.autocomplete = 'off';
      input.setAttribute('aria-label', 'Search recipes');
      input.addEventListener('input', () => {
        if (source.value !== input.value) {
          source.value = input.value;
          source.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      source.addEventListener('input', () => {
        if (input.value !== source.value) input.value = source.value;
      });
      chrome.append(badge, input);
      row.appendChild(chrome);
    }
    const input = chrome.querySelector('#recipe-topbar-search-input');
    if (input instanceof HTMLInputElement && input.value !== source.value) input.value = source.value;
    chrome.hidden = !isRecipesActive();
    return chrome;
  };

  const updateBadge = () => {
    const badge = document.getElementById('recipe-result-badge');
    if (!(badge instanceof HTMLElement)) return;
    const grid = document.getElementById('meal-grid');
    const totalResults = grid instanceof HTMLElement ? grid.dataset.totalResults : 0;
    const text = formatResultCount(totalResults);
    if (badge.textContent !== text) badge.textContent = text;
    const label = `${text} recipe results`;
    badge.setAttribute('aria-label', label);
    badge.title = label;
  };

  const sync = () => {
    const active = isRecipesActive();
    document.documentElement.classList.toggle('recipes-view-active', active);
    document.getElementById('recipe-readiness-action')?.remove();
    ensureRecipeActions();
    ensureRecipeFamilyActions();
    ensureRecipeSearch();
    updateBadge();
    syncActionEndcaps();
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      sync();
    });
  };

  const start = () => {
    sync();
    const observer = new MutationObserver(() => schedule());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'class', 'aria-pressed'],
    });
    global.addEventListener('blissful-family-dislikes-change', schedule);
    global.addEventListener('blissful-recipe-results-change', schedule);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
