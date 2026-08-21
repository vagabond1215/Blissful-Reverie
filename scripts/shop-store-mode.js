;(function (global) {
  const SETTINGS_STORAGE_KEY = 'blissful-shopping-settings';
  const PANEL_SELECTOR = '#shop-shopping-host .productivity-shopping[data-shopping-recommendation-scope="meal-plan"]';

  const groupItemsByCategory = (items) => {
    const groups = new Map();
    (Array.isArray(items) ? items : []).forEach((item) => {
      const category = String(item?.category || 'Other').trim() || 'Other';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(item);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, categoryItems]) => ({
        category,
        items: categoryItems.slice().sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''))),
      }));
  };

  const api = { groupItemsByCategory };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulShopStoreMode = Object.assign({}, global.BlissfulShopStoreMode || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;

  const readStoreMode = () => {
    try {
      const settings = JSON.parse(global.localStorage?.getItem?.(SETTINGS_STORAGE_KEY) || '{}');
      return settings?.groupBy === 'store';
    } catch (error) {
      return false;
    }
  };

  const ingredientBySlug = () => new Map(
    (Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [])
      .filter((ingredient) => ingredient?.slug)
      .map((ingredient) => [ingredient.slug, ingredient]),
  );

  const ingredientByName = () => new Map(
    (Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [])
      .filter((ingredient) => ingredient?.name)
      .map((ingredient) => [String(ingredient.name).trim().toLowerCase(), ingredient]),
  );

  const getRowCategory = (row, bySlug, byName) => {
    const slug = String(row?.dataset?.shoppingSlug || '').trim();
    const named = row?.querySelector?.('.productivity-shopping__item-name')?.textContent?.trim().toLowerCase();
    return String(bySlug.get(slug)?.category || byName.get(named)?.category || 'Other').trim() || 'Other';
  };

  const getCategoryIcon = (category) => {
    const helper = global.BlissfulShopListOutline?.getCategoryIcon;
    return typeof helper === 'function' ? helper(category, 'category') : '•';
  };

  const decorateStoreSection = (storeSection, bySlug, byName) => {
    if (!(storeSection instanceof HTMLElement)) return;
    storeSection.classList.add('shop-store-section');
    const directList = Array.from(storeSection.children).find((child) => (
      child instanceof HTMLElement && child.classList.contains('productivity-shopping__list')
    ));
    if (!(directList instanceof HTMLElement)) return;

    const items = Array.from(directList.children)
      .filter((row) => row instanceof HTMLElement && row.classList.contains('productivity-shopping__item'))
      .map((row) => ({
        row,
        name: row.querySelector('.productivity-shopping__item-name')?.textContent?.trim() || '',
        category: getRowCategory(row, bySlug, byName),
      }));
    if (!items.length) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'shop-store-categories';
    groupItemsByCategory(items).forEach((group) => {
      const section = document.createElement('section');
      section.className = 'shop-store-category';
      const title = document.createElement('h5');
      title.className = 'shop-store-category__title';
      title.dataset.categoryIcon = getCategoryIcon(group.category);
      title.textContent = group.category;
      const list = document.createElement('ul');
      list.className = 'productivity-shopping__list shop-store-category__list';
      group.items.forEach((item) => list.appendChild(item.row));
      section.append(title, list);
      wrapper.appendChild(section);
    });
    directList.replaceWith(wrapper);
  };

  const sync = () => {
    if (!readStoreMode()) return;
    const bySlug = ingredientBySlug();
    const byName = ingredientByName();
    document.querySelectorAll(PANEL_SELECTOR).forEach((panel) => {
      panel.querySelectorAll(':scope .productivity-shopping__categories > .productivity-shopping__category')
        .forEach((section) => decorateStoreSection(section, bySlug, byName));
    });
  };

  const restoreClickedCoreTab = (event) => {
    const tab = event.target instanceof Element
      ? event.target.closest('#primary-nav .view-toggle__button:not([data-shop-tab="true"])')
      : null;
    if (!(tab instanceof HTMLButtonElement)) return;
    const nav = tab.closest('#primary-nav');
    if (!(nav instanceof HTMLElement)) return;

    // Shop is an overlay over the core router. When Shop was opened from the same
    // core view the user clicks next, the router sees no state change and skips its
    // normal render. Shop has already cleared every core tab's active chrome, so
    // restore the clicked tab synchronously before the bubble-phase router runs.
    nav.querySelectorAll('.view-toggle__button').forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const selected = button === tab;
      button.classList.toggle('view-toggle__button--active', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
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
    document.addEventListener('click', restoreClickedCoreTab, true);
    const observer = new MutationObserver((records) => {
      if (records.some((record) => record.type === 'childList' && record.addedNodes.length)) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    global.addEventListener('storage', (event) => {
      if (event.key === SETTINGS_STORAGE_KEY) schedule();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
