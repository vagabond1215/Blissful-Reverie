;(function (global) {
  const PANEL_SELECTOR = '.productivity-shopping[data-shopping-recommendation-scope="meal-plan"]';
  const TITLE = 'Missing or Low Meal Plan Ingredients';
  const COPY_RESET_MS = 1800;

  const parseAllowedSlugs = (value) => {
    try {
      const parsed = JSON.parse(String(value || '[]'));
      return new Set(Array.isArray(parsed) ? parsed.map((slug) => String(slug || '').trim()).filter(Boolean) : []);
    } catch (error) {
      return new Set();
    }
  };

  const shouldKeepManagedRow = ({ slug, restockOnly }, allowedSlugs) => {
    if (!restockOnly) return true;
    return allowedSlugs instanceof Set && allowedSlugs.has(String(slug || '').trim());
  };

  const api = { parseAllowedSlugs, shouldKeepManagedRow };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulMealPlanShoppingRefine = Object.assign({}, global.BlissfulMealPlanShoppingRefine || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;
  const feedbackTimers = new WeakMap();

  const getVisibleRows = (panel) => Array.from(panel.querySelectorAll('.productivity-shopping__item'))
    .filter((row) => row instanceof HTMLElement && !row.hidden && row.isConnected);

  const removeLegacySourceChrome = (panel) => {
    panel.querySelector('.productivity-shopping__source-pill')?.remove();
    panel.querySelector('.productivity-shopping__subtitle')?.remove();
    panel.querySelector('.productivity-shopping__mode-note')?.remove();
    panel.querySelector('.shopping-management__summary')?.remove();
    panel.querySelectorAll('.productivity-shopping__source-control').forEach((control) => {
      if (control.classList.contains('shopping-management__grouping')) return;
      if (control.classList.contains('productivity-shopping__reference-control')) return;
      if (control.querySelector('input[value="meal-plan"], input[value="closest"]')) control.remove();
    });
  };

  const filterRecommendations = (panel) => {
    const allowed = parseAllowedSlugs(panel.dataset.shoppingRecommendationSlugs);
    panel.querySelectorAll('.shopping-management__item').forEach((row) => {
      if (!(row instanceof HTMLElement)) return;
      const keep = shouldKeepManagedRow({
        slug: row.dataset.shoppingSlug,
        restockOnly: row.dataset.shoppingRestockOnly === 'true',
      }, allowed);
      if (!keep) row.remove();
    });
    panel.querySelectorAll('.productivity-shopping__category').forEach((category) => {
      if (!category.querySelector('.productivity-shopping__item')) category.remove();
    });
  };

  const syncEmptyState = (panel) => {
    const rows = getVisibleRows(panel);
    let empty = panel.querySelector('.productivity-shopping__empty');
    if (rows.length) {
      empty?.remove();
      return;
    }
    if (!(empty instanceof HTMLElement)) {
      empty = document.createElement('p');
      empty.className = 'productivity-shopping__empty';
      panel.appendChild(empty);
    }
    empty.textContent = 'No missing or low meal plan ingredients.';
  };

  const refinePanel = (panel) => {
    if (!(panel instanceof HTMLElement)) return;
    const title = panel.querySelector('.productivity-shopping__title');
    if (title) title.textContent = TITLE;
    panel.setAttribute('aria-label', TITLE);
    removeLegacySourceChrome(panel);
    filterRecommendations(panel);
    syncEmptyState(panel);
    const copy = panel.querySelector('.productivity-shopping__copy');
    if (copy instanceof HTMLButtonElement) copy.disabled = getVisibleRows(panel).length === 0;
  };

  const refineAll = () => document.querySelectorAll(PANEL_SELECTOR).forEach(refinePanel);

  const buildVisibleShoppingText = (panel) => {
    const lines = [TITLE];
    panel.querySelectorAll('.productivity-shopping__category').forEach((category) => {
      const rows = Array.from(category.querySelectorAll('.productivity-shopping__item')).filter((row) => row.isConnected && !row.hidden);
      if (!rows.length) return;
      const heading = category.querySelector('.productivity-shopping__category-title')?.textContent?.trim() || 'Items';
      lines.push('', heading);
      rows.forEach((row) => {
        const parts = [];
        const name = row.querySelector('.productivity-shopping__item-name')?.textContent?.trim();
        const purchase = row.querySelector('.shopping-management__purchase')?.textContent?.trim();
        const store = row.querySelector('.shopping-management__store')?.textContent?.trim();
        const noteNode = row.querySelector('.productivity-shopping__item-note');
        const note = noteNode instanceof HTMLElement && !noteNode.hidden ? noteNode.textContent?.trim() : '';
        if (name) parts.push(name);
        if (purchase) parts.push(purchase);
        if (store) parts.push(store);
        if (note) parts.push(note);
        if (parts.length) lines.push(`- ${parts.join(' — ')}`);
      });
    });
    return lines.length > 1 ? lines.join('\n') : 'No missing or low meal plan ingredients.';
  };

  const copyText = async (text) => {
    try {
      if (!global.navigator?.clipboard?.writeText) throw new Error('Clipboard unavailable');
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
      try { copied = Boolean(document.execCommand('copy')); } catch (fallbackError) { copied = false; }
      textarea.remove();
      return copied;
    }
  };

  const setFeedback = (button, panel, success) => {
    const status = panel.querySelector('.productivity-shopping__copy-status');
    button.textContent = success ? 'Copied' : 'Copy failed';
    if (status) status.textContent = success ? 'Shopping list copied.' : 'Copy failed.';
    const prior = feedbackTimers.get(button);
    if (prior) global.clearTimeout(prior);
    feedbackTimers.set(button, global.setTimeout(() => {
      button.textContent = 'Copy list';
      if (status) status.textContent = '';
      feedbackTimers.delete(button);
    }, COPY_RESET_MS));
  };

  const bindCopy = () => {
    document.addEventListener('click', async (event) => {
      const button = event.target instanceof Element ? event.target.closest('.productivity-shopping__copy') : null;
      if (!(button instanceof HTMLButtonElement)) return;
      const panel = button.closest(PANEL_SELECTOR);
      if (!(panel instanceof HTMLElement)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      refinePanel(panel);
      if (button.disabled) return;
      setFeedback(button, panel, await copyText(buildVisibleShoppingText(panel)));
    }, true);
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      refineAll();
    });
  };

  const start = () => {
    bindCopy();
    refineAll();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    global.addEventListener('storage', schedule);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);