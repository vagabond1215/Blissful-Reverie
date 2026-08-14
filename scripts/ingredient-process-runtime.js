;(function (global) {
  const core = global.BlissfulInventoryUnits || (typeof require === 'function' ? require('./inventory-units-core.js') : {});
  const APP_STATE_KEY = 'blissful-app-state';
  const PROFILE_KEY = core.PROFILE_STORAGE_KEY || 'blissful-inventory-unit-profiles';
  const USAGE_KEY = 'blissful-pantry-usage';
  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const bySlug = new Map(ingredients.filter((item) => item?.slug).map((item) => [String(item.slug), item]));

  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const clean = (value) => String(value || '').trim();
  const formatNumber = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return '';
    if (Math.abs(number - Math.round(number)) < 1e-8) return String(Math.round(number));
    return String(Math.round(number * 100) / 100);
  };
  const readJson = (key, fallback) => {
    try { const raw = global.localStorage?.getItem?.(key); return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  };
  const writeJson = (key, value) => {
    try { global.localStorage?.setItem?.(key, JSON.stringify(value)); return true; } catch (error) { return false; }
  };
  const getState = () => {
    const state = readJson(APP_STATE_KEY, {});
    return isRecord(state) ? state : {};
  };
  const getInventory = () => {
    const inventory = getState().pantryInventory;
    return isRecord(inventory) ? inventory : {};
  };
  const getProfiles = () => core.normalizeProfiles?.(readJson(PROFILE_KEY, {})) || {};
  const ingredientName = (slug) => clean(bySlug.get(slug)?.name) || slug;
  const formatAmount = ({ quantity, unit } = {}) => `${formatNumber(quantity)} ${core.normalizeUnit?.(unit) || clean(unit)}`.trim();

  const commitInventory = (inventory) => {
    const state = getState();
    state.pantryInventory = isRecord(inventory) ? inventory : {};
    writeJson(APP_STATE_KEY, state);
    if (typeof global.BlissfulApp?.applyStarterState === 'function') {
      try { global.BlissfulApp.applyStarterState(state); } catch (error) {}
    }
    global.dispatchEvent?.(new CustomEvent('blissful-inventory-change', { detail: { inventory: state.pantryInventory } }));
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

  const describeFailure = (result) => {
    if (!result) return 'Unable to make this item.';
    if (result.reason === 'insufficient-stock') {
      const failed = result.failed || {};
      return `Not enough ${ingredientName(failed.slug)} in Pantry.`;
    }
    if (result.reason === 'incompatible-existing-unit' || result.reason === 'incompatible-unit') {
      return 'A Pantry unit cannot be converted yet. Set its Units & purchasing profile first.';
    }
    return 'Unable to make this item with the current Pantry quantities.';
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

    const inputHeading = document.createElement('strong');
    inputHeading.textContent = 'Uses';
    const inputs = document.createElement('ul');
    inputs.className = 'ingredient-process__inputs';
    process.inputs.forEach((input) => {
      const li = document.createElement('li');
      li.textContent = `${formatAmount(input)} ${ingredientName(input.slug)}`;
      inputs.appendChild(li);
    });

    const steps = document.createElement('ol');
    steps.className = 'ingredient-process__steps';
    (process.instructions || []).forEach((instruction) => {
      const li = document.createElement('li');
      li.textContent = instruction;
      steps.appendChild(li);
    });

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ingredient-process__make';
    button.textContent = 'Make from Pantry';

    const status = document.createElement('p');
    status.className = 'ingredient-process__status';
    status.setAttribute('aria-live', 'polite');

    button.addEventListener('click', () => {
      const result = core.executeProcess?.({
        inventory: getInventory(),
        process,
        profiles: getProfiles(),
      });
      if (!result?.ok) {
        status.textContent = describeFailure(result);
        return;
      }
      recordUsage(result.consumed);
      commitInventory(result.inventory);
      status.textContent = `Made ${formatAmount(process.output)} ${ingredientName(process.output.slug)}.`;
    });

    article.append(title, yieldText, inputHeading, inputs);
    if (steps.childElementCount) article.appendChild(steps);
    article.append(button, status);
    return article;
  };

  const enhanceCard = (card, processesByOutput) => {
    if (!(card instanceof HTMLElement) || card.querySelector(':scope > .ingredient-processes')) return;
    const slug = clean(card.dataset.pantrySlug || card.dataset.shoppingSlug);
    const matches = processesByOutput.get(slug) || [];
    if (!slug || !matches.length) return;
    const details = document.createElement('details');
    details.className = 'ingredient-processes';
    const summary = document.createElement('summary');
    summary.textContent = matches.length === 1 ? 'Make this ingredient' : `Make this ingredient (${matches.length})`;
    const body = document.createElement('div');
    body.className = 'ingredient-processes__body';
    matches.forEach((process) => body.appendChild(renderProcess(process)));
    details.append(summary, body);
    card.appendChild(details);
  };

  const buildProcessIndex = (processes) => {
    const map = new Map();
    (Array.isArray(processes) ? processes : []).forEach((process) => {
      const slug = clean(process?.output?.slug);
      if (!slug) return;
      if (!map.has(slug)) map.set(slug, []);
      map.get(slug).push(process);
    });
    return map;
  };

  const api = { buildProcessIndex, describeFailure };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulIngredientProcesses = Object.assign({}, global.BlissfulIngredientProcesses || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;
  const sync = () => {
    const processes = Array.isArray(global.BLISSFUL_INGREDIENT_PROCESSES) ? global.BLISSFUL_INGREDIENT_PROCESSES : [];
    if (!processes.length) return false;
    const index = buildProcessIndex(processes);
    document.querySelectorAll('#pantry-grid .pantry-card').forEach((card) => enhanceCard(card, index));
    return true;
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
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    global.addEventListener('blissful-inventory-change', schedule);
    let tries = 0;
    const retry = () => {
      tries += 1;
      if (!sync() && tries < 60) global.requestAnimationFrame(retry);
    };
    global.requestAnimationFrame(retry);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
