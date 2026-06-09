;(function () {
  if (typeof document === 'undefined') {
    return;
  }

  const ensureProductivityStylesheet = () => {
    if (document.querySelector('link[href="styles/productivity.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/productivity.css';
    document.head.appendChild(link);
  };

  const simplifySettings = () => {
    const toolbar = document.getElementById('theme-toolbar');
    if (!toolbar || document.getElementById('productivity-settings-advanced')) {
      return Boolean(toolbar);
    }

    const palette = document.getElementById('theme-palette');
    const paletteGroup = palette?.closest?.('.theme-toolbar__group');
    const holidayGroup = toolbar.querySelector('.theme-toolbar__group--holiday');

    if (!paletteGroup && !holidayGroup) {
      return Boolean(toolbar);
    }

    ensureProductivityStylesheet();

    const advanced = document.createElement('details');
    advanced.className = 'productivity-settings-advanced';
    advanced.id = 'productivity-settings-advanced';

    const summary = document.createElement('summary');
    summary.className = 'productivity-settings-advanced__summary';
    summary.textContent = 'Advanced appearance';
    advanced.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'productivity-settings-advanced__body';

    const description = document.createElement('p');
    description.className = 'productivity-settings-advanced__description';
    description.textContent = 'Customize palettes and automatic holiday themes only when you need deeper visual control.';
    body.appendChild(description);

    const insertionPoint = paletteGroup || holidayGroup;
    toolbar.insertBefore(advanced, insertionPoint);

    // This script runs before app.js initializes, so app.js binds listeners to the moved controls.
    if (paletteGroup) {
      body.appendChild(paletteGroup);
    }
    if (holidayGroup) {
      body.appendChild(holidayGroup);
    }
    advanced.appendChild(body);

    return true;
  };

  const start = () => {
    if (simplifySettings()) return;
    window.requestAnimationFrame(() => simplifySettings());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();