(function () {
  const isDev =
    (typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production') ||
    (typeof process === 'undefined' && typeof document !== 'undefined');

  if (!isDev) return;

  const checkAdjacency = (sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor;
      const border = cs.borderTopColor;
      if (bg === border) {
        console.warn('[Theme] Same-color adjacency:', el);
      }
    });
  };

  checkAdjacency('.card, .recipe-card, .panel, .filter-category, .meal-card, .filter-section');
})();
