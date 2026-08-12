;(function (global) {
  const VIEW_SETTINGS_STORAGE_KEY = 'blissful-pantry-view-settings';
  const FAVORITES_ONLY_STORAGE_KEY = 'blissful-pantry-favorites-only';
  const STOCK_STATES = ['all', 'in', 'low', 'out'];
  const STOCK_LABELS = Object.freeze({ all: 'All', in: 'Stocked', low: 'Low', out: 'Out' });

  const normalizeStockFilter = (value) => STOCK_STATES.includes(value) ? value : 'all';
  const nextStockFilter = (value) => {
    const current = normalizeStockFilter(value);
    return STOCK_STATES[(STOCK_STATES.indexOf(current) + 1) % STOCK_STATES.length];
  };
  const normalizeSortMode = (value) => value === 'frequent' ? 'frequent' : 'alphabetical';
  const toggleSortMode = (value) => normalizeSortMode(value) === 'alphabetical' ? 'frequent' : 'alphabetical';

  const api = { normalizeStockFilter, nextStockFilter, normalizeSortMode, toggleSortMode };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulPantryTopbarControls = Object.assign({}, global.BlissfulPantryTopbarControls || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;
  let applyingFavorites = false;

  const readJson = (key, fallback) => {
    try {
      const raw = global.localStorage?.getItem?.(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  };
  const writeJson = (key, value) => {
    try { global.localStorage?.setItem?.(key, JSON.stringify(value)); } catch (error) {}
  };
  const readSettings = () => {
    const source = readJson(VIEW_SETTINGS_STORAGE_KEY, {});
    return source && typeof source === 'object' && !Array.isArray(source) ? source : {};
  };
  const favoritesOnly = () => {
    try { return global.localStorage?.getItem?.(FAVORITES_ONLY_STORAGE_KEY) === 'true'; } catch (error) { return false; }
  };
  const setFavoritesOnly = (enabled) => {
    try { global.localStorage?.setItem?.(FAVORITES_ONLY_STORAGE_KEY, enabled ? 'true' : 'false'); } catch (error) {}
  };
  const isPantryActive = () => {
    const view = document.getElementById('pantry-view');
    return view instanceof HTMLElement && !view.hidden;
  };

  const ensureBar = () => document.getElementById('page-action-bar');
  const ensureButton = (id, className, before, setup) => {
    const bar = ensureBar();
    if (!bar) return null;
    let button = document.getElementById(id);
    if (!(button instanceof HTMLButtonElement)) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = id;
      button.className = className;
      setup(button);
    }
    const anchor = typeof before === 'string' ? document.getElementById(before) : before;
    if (button.parentElement !== bar || (anchor && button.nextSibling !== anchor)) {
      bar.insertBefore(button, anchor instanceof Node && anchor.parentElement === bar ? anchor : null);
    }
    return button;
  };

  const triggerStockFilter = (value) => {
    const normalized = normalizeStockFilter(value);
    const legacy = document.querySelector(`[data-stock-filter="${normalized}"]`);
    if (legacy instanceof HTMLButtonElement) {
      legacy.click();
      return true;
    }
    const settings = readSettings();
    writeJson(VIEW_SETTINGS_STORAGE_KEY, { ...settings, stockFilter: normalized });
    return false;
  };

  const triggerSort = (value) => {
    const normalized = normalizeSortMode(value);
    const select = document.getElementById('pantry-sort-select');
    if (select instanceof HTMLSelectElement) {
      select.value = normalized;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    const settings = readSettings();
    writeJson(VIEW_SETTINGS_STORAGE_KEY, { ...settings, sortBy: normalized });
    return false;
  };

  const migrateCommonality = () => {
    const settings = readSettings();
    if (settings.sortBy === 'commonality') {
      writeJson(VIEW_SETTINGS_STORAGE_KEY, { ...settings, sortBy: 'alphabetical' });
    }
    const select = document.getElementById('pantry-sort-select');
    if (select instanceof HTMLSelectElement) {
      select.querySelector('option[value="commonality"]')?.remove();
      if (select.value === 'commonality') triggerSort('alphabetical');
    }
  };

  const restoreBaseFiltering = () => {
    const settings = readSettings();
    triggerStockFilter(normalizeStockFilter(settings.stockFilter));
  };

  const applyFavoriteOnly = () => {
    if (applyingFavorites || !isPantryActive()) return;
    applyingFavorites = true;
    try {
      const enabled = favoritesOnly();
      document.querySelectorAll('#pantry-grid .pantry-card').forEach((card) => {
        if (!(card instanceof HTMLElement)) return;
        if (!enabled) {
          delete card.dataset.favoriteOnlyHidden;
          return;
        }
        const favorite = card.querySelector('.pantry-card__favorite-button');
        const isFavorite = favorite instanceof HTMLButtonElement && favorite.getAttribute('aria-pressed') === 'true';
        if (!isFavorite && !card.hidden) {
          card.hidden = true;
          card.dataset.favoriteOnlyHidden = 'true';
        } else if (isFavorite) {
          delete card.dataset.favoriteOnlyHidden;
        }
      });
      document.querySelectorAll('#pantry-grid .pantry-category').forEach((section) => {
        if (!(section instanceof HTMLElement)) return;
        const hasVisible = Array.from(section.querySelectorAll('.pantry-card')).some(
          (card) => card instanceof HTMLElement && !card.hidden,
        );
        section.hidden = !hasVisible;
      });
    } finally {
      applyingFavorites = false;
    }
  };

  const refreshFavorites = () => {
    restoreBaseFiltering();
    global.requestAnimationFrame(applyFavoriteOnly);
  };

  const ensureControls = () => {
    const bar = ensureBar();
    if (!bar) return false;
    const tag = document.getElementById('pantry-tags-action');
    const lists = document.getElementById('pantry-lists-action');
    if (!tag) return false;

    const filter = ensureButton(
      'pantry-stock-cycle-action',
      'page-action-bar__button pantry-page-action pantry-page-action--state',
      tag,
      (button) => {
        button.addEventListener('click', () => {
          const next = nextStockFilter(readSettings().stockFilter);
          triggerStockFilter(next);
          global.requestAnimationFrame(() => { applyFavoriteOnly(); syncButtons(); });
        });
      },
    );
    const sort = ensureButton(
      'pantry-sort-action',
      'page-action-bar__button page-action-bar__button--icon pantry-page-action pantry-page-action--sort',
      tag,
      (button) => {
        button.addEventListener('click', () => {
          const next = toggleSortMode(readSettings().sortBy);
          triggerSort(next);
          global.requestAnimationFrame(() => { applyFavoriteOnly(); syncButtons(); });
        });
      },
    );
    const favorite = ensureButton(
      'pantry-favorites-action',
      'page-action-bar__button page-action-bar__button--icon pantry-page-action pantry-page-action--favorite',
      tag,
      (button) => {
        button.innerHTML = '<span aria-hidden="true">♥</span>';
        button.addEventListener('click', () => {
          setFavoritesOnly(!favoritesOnly());
          refreshFavorites();
          syncButtons();
        });
      },
    );

    if (lists instanceof HTMLElement && filter && lists.nextSibling !== filter) bar.insertBefore(filter, tag);
    if (filter && sort && filter.nextSibling !== sort) bar.insertBefore(sort, tag);
    if (sort && favorite && sort.nextSibling !== favorite) bar.insertBefore(favorite, tag);
    return Boolean(filter && sort && favorite);
  };

  function syncButtons() {
    const active = isPantryActive();
    const settings = readSettings();
    const stock = normalizeStockFilter(settings.stockFilter);
    const sortMode = normalizeSortMode(settings.sortBy);
    const filter = document.getElementById('pantry-stock-cycle-action');
    const sort = document.getElementById('pantry-sort-action');
    const favorite = document.getElementById('pantry-favorites-action');
    [filter, sort, favorite].forEach((button) => { if (button instanceof HTMLElement) button.hidden = !active; });
    if (filter instanceof HTMLButtonElement) {
      filter.textContent = STOCK_LABELS[stock];
      filter.setAttribute('aria-label', `Pantry stock filter: ${STOCK_LABELS[stock]}. Click for next filter.`);
      filter.title = `Stock: ${STOCK_LABELS[stock]}`;
    }
    if (sort instanceof HTMLButtonElement) {
      const use = sortMode === 'frequent';
      sort.textContent = use ? '↻' : 'A↕';
      sort.setAttribute('aria-label', use ? 'Sort pantry by use. Click for alphabetical.' : 'Sort pantry alphabetically. Click for use frequency.');
      sort.title = use ? 'Sort: Use' : 'Sort: Alphabetical';
      sort.setAttribute('aria-pressed', use ? 'true' : 'false');
    }
    if (favorite instanceof HTMLButtonElement) {
      const enabled = favoritesOnly();
      favorite.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      favorite.setAttribute('aria-label', enabled ? 'Show all pantry items' : 'Show favorite pantry items only');
      favorite.title = enabled ? 'Favorites only: On' : 'Favorites only: Off';
    }
  }

  const sync = () => {
    migrateCommonality();
    if (!ensureControls()) return;
    syncButtons();
    if (isPantryActive() && favoritesOnly()) applyFavoriteOnly();
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
    migrateCommonality();
    sync();
    const observer = new MutationObserver((records) => {
      const meaningful = records.some((record) => {
        if (record.type === 'childList') return true;
        const target = record.target;
        if (!(target instanceof HTMLElement)) return false;
        return target.id === 'pantry-view'
          || target.classList.contains('pantry-card__favorite-button')
          || target.classList.contains('pantry-card');
      });
      if (meaningful) schedule();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'aria-pressed'],
    });
    document.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('.pantry-card__favorite-button')) {
        global.requestAnimationFrame(() => { restoreBaseFiltering(); global.requestAnimationFrame(applyFavoriteOnly); });
      }
    });
    global.addEventListener('storage', (event) => {
      if ([VIEW_SETTINGS_STORAGE_KEY, FAVORITES_ONLY_STORAGE_KEY].includes(event.key)) schedule();
    });
    let retries = 0;
    const retry = () => {
      retries += 1;
      sync();
      if ((!document.getElementById('page-action-bar') || !document.getElementById('pantry-sort-select')) && retries < 60) {
        global.requestAnimationFrame(retry);
      }
    };
    global.requestAnimationFrame(retry);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
