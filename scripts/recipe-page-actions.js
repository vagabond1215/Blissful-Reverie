;(function (global) {
  const READINESS_STORAGE_KEY = 'blissful-recipe-readiness-limit';
  const normalizeCount = (value) => Math.max(0, Number.parseInt(String(value ?? 0), 10) || 0);
  const formatResultCount = (value) => normalizeCount(value).toLocaleString();
  const normalizeReadinessLimit = (value, fallback = 2) => {
    const number = Number.parseInt(String(value ?? ''), 10);
    return number === 0 || number === 1 || number === 2 ? number : fallback;
  };
  const nextReadinessLimit = (value) => {
    const current = normalizeReadinessLimit(value, 2);
    return current === 0 ? 1 : current === 1 ? 2 : 0;
  };
  const formatReadinessLabel = (value) => {
    const current = normalizeReadinessLimit(value, 2);
    return current === 0 ? 'Off' : current === 1 ? '1 ingredient' : '2 ingredients';
  };
  const api = {
    READINESS_STORAGE_KEY,
    normalizeCount,
    formatResultCount,
    normalizeReadinessLimit,
    nextReadinessLimit,
    formatReadinessLabel,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulRecipePageActions = Object.assign({}, global.BlissfulRecipePageActions || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;

  const isRecipesActive = () => {
    const view = document.getElementById('meal-view');
    return view instanceof HTMLElement && !view.hidden;
  };

  const getReadinessLimit = () => {
    try {
      return normalizeReadinessLimit(global.localStorage?.getItem?.(READINESS_STORAGE_KEY), 2);
    } catch (error) {
      return 2;
    }
  };

  const setReadinessLimit = (value) => {
    const normalized = normalizeReadinessLimit(value, 2);
    try { global.localStorage?.setItem?.(READINESS_STORAGE_KEY, String(normalized)); } catch (error) { /* session-only fallback */ }
    return normalized;
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

  const ensureReadinessAction = () => {
    const bar = ensurePageActionBar();
    if (!bar) return null;
    let button = document.getElementById('recipe-readiness-action');
    if (!(button instanceof HTMLButtonElement)) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = 'recipe-readiness-action';
      button.className = 'page-action-bar__button recipe-readiness-action';
      button.addEventListener('click', () => {
        const next = setReadinessLimit(nextReadinessLimit(getReadinessLimit()));
        button.textContent = formatReadinessLabel(next);
        button.dataset.readinessLimit = String(next);
        button.setAttribute('aria-label', `Almost Ready: ${formatReadinessLabel(next)}`);
        button.title = `Almost Ready: ${formatReadinessLabel(next)} missing threshold`;
        global.dispatchEvent(new CustomEvent('blissful-recipe-readiness-change', { detail: { limit: next } }));
        schedule();
      });
    }
    const chip = document.getElementById('recipe-action-chip');
    const family = document.getElementById('recipe-family-filter');
    if (button.parentElement !== bar) {
      const anchor = family?.parentElement === bar ? family : (chip?.nextSibling || null);
      bar.insertBefore(button, anchor);
    } else if (chip instanceof HTMLElement && chip.nextSibling !== button) {
      bar.insertBefore(button, chip.nextSibling);
    }
    const limit = getReadinessLimit();
    button.textContent = formatReadinessLabel(limit);
    button.dataset.readinessLimit = String(limit);
    button.setAttribute('aria-label', `Almost Ready: ${formatReadinessLabel(limit)}`);
    button.title = `Almost Ready: ${formatReadinessLabel(limit)} missing threshold`;
    button.hidden = !isRecipesActive();
    return button;
  };

  const ensureRecipeFamilyActions = () => {
    const bar = ensurePageActionBar();
    const family = document.getElementById('recipe-family-filter');
    if (!bar || !(family instanceof HTMLElement)) return null;
    const readiness = document.getElementById('recipe-readiness-action');
    const chip = document.getElementById('recipe-action-chip');
    const anchorNode = readiness instanceof HTMLElement ? readiness : chip;
    const desiredAnchor = anchorNode instanceof HTMLElement ? anchorNode.nextSibling : null;
    if (family.parentElement !== bar || (anchorNode instanceof HTMLElement && anchorNode.nextSibling !== family)) {
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
    const cards = Array.from(document.querySelectorAll('#meal-grid .meal-card'));
    const visible = cards.filter((card) => card instanceof HTMLElement
      && !card.hidden
      && !card.classList.contains('meal-card--family-disliked')).length;
    const text = formatResultCount(visible);
    if (badge.textContent !== text) badge.textContent = text;
    const label = `${text} recipe results`;
    badge.setAttribute('aria-label', label);
    badge.title = label;
  };

  const sync = () => {
    const active = isRecipesActive();
    document.documentElement.classList.toggle('recipes-view-active', active);
    ensureRecipeActions();
    ensureReadinessAction();
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
    global.addEventListener('storage', (event) => {
      if (event.key === READINESS_STORAGE_KEY) schedule();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);