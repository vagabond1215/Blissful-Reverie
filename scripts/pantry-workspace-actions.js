;(function () {
  if (typeof document === 'undefined') return;
  const actions = [
    ['pantry-lists-action', 'Lists'],
    ['pantry-stock-cycle-action', 'Stock'],
    ['pantry-sort-action', 'Sort'],
    ['pantry-favorites-action', 'Favorites'],
    ['pantry-tags-action', 'Tags'],
  ];
  const ensureMenu = () => {
    const host = document.querySelector('.pantry-workspace__header-actions');
    if (!(host instanceof HTMLElement)) return null;
    let menu = host.querySelector('#pantry-workspace-overflow-menu');
    if (menu instanceof HTMLElement) return menu;
    menu = document.createElement('div');
    menu.id = 'pantry-workspace-overflow-menu';
    menu.className = 'pantry-workspace__overflow-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    actions.forEach(([sourceId, fallback]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pantry-workspace__overflow-item';
      button.dataset.sourceAction = sourceId;
      button.dataset.fallbackLabel = fallback;
      button.setAttribute('role', 'menuitem');
      button.addEventListener('click', () => {
        const source = document.getElementById(sourceId);
        if (source instanceof HTMLButtonElement) source.click();
        menu.hidden = true;
        document.getElementById('pantry-workspace-overflow')?.setAttribute('aria-expanded', 'false');
      });
      menu.appendChild(button);
    });
    host.appendChild(menu);
    return menu;
  };
  const syncLabels = () => {
    const menu = ensureMenu();
    if (!(menu instanceof HTMLElement)) return;
    menu.querySelectorAll('.pantry-workspace__overflow-item').forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const source = document.getElementById(button.dataset.sourceAction || '');
      const fallback = button.dataset.fallbackLabel || '';
      button.disabled = !(source instanceof HTMLButtonElement);
      if (!(source instanceof HTMLButtonElement)) {
        button.textContent = fallback;
        return;
      }
      const text = String(source.textContent || '').trim();
      if (button.dataset.sourceAction === 'pantry-stock-cycle-action') button.textContent = `Stock · ${text || 'All'}`;
      else if (button.dataset.sourceAction === 'pantry-sort-action') button.textContent = `Sort · ${source.title || source.getAttribute('aria-label') || text || 'Alphabetical'}`;
      else button.textContent = fallback;
      const pressed = source.getAttribute('aria-pressed');
      if (pressed !== null) button.setAttribute('aria-checked', pressed);
      else button.removeAttribute('aria-checked');
    });
  };
  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest('#pantry-workspace-overflow') : null;
    const menu = ensureMenu();
    if (trigger instanceof HTMLButtonElement && menu instanceof HTMLElement) {
      event.preventDefault();
      event.stopImmediatePropagation();
      menu.hidden = !menu.hidden;
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
      syncLabels();
      return;
    }
    if (menu instanceof HTMLElement && !menu.hidden && !(event.target instanceof Element && event.target.closest('#pantry-workspace-overflow-menu'))) {
      menu.hidden = true;
      document.getElementById('pantry-workspace-overflow')?.setAttribute('aria-expanded', 'false');
    }
  }, true);
  const observer = new MutationObserver(syncLabels);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'hidden'] });
  syncLabels();
})();
