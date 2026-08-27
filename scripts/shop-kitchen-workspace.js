;(function (global) {
  const APP_STATE_KEY = 'blissful-app-state';

  const equipmentCatalog = Array.isArray(global.BLISSFUL_EQUIPMENT)
    ? global.BLISSFUL_EQUIPMENT
    : (typeof require === 'function' ? require('../data/equipment.js') : []);
  const GROUP_DEFINITIONS = Object.freeze(
    equipmentCatalog
      .filter((item) => Array.isArray(item?.variants) && item.variants.length)
      .map((item) => Object.freeze({
        key: String(item.token || '').trim(),
        label: String(item.name || item.token || '').trim(),
        aliases: Array.isArray(item.aliases) ? item.aliases.slice() : [],
        legacyIds: Array.from(new Set([
          String(item.token || '').trim(),
          ...(Array.isArray(item.legacyTokens) ? item.legacyTokens : []),
        ].filter(Boolean))),
        variants: item.variants.map((variant) => ({ ...variant })),
      })),
  );

  const normalizeLabel = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const groupMatchesSearch = (group, query) => {
    const normalizedQuery = normalizeLabel(query);
    if (!normalizedQuery) return true;
    const haystack = [
      group?.label,
      ...(Array.isArray(group?.aliases) ? group.aliases : []),
      ...(Array.isArray(group?.variants) ? group.variants.map((variant) => variant?.label) : []),
    ]
      .map(normalizeLabel)
      .filter(Boolean)
      .join(' ');
    return haystack.includes(normalizedQuery);
  };
  const shouldRenderGroup = (group, query, hasOriginals = false) => Boolean(hasOriginals) || groupMatchesSearch(group, query);

  const toInventorySet = (value) => new Set(
    Array.from(value instanceof Set ? value : Array.isArray(value) ? value : [])
      .map((entry) => String(entry || '').trim())
      .filter(Boolean),
  );

  const groupVariantIds = (group) => (Array.isArray(group?.variants) ? group.variants : [])
    .map((variant) => String(variant?.id || '').trim())
    .filter(Boolean);
  const groupLegacyIds = (group) => (Array.isArray(group?.legacyIds) ? group.legacyIds : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean);

  const getGroupSelection = (inventory, group) => {
    const source = toInventorySet(inventory);
    const variantIds = groupVariantIds(group);
    const legacySelected = groupLegacyIds(group).some((id) => source.has(id));
    const selectedIds = legacySelected
      ? variantIds.slice()
      : variantIds.filter((id) => source.has(id));
    return {
      selectedIds,
      selectedCount: selectedIds.length,
      totalCount: variantIds.length,
      checked: variantIds.length > 0 && selectedIds.length === variantIds.length,
      indeterminate: selectedIds.length > 0 && selectedIds.length < variantIds.length,
      legacySelected,
    };
  };

  const setGroupOwned = (inventory, group, owned) => {
    const next = toInventorySet(inventory);
    groupLegacyIds(group).forEach((id) => next.delete(id));
    groupVariantIds(group).forEach((id) => {
      if (owned) next.add(id);
      else next.delete(id);
    });
    return next;
  };

  const setVariantOwned = (inventory, group, variantId, owned) => {
    const next = toInventorySet(inventory);
    const variantIds = groupVariantIds(group);
    const legacyIds = groupLegacyIds(group);
    if (legacyIds.some((id) => next.has(id))) {
      legacyIds.forEach((id) => next.delete(id));
      variantIds.forEach((id) => next.add(id));
    }
    if (owned) next.add(variantId);
    else next.delete(variantId);
    return next;
  };

  const api = {
    GROUP_DEFINITIONS,
    normalizeLabel,
    groupMatchesSearch,
    shouldRenderGroup,
    toInventorySet,
    getGroupSelection,
    setGroupOwned,
    setVariantOwned,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulShopKitchenWorkspace = Object.assign({}, global.BlissfulShopKitchenWorkspace || {}, api);
  if (typeof document === 'undefined') return;

  const openGroups = new Set();
  let shopActive = false;
  let scheduled = false;

  const readAppState = () => {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem?.(APP_STATE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  };

  const readKitchenInventory = () => toInventorySet(readAppState().kitchenInventory);

  const writeKitchenInventory = (inventory) => {
    const state = readAppState();
    state.kitchenInventory = Array.from(toInventorySet(inventory));
    try {
      global.localStorage?.setItem?.(APP_STATE_KEY, JSON.stringify(state));
    } catch (error) {}
    if (typeof global.BlissfulApp?.applyStarterState === 'function') {
      try {
        global.BlissfulApp.applyStarterState(state);
        return;
      } catch (error) {}
    }
    global.dispatchEvent?.(new CustomEvent('blissful-kitchen-inventory-change', {
      detail: { kitchenInventory: state.kitchenInventory },
    }));
    schedule();
  };

  const ensureShopTab = () => {
    const tabs = document.querySelector('#primary-nav .tabs-list') || document.getElementById('primary-nav');
    if (!(tabs instanceof HTMLElement)) return null;
    let button = tabs.querySelector('[data-shop-tab="true"]');
    if (button instanceof HTMLButtonElement) return button;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'view-toggle__button tab';
    button.dataset.shopTab = 'true';
    button.textContent = 'Shop';
    button.setAttribute('aria-label', 'Open shopping list');
    const pantry = tabs.querySelector('[data-view-target="pantry"]');
    if (pantry) pantry.insertAdjacentElement('afterend', button);
    else tabs.appendChild(button);
    button.addEventListener('click', () => activateShop());
    return button;
  };

  const ensureShopView = () => {
    let view = document.getElementById('shop-view');
    if (view instanceof HTMLElement) return view;
    const layout = document.getElementById('app-layout') || document.querySelector('.layout');
    if (!(layout instanceof HTMLElement)) return null;
    view = document.createElement('section');
    view.id = 'shop-view';
    view.className = 'shop-view';
    view.hidden = true;
    view.innerHTML = `
      <header class="shop-view__header">
        <div>
          <h2>Shop</h2>
          <p>Your meal-plan shopping list, separated from recipe discovery.</p>
        </div>
      </header>
      <div class="shop-view__host" id="shop-shopping-host">
        <p class="shop-view__empty" id="shop-view-empty">Building your shopping list…</p>
      </div>`;
    layout.appendChild(view);
    return view;
  };

  const setShopActive = (active) => {
    shopActive = Boolean(active);
    const button = ensureShopTab();
    const view = ensureShopView();
    document.body.classList.toggle('shop-view-active', shopActive);
    if (view) view.hidden = !shopActive;
    if (button) {
      button.classList.toggle('view-toggle__button--active', shopActive);
      if (shopActive) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    if (shopActive) {
      document.querySelectorAll('#primary-nav .view-toggle__button:not([data-shop-tab="true"])').forEach((tab) => {
        tab.classList.remove('view-toggle__button--active');
        tab.removeAttribute('aria-current');
      });
    }
  };

  const homeShoppingPanel = () => {
    const host = document.getElementById('shop-shopping-host');
    if (!(host instanceof HTMLElement)) return false;
    const outside = Array.from(document.querySelectorAll('.productivity-shopping'))
      .find((panel) => panel instanceof HTMLElement && !host.contains(panel));
    if (outside instanceof HTMLElement) {
      host.replaceChildren(outside);
      return true;
    }
    if (host.querySelector('.productivity-shopping')) return true;
    return false;
  };

  function activateShop() {
    ensureShopTab();
    ensureShopView();
    if (!document.querySelector('.productivity-shopping')) {
      const recipes = document.querySelector('#primary-nav [data-view-target="meals"]');
      if (recipes instanceof HTMLButtonElement) recipes.click();
    }
    setShopActive(true);
    homeShoppingPanel();
    schedule();
  }

  const matchingKitchenItems = (list, group) => {
    const token = String(group?.key || '').trim();
    if (!token) return [];
    return Array.from(list.querySelectorAll(':scope > .kitchen-list__item')).filter((item) => {
      const input = item.querySelector('input[data-kitchen-id]');
      return input instanceof HTMLInputElement && input.dataset.kitchenId === token;
    });
  };

  const makeGroupRow = (group, legacyIds) => {
    const effective = { ...group, legacyIds };
    const inventory = readKitchenInventory();
    const selection = getGroupSelection(inventory, effective);
    const row = document.createElement('li');
    row.className = 'kitchen-equipment-group';
    row.dataset.kitchenGroup = group.key;

    const head = document.createElement('div');
    head.className = 'kitchen-equipment-group__head';
    const label = document.createElement('label');
    label.className = 'kitchen-equipment-group__label';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'kitchen-list__checkbox kitchen-equipment-group__checkbox';
    checkbox.dataset.kitchenGroupKey = group.key;
    checkbox.checked = selection.checked;
    checkbox.indeterminate = selection.indeterminate;
    checkbox.setAttribute('aria-label', `${selection.checked ? 'Deselect' : 'Select'} all ${group.label}`);
    const name = document.createElement('span');
    name.className = 'kitchen-list__name kitchen-equipment-group__name';
    name.textContent = group.label;
    const status = document.createElement('span');
    status.className = 'kitchen-equipment-group__status';
    status.textContent = `${selection.selectedCount}/${selection.totalCount}`;
    label.append(checkbox, name, status);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'kitchen-equipment-group__toggle';
    toggle.dataset.kitchenGroupToggle = group.key;
    const childId = `kitchen-equipment-group-${group.key}`;
    toggle.setAttribute('aria-controls', childId);
    toggle.setAttribute('aria-expanded', openGroups.has(group.key) ? 'true' : 'false');
    toggle.setAttribute('aria-label', `${openGroups.has(group.key) ? 'Collapse' : 'Expand'} ${group.label}`);
    toggle.textContent = '⌄';
    head.append(label, toggle);

    const children = document.createElement('div');
    children.id = childId;
    children.className = 'kitchen-equipment-group__children';
    children.hidden = !openGroups.has(group.key);
    const selected = new Set(selection.selectedIds);
    group.variants.forEach((variant) => {
      const childLabel = document.createElement('label');
      childLabel.className = 'kitchen-equipment-group__child';
      const child = document.createElement('input');
      child.type = 'checkbox';
      child.className = 'kitchen-list__checkbox';
      child.dataset.kitchenVariantId = variant.id;
      child.dataset.kitchenVariantGroup = group.key;
      child.checked = selected.has(variant.id);
      const childName = document.createElement('span');
      childName.textContent = variant.label;
      childLabel.append(child, childName);
      children.appendChild(childLabel);
    });

    row.dataset.legacyIds = JSON.stringify(legacyIds);
    row.append(head, children);
    return row;
  };

  const getKitchenRowLabel = (row) => row.querySelector('.kitchen-list__name')?.textContent
    || row.querySelector('.kitchen-equipment-group__name')?.textContent
    || '';

  const insertKitchenGroupRow = (list, row, label) => {
    const target = normalizeLabel(label);
    const before = Array.from(list.children).find((child) => {
      if (!(child instanceof HTMLElement) || child.classList.contains('kitchen-list__empty')) return false;
      const current = normalizeLabel(getKitchenRowLabel(child));
      return Boolean(current) && current.localeCompare(target) > 0;
    });
    if (before) list.insertBefore(row, before);
    else list.appendChild(row);
  };

  const enhanceKitchenGroups = () => {
    const list = document.getElementById('kitchen-list');
    if (!(list instanceof HTMLElement)) return;
    const query = normalizeLabel(readAppState().kitchenFilters?.search || '');
    GROUP_DEFINITIONS.forEach((group) => {
      if (list.querySelector(`:scope > [data-kitchen-group="${group.key}"]`)) return;
      const originals = matchingKitchenItems(list, group);
      if (!originals.length || !groupMatchesSearch(group, query)) return;
      const legacyIds = Array.from(new Set([
        ...groupLegacyIds(group),
        ...originals
          .map((item) => item.querySelector('input[data-kitchen-id]')?.dataset.kitchenId || '')
          .filter(Boolean),
      ]));
      const row = makeGroupRow(group, legacyIds);
      originals[0].insertAdjacentElement('beforebegin', row);
      originals.forEach((item) => item.remove());
    });
    updateKitchenCount(list);
  };

  const effectiveGroupFromRow = (row, key) => {
    const definition = GROUP_DEFINITIONS.find((group) => group.key === key);
    if (!definition) return null;
    let legacyIds = [];
    try { legacyIds = JSON.parse(row?.dataset?.legacyIds || '[]'); } catch (error) {}
    return { ...definition, legacyIds: Array.isArray(legacyIds) ? legacyIds : [] };
  };

  const updateKitchenCount = (list) => {
    const count = document.getElementById('kitchen-count');
    if (!(count instanceof HTMLElement)) return;
    const inventory = readKitchenInventory();
    let selected = 0;
    list.querySelectorAll(':scope > .kitchen-list__item input[data-kitchen-id]').forEach((input) => {
      if (input instanceof HTMLInputElement && input.checked) selected += 1;
    });
    list.querySelectorAll(':scope > .kitchen-equipment-group').forEach((row) => {
      const key = row.dataset.kitchenGroup || '';
      const group = effectiveGroupFromRow(row, key);
      if (!group) return;
      selected += getGroupSelection(inventory, group).selectedCount;
    });
    count.textContent = selected.toLocaleString();
    count.setAttribute('aria-label', `${selected.toLocaleString()} equipment options selected`);
    count.title = `${selected.toLocaleString()} equipment options selected`;
  };

  const handleKitchenChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
    const groupKey = target.dataset.kitchenGroupKey || target.dataset.kitchenVariantGroup;
    if (!groupKey) return;
    const row = target.closest('.kitchen-equipment-group');
    const group = effectiveGroupFromRow(row, groupKey);
    if (!group) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const inventory = readKitchenInventory();
    const next = target.dataset.kitchenGroupKey
      ? setGroupOwned(inventory, group, target.checked)
      : setVariantOwned(inventory, group, target.dataset.kitchenVariantId || '', target.checked);
    writeKitchenInventory(next);
  };

  const handleKitchenToggle = (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('[data-kitchen-group-toggle]')
      : null;
    if (!(button instanceof HTMLButtonElement)) return;
    const key = button.dataset.kitchenGroupToggle || '';
    const row = button.closest('.kitchen-equipment-group');
    const children = row?.querySelector('.kitchen-equipment-group__children');
    if (!(children instanceof HTMLElement)) return;
    const open = !openGroups.has(key);
    if (open) openGroups.add(key);
    else openGroups.delete(key);
    children.hidden = !open;
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} ${row.querySelector('.kitchen-equipment-group__name')?.textContent || 'equipment group'}`);
  };

  const sync = () => {
    ensureShopTab();
    ensureShopView();
    homeShoppingPanel();
    enhanceKitchenGroups();
    if (shopActive) setShopActive(true);
  };

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      sync();
    });
  }

  const start = () => {
    sync();
    document.addEventListener('click', (event) => {
      const normalTab = event.target instanceof Element
        ? event.target.closest('#primary-nav .view-toggle__button:not([data-shop-tab="true"])')
        : null;
      if (normalTab) setShopActive(false);
      handleKitchenToggle(event);
    }, true);
    const kitchenList = document.getElementById('kitchen-list');
    kitchenList?.addEventListener('change', handleKitchenChange, true);
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    global.addEventListener('blissful-kitchen-inventory-change', schedule);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
