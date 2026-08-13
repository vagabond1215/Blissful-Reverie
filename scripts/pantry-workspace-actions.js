;(function () {
  if (typeof document === 'undefined') return;
  const sources = [
    'scripts/pantry-workspace-popover.js',
    'scripts/pantry-workspace-refine.js',
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
