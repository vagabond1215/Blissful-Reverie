;(function (global) {
  const core = global.BlissfulInventoryUnits
    || (typeof require === 'function' ? require('./inventory-units-core.js') : {});

  const APP_STATE_KEY = 'blissful-app-state';
  const PROFILE_KEY = core.PROFILE_STORAGE_KEY || 'blissful-inventory-unit-profiles';
  const USAGE_KEY = 'blissful-pantry-usage';

  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const clean = (value) => String(value || '').trim();
  const formatNumber = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    if (Math.abs(number - Math.round(number)) < 1e-8) return String(Math.round(number));
    return String(Math.round(number * 1000) / 1000);
  };

  const buildConversionRows = (profile) => {
    if (!profile || typeof core.getSelectableUnits !== 'function' || typeof core.convertQuantity !== 'function') return [];
    const normalized = core.normalizeProfile?.(profile) || profile;
    const stockUnit = core.normalizeUnit?.(normalized.stockUnit) || clean(normalized.stockUnit);
    if (!stockUnit) return [];
    return core.getSelectableUnits(normalized)
      .filter((unit) => unit && unit.group !== 'package' && unit.id !== stockUnit)
      .map((unit) => ({
        unit: unit.id,
        label: unit.label || unit.id,
        quantity: core.convertQuantity(1, stockUnit, unit.id, normalized),
      }))
      .filter((entry) => Number.isFinite(Number(entry.quantity)) && Number(entry.quantity) > 0);
  };

  const processesForSlug = (slug, processes) => (Array.isArray(processes) ? processes : [])
    .filter((process) => clean(process?.output?.slug) === clean(slug));

  const api = { buildConversionRows, processesForSlug };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulPantryItemSettings = Object.assign({}, global.BlissfulPantryItemSettings || {}, api);
  if (typeof document === 'undefined') return;

  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const bySlug = new Map(ingredients.filter((item) => item?.slug).map((item) => [String(item.slug), item]));
  let previousFocus = null;
  let scheduled = false;

  const readJson = (key, fallback) => {
    try {
      const raw = global.localStorage?.getItem?.(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const writeJson = (key, value) => {
    try {
      global.localStorage?.setItem?.(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  };

  const getState = () => {
    const state = readJson(APP_STATE_KEY, {});
    return isRecord(state) ? state : {};
  };

  const getInventory = () => {
    const inventory = getState().pantryInventory;
    return isRecord(inventory) ? inventory : {};
  };

  const getProfiles = () => typeof core.normalizeProfiles === 'function'
    ? core.normalizeProfiles(readJson(PROFILE_KEY, {}))
    : {};

  const profileFor = (slug) => {
    const runtime = global.BlissfulPantryInventoryUnits || {};
    if (typeof runtime.profileFor === 'function') return runtime.profileFor(slug);
    const profiles = getProfiles();
    return core.resolveProfile?.(slug, profiles) || core.normalizeProfile?.({ stockUnit: 'each' }) || { stockUnit: 'each' };
  };

  const getStockUnitOptions = (slug, profile) => {
    const runtime = global.BlissfulPantryInventoryUnits || {};
    if (typeof runtime.getStockUnitOptions === 'function') return runtime.getStockUnitOptions(slug, profile);
    return (core.UNIT_REGISTRY || []).filter((unit) => unit?.group !== 'package');
  };

  const commitInventory = (inventory) => {
    const state = getState();
    state.pantryInventory = isRecord(inventory) ? inventory : {};
    writeJson(APP_STATE_KEY, state);
    if (typeof global.BlissfulApp?.applyStarterState === 'function') {
      try { global.BlissfulApp.applyStarterState(state); } catch (error) {}
    }
    global.dispatchEvent?.(new CustomEvent('blissful-inventory-change', { detail: { inventory: state.pantryInventory } }));
    return state.pantryInventory;
  };

  const recordUsage = (changes) => {
    const append = global.BlissfulShopping?.appendUsageEvent;
    if (typeof append !== 'function' || !Array.isArray(changes) || !changes.length) return;
    let history = readJson(USAGE_KEY, {});
    changes.forEach((change) => {
      history = append(history, {
        slug: change.slug,
        before: change.before,
        after: change.after,
        unit: change.unit,
      });
    });
    writeJson(USAGE_KEY, history);
  };

  const ingredientName = (slug) => clean(bySlug.get(slug)?.name) || slug;
  const formatAmount = ({ quantity, unit } = {}) => `${formatNumber(quantity)} ${core.normalizeUnit?.(unit) || clean(unit)}`.trim();

  const ensureDialog = () => {
    let root = document.getElementById('pantry-item-settings-dialog');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'pantry-item-settings-dialog';
    root.className = 'pantry-item-settings';
    root.hidden = true;
    root.innerHTML = `
      <div class="pantry-item-settings__backdrop" data-pantry-item-settings-close></div>
      <section class="pantry-item-settings__panel" role="dialog" aria-modal="true" aria-labelledby="pantry-item-settings-title">
        <header class="pantry-item-settings__header">
          <h2 id="pantry-item-settings-title">Item settings</h2>
          <button type="button" class="pantry-item-settings__close" data-pantry-item-settings-close aria-label="Close item settings">×</button>
        </header>
        <div class="pantry-item-settings__body" id="pantry-item-settings-body"></div>
      </section>`;
    document.body.appendChild(root);
    root.querySelectorAll('[data-pantry-item-settings-close]').forEach((node) => {
      node.addEventListener('click', () => closeDialog());
    });
    return root;
  };

  const appendStockOptions = (select, slug, profile) => {
    const entries = getStockUnitOptions(slug, profile);
    const labels = { count: 'Count', volume: 'Volume', mass: 'Mass' };
    select.textContent = '';
    ['count', 'volume', 'mass'].forEach((groupName) => {
      const groupEntries = entries.filter((unit) => unit.group === groupName);
      if (!groupEntries.length) return;
      const group = document.createElement('optgroup');
      group.label = labels[groupName] || groupName;
      groupEntries.forEach((unit) => {
        const option = document.createElement('option');
        option.value = unit.id;
        option.textContent = unit.label;
        group.appendChild(option);
      });
      select.appendChild(group);
    });
    select.value = core.normalizeUnit?.(profile.stockUnit) || profile.stockUnit || '';
  };

  const renderConversions = (container, profile) => {
    container.textContent = '';
    const rows = buildConversionRows(profile);
    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'pantry-item-settings__muted';
      empty.textContent = 'No additional automatic conversions are defined for this item yet.';
      container.appendChild(empty);
      return;
    }
    const stockLabel = core.getUnit?.(profile.stockUnit)?.label || profile.stockUnit;
    rows.forEach((row) => {
      const chip = document.createElement('span');
      chip.className = 'pantry-item-settings__conversion';
      chip.textContent = `1 ${stockLabel} = ${formatNumber(row.quantity)} ${row.label}`;
      container.appendChild(chip);
    });
  };

  const renderProcess = (process) => {
    const article = document.createElement('article');
    article.className = 'ingredient-process';
    article.dataset.processId = process.id;

    const title = document.createElement('h4');
    title.className = 'ingredient-process__title';
    title.textContent = process.name;

    const yieldText = document.createElement('p');
    yieldText.className = 'ingredient-process__yield';
    yieldText.textContent = `Makes ${formatAmount(process.output)} ${ingredientName(process.output.slug)}`;

    const inputs = document.createElement('ul');
    inputs.className = 'ingredient-process__inputs';
    process.inputs.forEach((input) => {
      const item = document.createElement('li');
      item.textContent = `${formatAmount(input)} ${ingredientName(input.slug)}`;
      inputs.appendChild(item);
    });

    const steps = document.createElement('ol');
    steps.className = 'ingredient-process__steps';
    (process.instructions || []).forEach((instruction) => {
      const item = document.createElement('li');
      item.textContent = instruction;
      steps.appendChild(item);
    });

    const make = document.createElement('button');
    make.type = 'button';
    make.className = 'ingredient-process__make';
    make.textContent = 'Make from Pantry';

    const status = document.createElement('p');
    status.className = 'ingredient-process__status';
    status.setAttribute('aria-live', 'polite');

    make.addEventListener('click', () => {
      const result = core.executeProcess?.({
        inventory: getInventory(),
        process,
        profiles: getProfiles(),
      });
      if (!result?.ok) {
        if (result?.reason === 'insufficient-stock') {
          status.textContent = `Not enough ${ingredientName(result.failed?.slug)} in Pantry.`;
        } else if (result?.reason === 'incompatible-existing-unit' || result?.reason === 'incompatible-unit') {
          status.textContent = 'A Pantry unit cannot be converted yet. Configure that ingredient first.';
        } else {
          status.textContent = 'Unable to make this item with the current Pantry quantities.';
        }
        return;
      }
      recordUsage(result.consumed);
      commitInventory(result.inventory);
      status.textContent = `Made ${formatAmount(process.output)} ${ingredientName(process.output.slug)}.`;
    });

    article.append(title, yieldText, inputs);
    if (steps.childElementCount) article.appendChild(steps);
    article.append(make, status);
    return article;
  };

  const renderDialog = (slug) => {
    const root = ensureDialog();
    const title = root.querySelector('#pantry-item-settings-title');
    const body = root.querySelector('#pantry-item-settings-body');
    if (!(body instanceof HTMLElement)) return;
    if (title) title.textContent = `${ingredientName(slug)} settings`;
    body.textContent = '';

    let profile = profileFor(slug);

    const unitSection = document.createElement('section');
    unitSection.className = 'pantry-item-settings__section';
    const unitHeading = document.createElement('h3');
    unitHeading.textContent = 'Inventory unit';
    const stockLabel = document.createElement('label');
    stockLabel.className = 'pantry-item-settings__field';
    const stockText = document.createElement('span');
    stockText.textContent = 'Track on hand as';
    const stock = document.createElement('select');
    stock.className = 'pantry-item-settings__select';
    stock.setAttribute('aria-label', `Stock unit for ${ingredientName(slug)}`);
    appendStockOptions(stock, slug, profile);
    stockLabel.append(stockText, stock);
    const stockStatus = document.createElement('p');
    stockStatus.className = 'pantry-item-settings__status';
    stockStatus.setAttribute('aria-live', 'polite');
    unitSection.append(unitHeading, stockLabel, stockStatus);

    const conversionSection = document.createElement('section');
    conversionSection.className = 'pantry-item-settings__section';
    const conversionHeading = document.createElement('h3');
    conversionHeading.textContent = 'Compatible unit conversions';
    const conversionList = document.createElement('div');
    conversionList.className = 'pantry-item-settings__conversions';
    conversionSection.append(conversionHeading, conversionList);

    const refreshProfileDisplay = () => {
      profile = profileFor(slug);
      appendStockOptions(stock, slug, profile);
      renderConversions(conversionList, profile);
    };

    stock.addEventListener('change', () => {
      const runtime = global.BlissfulPantryInventoryUnits || {};
      const result = typeof runtime.changeStockUnit === 'function'
        ? runtime.changeStockUnit(slug, stock.value)
        : { ok: false, reason: 'unavailable' };
      if (!result.ok) {
        stockStatus.textContent = 'That unit cannot be converted from the current Pantry quantity.';
        refreshProfileDisplay();
        return;
      }
      stockStatus.textContent = `Inventory now tracks ${result.profile.stockUnit}.`;
      refreshProfileDisplay();
    });

    body.append(unitSection, conversionSection);

    const processes = processesForSlug(slug, global.BLISSFUL_INGREDIENT_PROCESSES);
    if (processes.length) {
      const processSection = document.createElement('section');
      processSection.className = 'pantry-item-settings__section';
      const heading = document.createElement('h3');
      heading.textContent = 'Make this ingredient';
      const list = document.createElement('div');
      list.className = 'pantry-item-settings__processes';
      processes.forEach((process) => list.appendChild(renderProcess(process)));
      processSection.append(heading, list);
      body.appendChild(processSection);
    }

    refreshProfileDisplay();
  };

  function closeDialog() {
    const root = document.getElementById('pantry-item-settings-dialog');
    if (!(root instanceof HTMLElement) || root.hidden) return;
    root.hidden = true;
    document.documentElement.classList.remove('pantry-item-settings-open');
    const focus = previousFocus;
    previousFocus = null;
    if (focus instanceof HTMLElement && focus.isConnected) focus.focus();
  }

  const openDialog = (slug, trigger) => {
    const root = ensureDialog();
    previousFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
    renderDialog(slug);
    root.hidden = false;
    document.documentElement.classList.add('pantry-item-settings-open');
    root.querySelector('.pantry-item-settings__close')?.focus();
  };

  const enhanceCard = (card) => {
    if (!(card instanceof HTMLElement)) return;
    const slug = clean(card.dataset.pantrySlug || card.dataset.shoppingSlug);
    const select = card.querySelector('.pantry-card__unit-select');
    if (!slug || !(select instanceof HTMLSelectElement)) return;
    let trigger = card.querySelector('.pantry-item-settings__trigger');
    if (!(trigger instanceof HTMLButtonElement)) {
      trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'pantry-item-settings__trigger';
      trigger.textContent = '⚙';
      trigger.setAttribute('aria-haspopup', 'dialog');
      select.insertAdjacentElement('afterend', trigger);
      trigger.addEventListener('click', () => openDialog(slug, trigger));
    }
    trigger.dataset.pantrySlug = slug;
    trigger.setAttribute('aria-label', `Settings for ${ingredientName(slug)}`);
    trigger.title = `Settings for ${ingredientName(slug)}`;
  };

  const sync = () => {
    document.querySelectorAll('#pantry-grid .pantry-card').forEach(enhanceCard);
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
    ensureDialog();
    sync();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    global.addEventListener('blissful-inventory-change', schedule);
    global.addEventListener('blissful-inventory-unit-profile-change', schedule);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDialog();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
