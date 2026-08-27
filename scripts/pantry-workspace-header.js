;(function () {
  if (typeof document === 'undefined') return;
  let queued = false;
  const sync = () => {
    queued = false;
    const view = document.getElementById('pantry-view');
    const kitchenView = document.getElementById('kitchen-view');
    const mealView = document.getElementById('meal-view');
    const active = view instanceof HTMLElement && !view.hidden;
    const standardFilterWorkspaceActive =
      active
      || (kitchenView instanceof HTMLElement && !kitchenView.hidden)
      || (mealView instanceof HTMLElement && !mealView.hidden);
    document.documentElement.classList.toggle('pantry-workspace-active', active);
    document.documentElement.classList.toggle('standard-filter-workspace-active', standardFilterWorkspaceActive);
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
    document.addEventListener('click', (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('.pantry-workspace__add-item')) return;
      document.getElementById('pantry-restock-button')?.click();
    });
    schedule();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
