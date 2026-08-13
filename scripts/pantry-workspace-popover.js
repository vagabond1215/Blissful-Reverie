;(function () {
  if (typeof document === 'undefined') return;
  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest('#pantry-workspace-overflow') : null;
    if (!(trigger instanceof HTMLButtonElement)) return;
    const bar = document.getElementById('page-action-bar');
    if (!(bar instanceof HTMLElement)) return;
    event.preventDefault();
    bar.setAttribute('popover', 'auto');
    if (typeof bar.togglePopover === 'function') bar.togglePopover();
  });
  document.addEventListener('click', (event) => {
    const nav = event.target instanceof Element ? event.target.closest('[data-view-target]') : null;
    if (!nav) return;
    const bar = document.getElementById('page-action-bar');
    if (!(bar instanceof HTMLElement) || !bar.hasAttribute('popover')) return;
    if (typeof bar.hidePopover === 'function') {
      try { bar.hidePopover(); } catch (error) {}
    }
    bar.removeAttribute('popover');
  });
})();
