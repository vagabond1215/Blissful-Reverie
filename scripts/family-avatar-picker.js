;(function (global) {
  const DIALOG_ID = 'family-avatar-picker-dialog';

  const getInitials = (name) => {
    const helper = global.BlissfulFamilyRedesign?.getInitials;
    if (typeof helper === 'function') return helper(name);
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const normalizeAvatarOptions = (options, name = '') => (
    Array.from(options || []).map((option, index) => {
      const value = String(option?.value ?? '');
      const optionLabel = String(option?.label || option?.text || option?.textContent || '').trim();
      const initials = getInitials(name);
      const isInitials = index === 0 || value === '';
      return {
        index,
        value,
        kind: isInitials ? 'initials' : 'icon',
        glyph: isInitials ? initials : (value || optionLabel || '?'),
        label: isInitials ? `Initials (${initials})` : (optionLabel || `Avatar ${index}`),
      };
    })
  );

  const api = { normalizeAvatarOptions };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulFamilyAvatarPicker = Object.assign({}, global.BlissfulFamilyAvatarPicker || {}, api);
  if (typeof document === 'undefined') return;

  let previousFocus = null;
  let currentAvatarButton = null;
  let currentSelect = null;

  const dispatchFamilyValue = (control) => {
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const syncAvatarButton = (button, option) => {
    if (!(button instanceof HTMLButtonElement) || !option) return;
    button.textContent = option.glyph;
    button.classList.toggle('family-member-card__avatar-button--initials', option.kind === 'initials');
    button.setAttribute('aria-label', `Change family member avatar. Current: ${option.label}`);
    button.title = 'Change avatar';
  };

  const getFocusable = (root) => Array.from(
    root.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
  ).filter((node) => node instanceof HTMLElement && !node.hidden);

  const closePicker = () => {
    const root = document.getElementById(DIALOG_ID);
    if (!(root instanceof HTMLElement) || root.hidden) return;
    root.hidden = true;
    document.body.classList.remove('family-avatar-picker-open');
    currentAvatarButton = null;
    currentSelect = null;
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
    previousFocus = null;
  };

  const handleDialogKeydown = (event) => {
    const root = document.getElementById(DIALOG_ID);
    if (!(root instanceof HTMLElement) || root.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closePicker();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = getFocusable(root);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const ensureDialog = () => {
    let root = document.getElementById(DIALOG_ID);
    if (root) return root;
    root = document.createElement('div');
    root.id = DIALOG_ID;
    root.className = 'family-avatar-picker';
    root.hidden = true;
    root.innerHTML = `
      <div class="family-avatar-picker__backdrop" data-avatar-picker-close></div>
      <section class="family-avatar-picker__panel" role="dialog" aria-modal="true" aria-labelledby="family-avatar-picker-title">
        <header class="family-avatar-picker__header">
          <div>
            <p class="family-avatar-picker__eyebrow">Family avatar</p>
            <h2 id="family-avatar-picker-title">Choose an avatar</h2>
          </div>
          <button type="button" class="family-avatar-picker__close" data-avatar-picker-close aria-label="Close avatar picker">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>
          </button>
        </header>
        <p class="family-avatar-picker__hint">Pick initials or any available icon.</p>
        <div class="family-avatar-picker__grid" id="family-avatar-picker-grid" role="listbox" aria-label="Avatar choices"></div>
      </section>`;
    document.body.appendChild(root);
    root.querySelectorAll('[data-avatar-picker-close]').forEach((node) => node.addEventListener('click', closePicker));
    root.addEventListener('keydown', handleDialogKeydown);
    return root;
  };

  const renderOptions = (select, name) => {
    const root = ensureDialog();
    const grid = root.querySelector('#family-avatar-picker-grid');
    if (!(grid instanceof HTMLElement)) return [];
    const options = normalizeAvatarOptions(Array.from(select.options), name);
    grid.innerHTML = '';
    options.forEach((option) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'family-avatar-picker__option';
      tile.dataset.avatarIndex = String(option.index);
      tile.dataset.avatarKind = option.kind;
      tile.setAttribute('role', 'option');
      tile.setAttribute('aria-selected', option.index === select.selectedIndex ? 'true' : 'false');
      tile.setAttribute('aria-label', option.label);
      tile.title = option.label;
      if (option.index === select.selectedIndex) tile.classList.add('family-avatar-picker__option--selected');

      const glyph = document.createElement('span');
      glyph.className = 'family-avatar-picker__glyph';
      glyph.textContent = option.glyph;
      const label = document.createElement('span');
      label.className = 'family-avatar-picker__option-label';
      label.textContent = option.kind === 'initials' ? 'Initials' : option.label;
      tile.append(glyph, label);

      tile.addEventListener('click', () => {
        if (!(currentSelect instanceof HTMLSelectElement)) return;
        currentSelect.selectedIndex = option.index;
        dispatchFamilyValue(currentSelect);
        syncAvatarButton(currentAvatarButton, option);
        closePicker();
      });
      grid.appendChild(tile);
    });
    return options;
  };

  const openPicker = (button) => {
    const card = button.closest('.family-member-card');
    const select = card?.querySelector('select[data-family-field="icon"]');
    const nameInput = card?.querySelector('input[data-family-field="name"]');
    if (!(select instanceof HTMLSelectElement)) return false;
    const root = ensureDialog();
    previousFocus = button;
    currentAvatarButton = button;
    currentSelect = select;
    renderOptions(select, nameInput?.value || '');
    root.hidden = false;
    document.body.classList.add('family-avatar-picker-open');
    global.requestAnimationFrame(() => {
      const selected = root.querySelector('.family-avatar-picker__option--selected');
      const first = root.querySelector('.family-avatar-picker__option');
      (selected instanceof HTMLElement ? selected : first)?.focus();
    });
    return true;
  };

  const enhanceAvatarButtons = () => {
    document.querySelectorAll('.family-member-card__avatar-button').forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', DIALOG_ID);
      button.title = 'Change avatar';
    });
  };

  const start = () => {
    ensureDialog();
    enhanceAvatarButtons();
    document.addEventListener('click', (event) => {
      const button = event.target instanceof Element
        ? event.target.closest('.family-member-card__avatar-button')
        : null;
      if (!(button instanceof HTMLButtonElement)) return;
      event.preventDefault();
      event.stopPropagation();
      openPicker(button);
    }, true);
    const observer = new MutationObserver(enhanceAvatarButtons);
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
