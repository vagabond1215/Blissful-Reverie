;(function () {
  if (typeof document === 'undefined') return;
  let queued = false;

  const apply = () => {
    queued = false;
    document.querySelectorAll('#pantry-grid .pantry-category__list').forEach((list) => {
      if (!(list instanceof HTMLElement)) return;
      list.style.setProperty('padding-top', '0', 'important');
      list.style.setProperty('padding-bottom', '0', 'important');
    });
    document.querySelectorAll('#pantry-grid .pantry-card--compact.pantry-card').forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      card.style.setProperty('grid-template-rows', '26px auto', 'important');
      card.style.setProperty('min-height', '26px', 'important');
      card.style.setProperty('padding', '0 3px', 'important');
      card.style.setProperty('row-gap', '0', 'important');
      card.style.setProperty('align-content', 'start', 'important');
      const title = card.querySelector('.pantry-card__name');
      if (title instanceof HTMLElement) {
        title.style.setProperty('line-height', '1', 'important');
        title.style.setProperty('padding-block', '0', 'important');
        title.style.setProperty('margin-block', '0', 'important');
      }
    });
    document.querySelectorAll('#pantry-grid .pantry-row-tags').forEach((row) => {
      if (!(row instanceof HTMLElement)) return;
      row.style.setProperty('margin', row.hidden ? '0' : '0 0 2px', 'important');
      row.style.setProperty('padding', '0', 'important');
    });
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  };

  const start = () => {
    apply();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
