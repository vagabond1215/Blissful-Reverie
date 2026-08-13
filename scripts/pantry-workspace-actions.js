;(function () {
  if (typeof document === 'undefined') return;
  const src = 'scripts/pantry-workspace-popover.js';
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  (document.body || document.head).appendChild(script);
})();
