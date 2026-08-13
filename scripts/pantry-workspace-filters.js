;(function (global) {
  if (typeof document === 'undefined') return;
  const core = global.BlissfulPantryWorkspaceCore;
  if (!core) return;
  const configs = [
    ['categories', 'ingredient-section', 'ingredient-options', 'ingredient-summary', 'Categories'],
    ['tags', 'tag-section', 'tag-options', 'tag-summary', 'Tags'],
    ['allergens', 'allergy-section', 'allergy-options', 'allergy-summary', 'Allergens'],
  ];
  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const counts = Object.fromEntries(['categories', 'tags', 'allergens'].map((key) => [key, core.countOptions(ingredients, key)]));
  let queued = false;
  const setText = (node, value) => {
    const next = String(value ?? '');
    if (node && node.textContent !== next) node.textContent = next;
  };
  const pantryActive = () => {
    const view = document.getElementById('pantry-view');
    return view instanceof HTMLElement && !view.hidden;
  };
  const enhance = ([key, sectionId, optionsId, summaryId, title]) => {
    const section = document.getElementById(sectionId);
    const container = document.getElementById(optionsId);
    const summary = document.getElementById(summaryId);
    if (!(section instanceof HTMLDetailsElement) || !(container instanceof HTMLElement) || !(summary instanceof HTMLElement)) return;
    section.classList.add('pantry-workspace__filter-card');
    if (key !== 'categories' && summary.textContent !== title) summary.textContent = title;
    const labels = Array.from(container.querySelectorAll(':scope > .checkbox-option')).filter((node) => node instanceof HTMLElement);
    const options = labels.map((label) => {
      const input = label.querySelector('input[type="checkbox"]');
      return { label, value: input instanceof HTMLInputElement ? input.value : '', selected: input instanceof HTMLInputElement && input.checked };
    });
    const expanded = section.dataset.showAll === 'true';
    const shown = new Set(core.visibleIndexes(options, core.LIMITS[key], expanded));
    options.forEach((option, index) => {
      option.label.classList.add('pantry-workspace__filter-option');
      const hidden = !shown.has(index);
      if (option.label.hidden !== hidden) option.label.hidden = hidden;
      let count = option.label.querySelector('.pantry-workspace__filter-count');
      if (!(count instanceof HTMLElement)) {
        count = document.createElement('span');
        count.className = 'pantry-workspace__filter-count';
        count.setAttribute('aria-hidden', 'true');
        option.label.appendChild(count);
      }
      setText(count, `(${counts[key][core.normalize(option.value)] || 0})`);
    });
    let more = section.querySelector(':scope > .pantry-workspace__show-more');
    if (labels.length > core.LIMITS[key]) {
      if (!(more instanceof HTMLButtonElement)) {
        more = document.createElement('button');
        more.type = 'button';
        more.className = 'pantry-workspace__show-more';
        more.addEventListener('click', () => {
          section.dataset.showAll = section.dataset.showAll === 'true' ? 'false' : 'true';
          enhance([key, sectionId, optionsId, summaryId, title]);
        });
        section.appendChild(more);
      }
      if (more.hidden) more.hidden = false;
      setText(more, expanded ? 'Show less ︿' : 'Show more ﹀');
      more.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    } else if (more instanceof HTMLButtonElement && !more.hidden) more.hidden = true;
  };
  const ensureAll = () => {
    const summary = document.getElementById('ingredient-summary');
    if (!(summary instanceof HTMLElement) || summary.querySelector('.pantry-workspace__all-button')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pantry-workspace__all-button';
    button.textContent = 'All';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      Array.from(document.querySelectorAll('#ingredient-options input[type="checkbox"]:checked')).forEach((input) => {
        if (input instanceof HTMLInputElement) input.click();
      });
    });
    summary.appendChild(button);
  };
  const sync = () => {
    queued = false;
    if (!pantryActive()) return;
    configs.forEach(enhance);
    ensureAll();
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    global.requestAnimationFrame(sync);
  };
  const start = () => {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    schedule();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
