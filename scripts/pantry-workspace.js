;(function (global) {
  const limits = { categories: 12, tags: 5, allergens: 5 };
  const configs = [
    ['categories', 'ingredient-section', 'ingredient-options', 'ingredient-summary', 'Categories'],
    ['tags', 'tag-section', 'tag-options', 'tag-summary', 'Tags'],
    ['allergens', 'allergy-section', 'allergy-options', 'allergy-summary', 'Allergens'],
  ];
  const normalize = (value) => String(value || '').trim().toLowerCase();
  const countOptions = (items, mode) => {
    const counts = {};
    (Array.isArray(items) ? items : []).forEach((item) => {
      const values = mode === 'categories' ? [item?.category] : (Array.isArray(item?.tags) ? item.tags : []);
      new Set(values.map((value) => String(value || '').trim()).filter(Boolean)).forEach((value) => {
        if (mode === 'tags' && /(contains|free)/i.test(value)) return;
        if (mode === 'allergens' && !/(contains|free)/i.test(value)) return;
        const key = normalize(value);
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    return counts;
  };
  const visibleIndexes = (options, limit, expanded) => {
    if (expanded) return options.map((_, index) => index);
    const shown = new Set(options.slice(0, limit).map((_, index) => index));
    options.forEach((option, index) => { if (option.selected) shown.add(index); });
    return [...shown].sort((a, b) => a - b);
  };
  const api = { limits, normalize, countOptions, visibleIndexes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulPantryWorkspace = Object.assign({}, global.BlissfulPantryWorkspace || {}, api);
  if (typeof document === 'undefined') return;

  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const counts = Object.fromEntries(['categories', 'tags', 'allergens'].map((key) => [key, countOptions(ingredients, key)]));
  let queued = false;
  const isActive = () => {
    const view = document.getElementById('pantry-view');
    return view instanceof HTMLElement && !view.hidden;
  };
  const forward = (id) => {
    const button = document.getElementById(id);
    if (button instanceof HTMLButtonElement) button.click();
  };
  const enhanceFilter = ([key, sectionId, optionsId, summaryId, title]) => {
    const section = document.getElementById(sectionId);
    const container = document.getElementById(optionsId);
    const summary = document.getElementById(summaryId);
    if (!(section instanceof HTMLDetailsElement) || !(container instanceof HTMLElement) || !(summary instanceof HTMLElement)) return;
    section.classList.add('pantry-workspace__filter-card');
    summary.dataset.pantryTitle = title;
    if (key !== 'categories') summary.textContent = title;
    const labels = Array.from(container.querySelectorAll(':scope > .checkbox-option')).filter((node) => node instanceof HTMLElement);
    const options = labels.map((label) => {
      const input = label.querySelector('input[type="checkbox"]');
      return { label, value: input instanceof HTMLInputElement ? input.value : '', selected: input instanceof HTMLInputElement && input.checked };
    });
    const expanded = section.dataset.showAll === 'true';
    const shown = new Set(visibleIndexes(options, limits[key], expanded));
    options.forEach((option, index) => {
      option.label.classList.add('pantry-workspace__filter-option');
      option.label.hidden = !shown.has(index);
      let count = option.label.querySelector('.pantry-workspace__filter-count');
      if (!count) {
        count = document.createElement('span');
        count.className = 'pantry-workspace__filter-count';
        option.label.appendChild(count);
      }
      count.textContent = `(${counts[key][normalize(option.value)] || 0})`;
    });
    let more = section.querySelector(':scope > .pantry-workspace__show-more');
    if (labels.length > limits[key]) {
      if (!(more instanceof HTMLButtonElement)) {
        more = document.createElement('button');
        more.type = 'button';
        more.className = 'pantry-workspace__show-more';
        more.addEventListener('click', () => {
          section.dataset.showAll = section.dataset.showAll === 'true' ? 'false' : 'true';
          enhanceFilter([key, sectionId, optionsId, summaryId, title]);
        });
        section.appendChild(more);
      }
      more.textContent = expanded ? 'Show less ︿' : 'Show more ﹀';
      more.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    } else if (more) more.hidden = true;
  };
  const ensureAllButton = () => {
    const summary = document.getElementById('ingredient-summary');
    if (!(summary instanceof HTMLElement) || summary.querySelector('.pantry-workspace__all-button')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pantry-workspace__all-button';
    button.textContent = 'All';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const inputs = Array.from(document.querySelectorAll('#ingredient-options input[type="checkbox"]:checked'));
      inputs.forEach((input, index) => {
        if (!(input instanceof HTMLInputElement)) return;
        input.checked = false;
        if (index === inputs.length - 1) input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    summary.appendChild(button);
  };
  const ensureHeader = () => {
    const header = document.querySelector('#pantry-view > .pantry-view__header');
    if (!(header instanceof HTMLElement)) return;
    header.classList.add('pantry-workspace__header');
    if (header.querySelector('.pantry-workspace__header-actions')) return;
    const actions = document.createElement('div');
    actions.className = 'pantry-workspace__header-actions';
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'pantry-workspace__add-item';
    add.textContent = '+  Add Item';
    add.addEventListener('click', () => forward('pantry-restock-button'));
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'pantry-workspace__overflow';
    more.textContent = '⋮';
    more.setAttribute('aria-label', 'Open Pantry lists');
    more.addEventListener('click', () => forward('pantry-lists-action'));
    actions.append(add, more);
    header.appendChild(actions);
  };
  const sync = () => {
    queued = false;
    const active = isActive();
    document.documentElement.classList.toggle('pantry-workspace-active', active);
    if (!active) return;
    ensureHeader();
    configs.forEach(enhanceFilter);
    ensureAllButton();
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    global.requestAnimationFrame(sync);
  };
  const start = () => {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    schedule();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
