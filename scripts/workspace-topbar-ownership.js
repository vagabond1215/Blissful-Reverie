;(function (global) {
  const VIEW_TARGET_WORKSPACES = Object.freeze({
    meals: 'recipes',
    kitchen: 'kitchen',
    pantry: 'pantry',
    'meal-plan': 'meal-plan',
    family: 'family',
  });

  const ACTION_OWNERS = Object.freeze({
    recipes: Object.freeze([
      { selector: '#recipe-action-chip', forceShow: true },
      { selector: '#recipe-family-filter', forceShow: false },
    ]),
    pantry: Object.freeze([
      { selector: '#pantry-restock-button', forceShow: true },
      { selector: '#pantry-lists-action', forceShow: true },
      { selector: '#pantry-stock-cycle-action', forceShow: true },
      { selector: '#pantry-sort-action', forceShow: true },
      { selector: '#pantry-favorites-action', forceShow: true },
      { selector: '#pantry-tags-action', forceShow: true },
    ]),
    shop: Object.freeze([
      { selector: '#shop-recipe-references-action', forceShow: true },
      { selector: '#shop-group-by-action', forceShow: true },
    ]),
    family: Object.freeze([
      { selector: '#family-manage-action', forceShow: true },
    ]),
  });

  const CHROME_OWNERS = Object.freeze({
    recipes: Object.freeze([
      { selector: '#recipe-topbar-search', forceShow: true },
    ]),
    pantry: Object.freeze([
      { selector: '#pantry-topbar-search', forceShow: true },
    ]),
  });

  const normalizeWorkspace = (value) => {
    const text = String(value || '').trim().toLowerCase();
    if (text === 'meals') return 'recipes';
    if (['recipes', 'kitchen', 'pantry', 'shop', 'meal-plan', 'family'].includes(text)) return text;
    return '';
  };

  const workspaceFromTabDescriptor = (descriptor) => {
    if (!descriptor || typeof descriptor !== 'object') return '';
    if (descriptor.shopTab === true || String(descriptor.shopTab || '') === 'true') return 'shop';
    return VIEW_TARGET_WORKSPACES[String(descriptor.viewTarget || '').trim()] || '';
  };

  const chooseActiveWorkspace = (tabs) => {
    const source = Array.isArray(tabs) ? tabs : [];
    const current = source.find((tab) => tab?.ariaCurrent === 'page')
      || source.find((tab) => tab?.active === true);
    return workspaceFromTabDescriptor(current) || 'recipes';
  };

  const api = {
    VIEW_TARGET_WORKSPACES,
    normalizeWorkspace,
    workspaceFromTabDescriptor,
    chooseActiveWorkspace,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulWorkspaceTopbarOwnership = Object.assign({}, global.BlissfulWorkspaceTopbarOwnership || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;
  let requestedWorkspace = '';
  let lastWorkspace = '';

  const describeTab = (tab) => ({
    shopTab: tab?.dataset?.shopTab === 'true',
    viewTarget: tab?.dataset?.viewTarget || '',
    ariaCurrent: tab?.getAttribute?.('aria-current') || '',
    active: Boolean(tab?.classList?.contains?.('view-toggle__button--active')),
  });

  const workspaceFromTab = (tab) => workspaceFromTabDescriptor(describeTab(tab));

  const selectedWorkspace = () => {
    if (requestedWorkspace) return requestedWorkspace;
    const tabs = Array.from(document.querySelectorAll('#primary-nav .view-toggle__button'));
    return chooseActiveWorkspace(tabs.map(describeTab));
  };

  const setSuppressed = (node, suppressed) => {
    if (!(node instanceof HTMLElement)) return;
    if (suppressed) {
      if (node.dataset.topbarSuppressed !== 'true') node.dataset.topbarSuppressed = 'true';
      return;
    }
    if (node.dataset.topbarSuppressed) delete node.dataset.topbarSuppressed;
  };

  const syncOwnedNodes = (workspace, registry) => {
    Object.entries(registry).forEach(([owner, definitions]) => {
      definitions.forEach(({ selector, forceShow }) => {
        const node = document.querySelector(selector);
        if (!(node instanceof HTMLElement)) return;
        if (node.dataset.topbarOwner !== owner) node.dataset.topbarOwner = owner;
        const owns = owner === workspace;
        setSuppressed(node, !owns);
        if (owns && forceShow && node.hidden) node.hidden = false;
      });
    });
  };

  const syncBar = (workspace) => {
    const bar = document.getElementById('page-action-bar');
    if (!(bar instanceof HTMLElement)) return;
    if (bar.dataset.workspaceOwner !== workspace) bar.dataset.workspaceOwner = workspace;
    const hasActions = ['recipes', 'pantry', 'shop', 'family'].includes(workspace);
    bar.hidden = !hasActions;
    bar.style.setProperty('display', hasActions ? 'inline-flex' : 'none', 'important');
    bar.setAttribute('aria-hidden', hasActions ? 'false' : 'true');
  };

  const syncWorkspaceClasses = (workspace) => {
    const root = document.documentElement;
    if (root.dataset.activeWorkspace !== workspace) root.dataset.activeWorkspace = workspace;
    root.classList.toggle('recipes-view-active', workspace === 'recipes');
    root.classList.toggle('pantry-workspace-active', workspace === 'pantry');
  };

  const sync = (workspaceOverride = '') => {
    scheduled = false;
    const workspace = normalizeWorkspace(workspaceOverride) || selectedWorkspace();
    syncWorkspaceClasses(workspace);
    syncOwnedNodes(workspace, ACTION_OWNERS);
    syncOwnedNodes(workspace, CHROME_OWNERS);
    syncBar(workspace);

    if (workspace !== lastWorkspace) {
      lastWorkspace = workspace;
      global.dispatchEvent?.(new CustomEvent('blissful-workspace-change', { detail: { workspace } }));
    }
    return workspace;
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => sync());
  };

  const handlePrimaryTabClick = (event) => {
    const tab = event.target instanceof Element
      ? event.target.closest('#primary-nav .view-toggle__button')
      : null;
    if (!(tab instanceof HTMLButtonElement)) return;
    const workspace = workspaceFromTab(tab);
    if (!workspace) return;
    requestedWorkspace = workspace;
    sync(workspace);
    global.requestAnimationFrame(() => {
      requestedWorkspace = '';
      schedule();
    });
  };

  const start = () => {
    global.BlissfulWorkspaceTopbarOwnership.getActiveWorkspace = selectedWorkspace;
    global.BlissfulWorkspaceTopbarOwnership.sync = sync;
    document.addEventListener('click', handlePrimaryTabClick, true);
    const observer = new MutationObserver((records) => {
      const relevant = records.some((record) => {
        if (record.type === 'childList') return record.addedNodes.length > 0 || record.removedNodes.length > 0;
        const target = record.target;
        if (!(target instanceof HTMLElement)) return false;
        return target.closest('#primary-nav, #page-action-bar, .topbar__row') !== null
          || target.id === 'recipe-topbar-search'
          || target.id === 'pantry-topbar-search';
      });
      if (relevant) schedule();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-current', 'hidden'],
    });
    sync();
    global.requestAnimationFrame(() => sync());
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
