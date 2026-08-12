;(function (global) {
  const STORAGE_KEY = 'blissful-shopping-recipe-references';
  const STORAGE_SHOW = 'show';
  const STORAGE_HIDE = 'hide';
  const COPY_RESET_DELAY_MS = 2200;
  const PANEL_SELECTOR = '.productivity-shopping';
  const CONTROL_SELECTOR = '.productivity-shopping__reference-control';

  const parseStoredPreference = (value) => {
    if (value === STORAGE_SHOW || value === 'true') return true;
    if (value === STORAGE_HIDE || value === 'false') return false;
    return null;
  };

  const resolveReferenceVisibility = (preference, recipeNames) => {
    if (typeof preference === 'boolean') return preference;
    const uniqueNames = new Set(
      Array.from(recipeNames || [])
        .map((name) => String(name || '').trim())
        .filter(Boolean),
    );
    return uniqueNames.size > 1;
  };

  const buildShoppingText = (groups, showReferences) => {
    const normalizedGroups = Array.isArray(groups) ? groups : [];
    const itemCount = normalizedGroups.reduce(
      (count, group) => count + (Array.isArray(group?.items) ? group.items.length : 0),
      0,
    );
    if (!itemCount) return 'No missing ingredients yet.';

    const lines = ['Blissful Reverie shopping list'];
    normalizedGroups.forEach((group) => {
      const items = Array.isArray(group?.items) ? group.items : [];
      if (!items.length) return;
      lines.push('', String(group.category || 'Other'));
      items.forEach((item) => {
        const recipes = Array.isArray(item?.recipes)
          ? item.recipes.map((name) => String(name || '').trim()).filter(Boolean)
          : [];
        const recipeNote = showReferences && recipes.length
          ? ` — for ${recipes.slice(0, 3).join(', ')}`
          : '';
        lines.push(`- ${String(item?.name || '').trim()}${recipeNote}`);
      });
    });
    return lines.join('\n');
  };

  const api = {
    parseStoredPreference,
    resolveReferenceVisibility,
    buildShoppingText,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document === 'undefined') {
    return;
  }

  let savedPreference = null;
  const copyFeedbackTimers = new WeakMap();

  const readPreference = () => {
    try {
      return parseStoredPreference(global.localStorage?.getItem?.(STORAGE_KEY));
    } catch (error) {
      return null;
    }
  };

  const writePreference = (value) => {
    savedPreference = Boolean(value);
    try {
      global.localStorage?.setItem?.(STORAGE_KEY, savedPreference ? STORAGE_SHOW : STORAGE_HIDE);
    } catch (error) {
      // Keep the preference for this page session when local storage is unavailable.
    }
  };

  const getRecipeNamesFromPanel = (panel) => {
    const names = new Set();
    panel.querySelectorAll('.productivity-shopping__item-note').forEach((note) => {
      const title = String(note.getAttribute('title') || '').trim();
      if (title) {
        title.split(',').forEach((name) => {
          const normalized = name.trim();
          if (normalized) names.add(normalized);
        });
        return;
      }
      const text = String(note.textContent || '').replace(/^For\s+/i, '').replace(/\s+\+\d+$/, '').trim();
      if (text) {
        text.split(',').forEach((name) => {
          const normalized = name.trim();
          if (normalized) names.add(normalized);
        });
      }
    });
    return names;
  };

  const getRecipesFromNote = (note) => {
    const title = String(note?.getAttribute?.('title') || '').trim();
    if (title) {
      return title.split(',').map((name) => name.trim()).filter(Boolean);
    }
    const text = String(note?.textContent || '').replace(/^For\s+/i, '').replace(/\s+\+\d+$/, '').trim();
    return text ? text.split(',').map((name) => name.trim()).filter(Boolean) : [];
  };

  const getShoppingGroupsFromPanel = (panel) => Array.from(
    panel.querySelectorAll('.productivity-shopping__category'),
  ).map((category) => ({
    category: category.querySelector('.productivity-shopping__category-title')?.textContent?.trim() || 'Other',
    items: Array.from(category.querySelectorAll('.productivity-shopping__item')).map((row) => ({
      name: row.querySelector('.productivity-shopping__item-name')?.textContent?.trim() || '',
      recipes: getRecipesFromNote(row.querySelector('.productivity-shopping__item-note')),
    })).filter((item) => item.name),
  })).filter((group) => group.items.length);

  const setCopyFeedback = (button, status, message, state) => {
    button.dataset.state = state;
    button.textContent = state === 'error' ? 'Copy failed' : 'Copied';
    if (status) {
      status.textContent = message;
      status.dataset.state = state;
    }

    const existingTimer = copyFeedbackTimers.get(button);
    if (existingTimer) global.clearTimeout(existingTimer);
    const timer = global.setTimeout(() => {
      button.textContent = 'Copy list';
      button.dataset.state = 'idle';
      if (status) {
        status.textContent = '';
        status.dataset.state = 'idle';
      }
      copyFeedbackTimers.delete(button);
    }, COPY_RESET_DELAY_MS);
    copyFeedbackTimers.set(button, timer);
  };

  const copyText = async (text) => {
    try {
      if (!global.navigator?.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await global.navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      let copied = false;
      try {
        copied = Boolean(document.execCommand('copy'));
      } catch (fallbackError) {
        copied = false;
      }
      textarea.remove();
      return copied;
    }
  };

  const updateReferenceControl = (panel, visible, autoVisible) => {
    let fieldset = panel.querySelector(CONTROL_SELECTOR);
    if (!fieldset) {
      fieldset = document.createElement('fieldset');
      fieldset.className = 'productivity-shopping__source-control productivity-shopping__reference-control';

      const legend = document.createElement('legend');
      legend.className = 'productivity-shopping__source-legend';
      legend.textContent = 'References';
      fieldset.appendChild(legend);

      const label = document.createElement('label');
      label.className = 'productivity-shopping__source-option productivity-shopping__reference-option';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'productivity-shopping__reference-input';
      input.addEventListener('change', () => {
        writePreference(input.checked);
        document.querySelectorAll(PANEL_SELECTOR).forEach(enhancePanel);
      });

      const text = document.createElement('span');
      text.className = 'productivity-shopping__source-text';
      const name = document.createElement('span');
      name.className = 'productivity-shopping__source-name';
      name.textContent = 'Show recipe names';
      const detail = document.createElement('span');
      detail.className = 'productivity-shopping__source-detail productivity-shopping__reference-detail';
      text.appendChild(name);
      text.appendChild(detail);

      label.appendChild(input);
      label.appendChild(text);
      fieldset.appendChild(label);

      const sourceControl = panel.querySelector('.productivity-shopping__source-control:not(.productivity-shopping__reference-control)');
      if (sourceControl) {
        sourceControl.insertAdjacentElement('afterend', fieldset);
      } else {
        panel.insertBefore(fieldset, panel.querySelector('.productivity-shopping__categories, .productivity-shopping__empty'));
      }
    }

    const input = fieldset.querySelector('.productivity-shopping__reference-input');
    const option = fieldset.querySelector('.productivity-shopping__reference-option');
    const detail = fieldset.querySelector('.productivity-shopping__reference-detail');
    if (input) input.checked = visible;
    option?.classList.toggle('productivity-shopping__source-option--active', visible);
    if (detail) {
      detail.textContent = savedPreference === null
        ? (autoVisible ? 'Automatic · multiple recipes' : 'Automatic · single recipe')
        : 'Saved preference';
    }
  };

  const patchCopyButton = (panel, visible) => {
    const button = panel.querySelector('.productivity-shopping__copy');
    if (!(button instanceof HTMLButtonElement)) return;
    button.dataset.recipeReferences = visible ? 'shown' : 'hidden';
    if (button.dataset.referenceCopyPatched === 'true') return;
    button.dataset.referenceCopyPatched = 'true';

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (button.disabled) return;

      const currentPanel = button.closest(PANEL_SELECTOR);
      if (!currentPanel) return;
      const showReferences = currentPanel.dataset.recipeReferences === 'shown';
      const groups = getShoppingGroupsFromPanel(currentPanel);
      const status = currentPanel.querySelector('.productivity-shopping__copy-status');
      const copied = await copyText(buildShoppingText(groups, showReferences));
      if (copied) {
        setCopyFeedback(button, status, 'Shopping list copied.', 'success');
      } else {
        setCopyFeedback(button, status, 'Copy failed. Select the list manually.', 'error');
      }
    }, true);
  };

  function enhancePanel(panel) {
    if (!(panel instanceof HTMLElement)) return;
    const recipeNames = getRecipeNamesFromPanel(panel);
    const autoVisible = resolveReferenceVisibility(null, recipeNames);
    const visible = resolveReferenceVisibility(savedPreference, recipeNames);
    panel.dataset.recipeReferences = visible ? 'shown' : 'hidden';

    panel.querySelectorAll('.productivity-shopping__item-note').forEach((note) => {
      note.hidden = !visible;
    });

    updateReferenceControl(panel, visible, autoVisible);
    patchCopyButton(panel, visible);
  }

  const enhanceWithin = (root) => {
    if (root instanceof Element && root.matches(PANEL_SELECTOR)) {
      enhancePanel(root);
    }
    root.querySelectorAll?.(PANEL_SELECTOR).forEach(enhancePanel);
  };

  const start = () => {
    savedPreference = readPreference();
    enhanceWithin(document);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) enhanceWithin(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
