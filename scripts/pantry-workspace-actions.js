;(function () {
  if (typeof document === 'undefined') return;
  const sources = [
    'scripts/pantry-workspace-popover.js',
    'scripts/pantry-workspace-refine.js',
    'scripts/inventory-units-core.js',
    'data/ingredient-processes.js',
    'scripts/pantry-package-defaults-core.js',
    'scripts/pantry-package-unit-runtime.js',
    'scripts/pantry-package-unit-migration.js',
    'scripts/pantry-inventory-units-runtime.js',
    'scripts/shopping-inventory-units-sync.js',
    'scripts/ingredient-process-runtime.js',
    'scripts/recipe-inventory-runtime.js',
  ];
  const load = (index) => {
    if (index >= sources.length) return;
    const src = sources[index];
    if (document.querySelector(`script[src="${src}"]`)) {
      load(index + 1);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => load(index + 1);
    (document.body || document.head).appendChild(script);
  };
  load(0);
})();
