;(function (global) {
  const SMART_ENTRY_ID = 'pantry-smart-shopping-list-entry';
  let scheduled = false;
  let smartSelected = false;

  const getShoppingItemCount = (root) => (
    root instanceof Element
      ? root.querySelectorAll('.productivity-shopping__item').length
      : 0
  );

  const buildShoppingTextFromPanel = (panel) => {
    if (!(panel instanceof Element)) return 'No shopping items yet.';
    const lines = ['Blissful Reverie shopping list'];
    const categories = Array.from(panel.querySelectorAll('.productivity-shopping__category'));
    if (!categories.length) return 'No shopping items yet.';
    categories.forEach((category) => {
      const title = category.querySelector('.productivity-shopping__category-title')?.textContent?.trim() || 'Items';
      lines.push('', title);
      category.querySelectorAll('.productivity-shopping__item').forEach((item) => {
        const name = item.querySelector('.productivity-shopping__item-name')?.textContent?.trim();
        const note = item.querySelector('.productivity-shopping__item-note')?.textContent?.trim();
        if (name) lines.push(`- ${name}${note ? ` — ${note}` : ''}`);
      });
    });
    return lines.join('\n');
  };

  const api = { getShoppingItemCount, buildShoppingTextFromPanel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulUiPolish = Object.assign({}, global.BlissfulUiPolish || {}, api);
  if (typeof document === 'undefined') return;

  const getLiveShoppingPanel = () => document.getElementById('pantry-smart-shopping')
    || document.querySelector('#productivity-dashboard .productivity-shopping');

  const relocateSmartShopping = () => {
    const pantry = document.getElementById('pantry-view');
    const grid = document.getElementById('pantry-grid');
    const candidate = document.querySelector('#productivity-dashboard .productivity-shopping');
    if (!(pantry instanceof HTMLElement) || !(grid instanceof HTMLElement)) return false;
    if (candidate instanceof HTMLElement) {
      const existing = document.getElementById('pantry-smart-shopping');
      if (existing instanceof HTMLElement && existing !== candidate) existing.remove();
      candidate.id = 'pantry-smart-shopping';
      candidate.classList.add('productivity-shopping--pantry');
      pantry.insertBefore(candidate, grid);
      return true;
    }
    const existing = document.getElementById('pantry-smart-shopping');
    if (existing instanceof HTMLElement && existing.parentElement !== pantry) pantry.insertBefore(existing, grid);
    return existing instanceof HTMLElement;
  };

  const polishListClose = () => {
    const button = document.querySelector('.pantry-lists-dialog__close');
    if (!(button instanceof HTMLButtonElement) || button.dataset.iconPolished === 'true') return;
    button.dataset.iconPolished = 'true';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>';
  };

  const polishFamilyTrash = () => {
    document.querySelectorAll('.family-manage-dialog__trash').forEach((button) => {
      if (!(button instanceof HTMLButtonElement) || button.dataset.iconPolished === 'true') return;
      button.dataset.iconPolished = 'true';
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="m7 7 .8 13h8.4L17 7"></path><path d="M10 11v5M14 11v5"></path></svg>';
    });
  };

  const wireMirrorControls = (mirror) => {
    mirror.querySelectorAll('input[type="radio"]').forEach((input) => {
      if (!(input instanceof HTMLInputElement)) return;
      input.name = 'productivity-shopping-source-lists';
      input.addEventListener('change', () => {
        const live = getLiveShoppingPanel();
        const source = live?.querySelector(`input[type="radio"][value="${input.value}"]`);
        if (source instanceof HTMLInputElement) {
          source.checked = true;
          source.dispatchEvent(new Event('change', { bubbles: true }));
          global.requestAnimationFrame(() => global.requestAnimationFrame(schedule));
        }
      });
    });

    const copy = mirror.querySelector('.productivity-shopping__copy');
    if (copy instanceof HTMLButtonElement) {
      copy.disabled = getShoppingItemCount(mirror) === 0;
      copy.addEventListener('click', async () => {
        const text = buildShoppingTextFromPanel(mirror);
        try {
          await navigator.clipboard.writeText(text);
          copy.textContent = 'Copied';
          global.setTimeout(() => { copy.textContent = 'Copy list'; }, 1600);
        } catch (error) {
          copy.textContent = 'Copy failed';
          global.setTimeout(() => { copy.textContent = 'Copy list'; }, 1600);
        }
      });
    }
  };

  const renderSmartEditor = () => {
    if (!smartSelected) return;
    const editor = document.getElementById('pantry-lists-editor');
    const live = getLiveShoppingPanel();
    if (!(editor instanceof HTMLElement) || !(live instanceof HTMLElement)) return;
    editor.innerHTML = '';
    editor.classList.add('pantry-lists-editor--smart');
    const mirror = live.cloneNode(true);
    mirror.removeAttribute('id');
    mirror.classList.add('productivity-shopping--lists-mirror');
    mirror.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    wireMirrorControls(mirror);
    editor.appendChild(mirror);
  };

  const ensureSmartEntry = () => {
    const dialog = document.getElementById('pantry-lists-dialog');
    const container = document.getElementById('pantry-lists-sidebar-items');
    const live = getLiveShoppingPanel();
    if (!(dialog instanceof HTMLElement) || !(container instanceof HTMLElement) || !(live instanceof HTMLElement)) return false;
    let button = document.getElementById(SMART_ENTRY_ID);
    if (!(button instanceof HTMLButtonElement)) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = SMART_ENTRY_ID;
      button.className = 'pantry-lists-sidebar__item pantry-lists-sidebar__item--smart';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        smartSelected = true;
        container.querySelectorAll('.pantry-lists-sidebar__item').forEach((item) => item.classList.remove('pantry-lists-sidebar__item--active'));
        button.classList.add('pantry-lists-sidebar__item--active');
        renderSmartEditor();
      });
    }
    const count = getShoppingItemCount(live);
    button.innerHTML = '';
    const name = document.createElement('span');
    name.className = 'pantry-lists-sidebar__name';
    name.textContent = 'Smart Shopping';
    const meta = document.createElement('span');
    meta.className = 'pantry-lists-sidebar__count';
    meta.textContent = count.toLocaleString();
    meta.setAttribute('aria-label', `${count.toLocaleString()} live shopping ${count === 1 ? 'item' : 'items'}`);
    button.append(name, meta);
    button.classList.toggle('pantry-lists-sidebar__item--empty', count === 0);
    button.classList.toggle('pantry-lists-sidebar__item--active', smartSelected);
    if (button.parentElement !== container) container.prepend(button);
    else if (container.firstElementChild !== button) container.prepend(button);
    if (smartSelected && !dialog.hidden) renderSmartEditor();
    return true;
  };

  const sync = () => {
    relocateSmartShopping();
    polishListClose();
    polishFamilyTrash();
    ensureSmartEntry();
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
      const realList = event.target instanceof Element
        ? event.target.closest('#pantry-lists-sidebar-items .pantry-lists-sidebar__item:not(#pantry-smart-shopping-list-entry)')
        : null;
      if (realList) {
        smartSelected = false;
        document.getElementById('pantry-lists-editor')?.classList.remove('pantry-lists-editor--smart');
      }
    }, true);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'aria-pressed'] });
    global.addEventListener('storage', schedule);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
