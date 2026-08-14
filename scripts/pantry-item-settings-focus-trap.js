;(function () {
  if (typeof document === 'undefined') return;

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  const getOpenDialog = () => {
    const root = document.getElementById('pantry-item-settings-dialog');
    return root instanceof HTMLElement && !root.hidden ? root : null;
  };

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const root = getOpenDialog();
    if (!root) return;
    const panel = root.querySelector('.pantry-item-settings__panel');
    if (!(panel instanceof HTMLElement)) return;
    const focusable = Array.from(panel.querySelectorAll(focusableSelector)).filter((node) => (
      node instanceof HTMLElement
      && !node.hidden
      && node.getAttribute('aria-hidden') !== 'true'
      && node.getClientRects().length > 0
    ));
    if (!focusable.length) {
      event.preventDefault();
      panel.focus?.();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  });
})();
