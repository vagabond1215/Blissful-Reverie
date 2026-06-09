;(function () {
  if (typeof document === 'undefined') {
    return;
  }

  const applyStyles = () => {
    if (document.getElementById('productivity-settings-styles')) return;
    const style = document.createElement('style');
    style.id = 'productivity-settings-styles';
    style.textContent = `
      .productivity-settings-advanced {
        display: grid;
        gap: 0.65rem;
        border: 1px solid var(--border-1);
        border-radius: 1rem;
        padding: 0.65rem 0.75rem;
        background: var(--surface-0);
      }

      .productivity-settings-advanced__summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        color: var(--text);
        cursor: pointer;
        font-weight: 800;
        list-style: none;
      }

      .productivity-settings-advanced__summary::-webkit-details-marker {
        display: none;
      }

      .productivity-settings-advanced__summary::after {
        content: '⌄';
        color: var(--text-muted);
        font-size: 0.95rem;
      }

      .productivity-settings-advanced[open] .productivity-settings-advanced__summary::after {
        content: '⌃';
      }

      .productivity-settings-advanced__body {
        display: grid;
        gap: 0.85rem;
        padding-top: 0.65rem;
      }

      .productivity-settings-advanced__description {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.82rem;
        line-height: 1.35;
      }
    `;
    document.head.appendChild(style);
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

    applyStyles();

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
