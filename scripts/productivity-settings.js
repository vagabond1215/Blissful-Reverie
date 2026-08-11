;(function () {
  if (typeof document === 'undefined') {
    return;
  }

  const ensureStylesheet = (href) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  const ensureBaseThemeStylesheet = () => {
    ensureStylesheet('styles/base-theme.css');
  };

  const ensureMealPlanSleekStylesheet = () => {
    ensureStylesheet('styles/meal-plan-sleek.css');
  };

  const ensureTopbarDockedStylesheet = () => {
    ensureStylesheet('styles/topbar-docked.css');
  };

  const ensureVisualResetStylesheets = () => {
    ensureBaseThemeStylesheet();
    ensureMealPlanSleekStylesheet();
    ensureTopbarDockedStylesheet();
  };

  const ensureProductivityStylesheet = () => {
    ensureStylesheet('styles/productivity.css');
  };

  const ensureMealPlanAffordanceAssets = () => {
    ensureStylesheet('styles/meal-plan-affordance.css');
    if (document.querySelector('script[src="scripts/meal-plan-affordance-copy.js"]')) return;
    const script = document.createElement('script');
    script.src = 'scripts/meal-plan-affordance-copy.js';
    script.defer = true;
    (document.body || document.head).appendChild(script);
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
    ensureMealPlanAffordanceAssets();
    if (simplifySettings()) {
      ensureVisualResetStylesheets();
      return;
    }
    window.requestAnimationFrame(() => {
      simplifySettings();
      ensureVisualResetStylesheets();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
