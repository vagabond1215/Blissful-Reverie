(function () {
  if (typeof document === 'undefined') {
    return;
  }

  if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production') {
    return;
  }

  const targets = ['.recipe-card', '.filter-category', '.panel', '.meal-card'];
  targets.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.backgroundColor === cs.borderTopColor) {
        console.warn('[Theme] Same-color adjacency:', el);
      }
    });
  });
})();
