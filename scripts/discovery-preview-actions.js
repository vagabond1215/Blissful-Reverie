;(function (global) {
  const getRecipeIdFromPreviewButton = (button) => {
    const card = button?.closest?.('.meal-card--preview[data-recipe-id]');
    return String(card?.dataset?.recipeId || '').trim();
  };

  const api = { getRecipeIdFromPreviewButton };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulDiscoveryPreviewActions = Object.assign({}, global.BlissfulDiscoveryPreviewActions || {}, api);
  if (typeof document === 'undefined') return;

  const findLiveScheduleButton = (recipeId) => {
    const id = String(recipeId || '').trim();
    if (!id) return null;
    return Array.from(document.querySelectorAll('#meal-grid .meal-card[data-recipe-id]'))
      .find((card) => card instanceof HTMLElement && card.dataset.recipeId === id)
      ?.querySelector('.meal-card__schedule-button') || null;
  };

  const enablePreviewScheduleButtons = () => {
    document.querySelectorAll('#recipe-preview-dialog .meal-card--preview .meal-card__schedule-button').forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      button.style.setProperty('pointer-events', 'auto', 'important');
      button.style.setProperty('cursor', 'pointer', 'important');
    });
  };

  const forwardPlanAndShop = (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('#recipe-preview-dialog .meal-card__schedule-button')
      : null;
    if (!(button instanceof HTMLButtonElement)) return;
    const recipeId = getRecipeIdFromPreviewButton(button);
    const liveButton = findLiveScheduleButton(recipeId);
    if (!(liveButton instanceof HTMLButtonElement)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const scrollX = Number(global.scrollX) || 0;
    const scrollY = Number(global.scrollY) || 0;
    const close = document.querySelector('#recipe-preview-dialog [data-recipe-preview-close]');
    if (close instanceof HTMLElement) close.click();

    global.requestAnimationFrame(() => {
      if (typeof global.scrollTo === 'function') global.scrollTo(scrollX, scrollY);
      liveButton.click();
    });
  };

  const start = () => {
    enablePreviewScheduleButtons();
    document.addEventListener('click', forwardPlanAndShop, true);
    const observer = new MutationObserver(() => enablePreviewScheduleButtons());
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
