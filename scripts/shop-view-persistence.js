;(function (global) {
  const STORAGE_KEY = 'blissful-shop-active';
  const RECIPE_REFERENCE_STORAGE_KEY = 'blissful-shopping-recipe-references';
  const SHOPPING_SETTINGS_STORAGE_KEY = 'blissful-shopping-settings';
  const GROUP_BY_MODES = ['category', 'store'];

  const parseShopActive = (value) => String(value || '') === 'true';
  const writeShopActive = (storage, active) => {
    try {
      storage?.setItem?.(STORAGE_KEY, active ? 'true' : 'false');
      return true;
    } catch (error) {
      return false;
    }
  };

  const normalizeGroupBy = (value) => value === 'store' ? 'store' : 'category';
  const nextGroupBy = (value) => normalizeGroupBy(value) === 'category' ? 'store' : 'category';

  const canonicalizeKitchenEquipmentLabels = (workspace) => {
    const groups = workspace?.GROUP_DEFINITIONS;
    if (!Array.isArray(groups)) return null;
    const bakingSheet = groups.find((group) => group?.key === 'baking-sheets');
    if (!bakingSheet) return null;
    bakingSheet.label = 'Baking Sheet';
    return bakingSheet;
  };

  const api = {
    STORAGE_KEY,
    RECIPE_REFERENCE_STORAGE_KEY,
    SHOPPING_SETTINGS_STORAGE_KEY,
    parseShopActive,
    writeShopActive,
    normalizeGroupBy,
    nextGroupBy,
    canonicalizeKitchenEquipmentLabels,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulShopViewPersistence = Object.assign({}, global.BlissfulShopViewPersistence || {}, api);
  if (typeof document === 'undefined') return;

  let attempts = 0;
  let kitchenLabelAttempts = 0;
  let chromeScheduled = false;

  const restore = () => {
    let active = false;
    try { active = parseShopActive(global.localStorage?.getItem?.(STORAGE_KEY)); } catch (error) {}
    if (!active) return;
    const button = document.querySelector('#primary-nav [data-shop-tab="true"]');
    if (button instanceof HTMLButtonElement) {
      button.click();
      return;
    }
    if (attempts >= 60) return;
    attempts += 1;
    global.requestAnimationFrame(restore);
  };

  const syncCanonicalKitchenLabels = () => {
    const group = canonicalizeKitchenEquipmentLabels(global.BlissfulShopKitchenWorkspace);
    if (!group) {
      if (kitchenLabelAttempts >= 60) return;
      kitchenLabelAttempts += 1;
      global.requestAnimationFrame(syncCanonicalKitchenLabels);
      return;
    }
    const row = document.querySelector('[data-kitchen-group="baking-sheets"]');
    if (!(row instanceof HTMLElement)) return;
    const name = row.querySelector('.kitchen-equipment-group__name');
    if (name instanceof HTMLElement) name.textContent = group.label;
    const checkbox = row.querySelector('.kitchen-equipment-group__checkbox');
    if (checkbox instanceof HTMLInputElement) {
      checkbox.setAttribute('aria-label', `${checkbox.checked ? 'Deselect' : 'Select'} all ${group.label}`);
    }
    const toggle = row.querySelector('.kitchen-equipment-group__toggle');
    if (toggle instanceof HTMLButtonElement) {
      toggle.setAttribute('aria-label', `${toggle.getAttribute('aria-expanded') === 'true' ? 'Collapse' : 'Expand'} ${group.label}`);
    }
  };

  const isShopActive = () => {
    const view = document.getElementById('shop-view');
    return document.body.classList.contains('shop-view-active')
      || (view instanceof HTMLElement && !view.hidden);
  };

  const readShoppingSettings = () => {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem?.(SHOPPING_SETTINGS_STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  };

  const writeShoppingGroupBy = (groupBy) => {
    const current = readShoppingSettings();
    try {
      global.localStorage?.setItem?.(
        SHOPPING_SETTINGS_STORAGE_KEY,
        JSON.stringify({ ...current, groupBy: normalizeGroupBy(groupBy) }),
      );
      return true;
    } catch (error) {
      return false;
    }
  };

  const readReferenceVisibility = () => {
    const panel = document.querySelector('#shop-shopping-host .productivity-shopping, .productivity-shopping');
    if (panel instanceof HTMLElement && panel.dataset.recipeReferences) {
      return panel.dataset.recipeReferences !== 'hidden';
    }
    const input = document.querySelector('.productivity-shopping__reference-input');
    if (input instanceof HTMLInputElement) return input.checked;
    try {
      const stored = global.localStorage?.getItem?.(RECIPE_REFERENCE_STORAGE_KEY);
      if (stored === 'show' || stored === 'true') return true;
      if (stored === 'hide' || stored === 'false') return false;
    } catch (error) {}
    return false;
  };

  const applyReferenceVisibilityFallback = (visible) => {
    try {
      global.localStorage?.setItem?.(RECIPE_REFERENCE_STORAGE_KEY, visible ? 'show' : 'hide');
    } catch (error) {}
    document.querySelectorAll('.productivity-shopping').forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      panel.dataset.recipeReferences = visible ? 'shown' : 'hidden';
      panel.querySelectorAll('.productivity-shopping__item-note').forEach((note) => {
        if (note instanceof HTMLElement) note.hidden = !visible;
      });
    });
  };

  const toggleRecipeReferences = () => {
    const next = !readReferenceVisibility();
    const input = document.querySelector('.productivity-shopping__reference-input');
    if (input instanceof HTMLInputElement) {
      input.checked = next;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      applyReferenceVisibilityFallback(next);
    }
    scheduleShopChrome();
  };

  const toggleShoppingGroupBy = () => {
    const current = normalizeGroupBy(readShoppingSettings().groupBy);
    const next = nextGroupBy(current);
    const input = document.querySelector(`.shopping-management__grouping input[value="${next}"]`);
    if (input instanceof HTMLInputElement) {
      input.checked = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      writeShoppingGroupBy(next);
    }
    scheduleShopChrome();
  };

  const ensureShopActionButton = (id, className, onClick) => {
    const bar = document.getElementById('page-action-bar');
    if (!(bar instanceof HTMLElement)) return null;
    let button = document.getElementById(id);
    if (!(button instanceof HTMLButtonElement)) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = id;
      button.className = `page-action-bar__button page-action-bar__button--icon shop-page-action ${className}`;
      button.addEventListener('click', onClick);
      bar.appendChild(button);
    } else if (button.parentElement !== bar) {
      bar.appendChild(button);
    }
    return button;
  };

  const referenceIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" stroke-linecap="round" stroke-linejoin="round"></path>
      <circle cx="12" cy="12" r="2.5"></circle>
    </svg>`;

  const categoryIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
      <rect x="3" y="4" width="7" height="6" rx="1.2"></rect>
      <rect x="14" y="4" width="7" height="6" rx="1.2"></rect>
      <rect x="3" y="14" width="7" height="6" rx="1.2"></rect>
      <rect x="14" y="14" width="7" height="6" rx="1.2"></rect>
    </svg>`;

  const storeIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M4 9.5V20h16V9.5" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M3 9.5 5 4h14l2 5.5c-.6 1.2-1.5 1.8-2.7 1.8-1.1 0-2-.5-2.6-1.5-.7 1-1.6 1.5-2.7 1.5s-2-.5-2.7-1.5c-.6 1-1.5 1.5-2.6 1.5C5.5 11.3 4.6 10.7 4 9.5Z" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M9 20v-5h6v5" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>`;

  const hideLegacyShopControls = () => {
    document.querySelectorAll(
      '#shop-shopping-host .productivity-shopping__reference-control, #shop-shopping-host .shopping-management__grouping',
    ).forEach((control) => {
      if (!(control instanceof HTMLElement)) return;
      if (!control.hidden) control.hidden = true;
      if (control.getAttribute('aria-hidden') !== 'true') control.setAttribute('aria-hidden', 'true');
    });
  };

  const removeShopHeader = () => {
    document.querySelector('#shop-view > .shop-view__header')?.remove();
  };

  const syncShopChrome = () => {
    const active = isShopActive();
    removeShopHeader();
    hideLegacyShopControls();

    const bar = document.getElementById('page-action-bar');
    const referenceButton = ensureShopActionButton(
      'shop-recipe-references-action',
      'shop-page-action--references',
      toggleRecipeReferences,
    );
    const groupingButton = ensureShopActionButton(
      'shop-group-by-action',
      'shop-page-action--grouping',
      toggleShoppingGroupBy,
    );

    if (bar instanceof HTMLElement) {
      if (active) bar.style.setProperty('display', 'inline-flex', 'important');
      else bar.style.removeProperty('display');
    }

    [referenceButton, groupingButton].forEach((button) => {
      if (button instanceof HTMLButtonElement && button.hidden === active) button.hidden = !active;
    });

    if (referenceButton instanceof HTMLButtonElement) {
      const visible = readReferenceVisibility();
      if (referenceButton.dataset.iconReady !== 'true') {
        referenceButton.innerHTML = referenceIcon;
        referenceButton.dataset.iconReady = 'true';
      }
      referenceButton.setAttribute('aria-pressed', visible ? 'true' : 'false');
      referenceButton.setAttribute(
        'aria-label',
        visible ? 'Recipe names shown. Click to hide recipe names.' : 'Recipe names hidden. Click to show recipe names.',
      );
      referenceButton.title = visible ? 'Recipe names: Shown' : 'Recipe names: Hidden';
    }

    if (groupingButton instanceof HTMLButtonElement) {
      const groupBy = normalizeGroupBy(readShoppingSettings().groupBy);
      const next = nextGroupBy(groupBy);
      if (groupingButton.dataset.groupBy !== groupBy) {
        groupingButton.dataset.groupBy = groupBy;
        groupingButton.innerHTML = groupBy === 'store' ? storeIcon : categoryIcon;
      }
      groupingButton.setAttribute('aria-pressed', groupBy === 'store' ? 'true' : 'false');
      groupingButton.setAttribute(
        'aria-label',
        `Shopping list grouped by ${groupBy}. Click to group by ${next}.`,
      );
      groupingButton.title = `Group by: ${groupBy === 'store' ? 'Store' : 'Category'}`;
    }
  };

  function scheduleShopChrome() {
    if (chromeScheduled) return;
    chromeScheduled = true;
    global.requestAnimationFrame(() => {
      chromeScheduled = false;
      syncShopChrome();
    });
  }

  const start = () => {
    syncCanonicalKitchenLabels();
    scheduleShopChrome();
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest('#primary-nav [data-shop-tab="true"]')) {
        writeShopActive(global.localStorage, true);
        scheduleShopChrome();
        return;
      }
      if (target.closest('#primary-nav .view-toggle__button:not([data-shop-tab="true"])')) {
        writeShopActive(global.localStorage, false);
        scheduleShopChrome();
      }
    }, true);
    global.addEventListener('blissful-kitchen-inventory-change', syncCanonicalKitchenLabels);
    global.addEventListener('storage', (event) => {
      if ([STORAGE_KEY, RECIPE_REFERENCE_STORAGE_KEY, SHOPPING_SETTINGS_STORAGE_KEY].includes(event.key)) {
        scheduleShopChrome();
      }
    });
    const observer = new MutationObserver((records) => {
      const relevant = records.some((record) => {
        if (record.type === 'childList') return record.addedNodes.length > 0;
        const target = record.target;
        return target === document.body
          || (target instanceof HTMLElement && ['shop-view', 'page-action-bar'].includes(target.id));
      });
      if (relevant) scheduleShopChrome();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden'],
    });
    global.requestAnimationFrame(restore);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
