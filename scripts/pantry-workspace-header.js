;(function () {
  if (typeof document === 'undefined') return;
  let queued = false;
  const sync = () => {
    queued = false;
    const view = document.getElementById('pantry-view');
    const active = view instanceof HTMLElement && !view.hidden;
    document.documentElement.classList.toggle('pantry-workspace-active', active);
    if (!active) return;
    const header = document.querySelector('#pantry-view > .pantry-view__header');
    if (!(header instanceof HTMLElement)) return;
    header.classList.add('pantry-workspace__header');
    if (header.querySelector('.pantry-workspace__header-actions')) return;
    const actions = document.createElement('div');
    actions.className = 'pantry-workspace__header-actions';
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'pantry-workspace__add-item';
    add.textContent = '+  Add Item';
    add.addEventListener('click', () => document.getElementById('pantry-restock-button')?.click());
    const more = document.createElement('button');
    more.type = 'button';
    more.id = 'pantry-workspace-overflow';
    more.className = 'pantry-workspace__overflow';
    more.textContent = '⋮';
    more.setAttribute('aria-label', 'More Pantry actions');
    more.setAttribute('aria-expanded', 'false');
    actions.append(add, more);
    header.appendChild(actions);
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sync);
  };
  const start = () => {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    schedule();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
