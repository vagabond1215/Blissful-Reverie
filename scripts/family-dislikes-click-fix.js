;(function (global) {
  const STORAGE_KEY = 'blissful-family-dislikes';
  const normalizeText = (value) => String(value || '').trim().toLowerCase();

  const toggleTokenInState = (state, memberId, token, normalizeState, normalizeTokenList) => {
    const normalized = normalizeState(state);
    const id = String(memberId || '').trim();
    if (!id || !token) return normalized;
    const current = normalizeTokenList(normalized.members[id] || []);
    const signature = `${token.kind}:${token.key}`;
    const exists = current.some((entry) => `${entry.kind}:${entry.key}` === signature);
    normalized.members[id] = normalizeTokenList(exists
      ? current.filter((entry) => `${entry.kind}:${entry.key}` !== signature)
      : [...current, token]);
    return normalized;
  };

  const filterIngredientTokens = (catalog, query) => {
    const needle = normalizeText(query);
    return (Array.isArray(catalog) ? catalog : [])
      .filter((token) => token?.kind === 'ingredient')
      .filter((token) => !needle || (Array.isArray(token.search) ? token.search : [token.label])
        .some((term) => normalizeText(term).includes(needle)))
      .sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')));
  };

  const api = { toggleTokenInState, filterIngredientTokens };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulFamilyDislikesClickFix = Object.assign({}, global.BlissfulFamilyDislikesClickFix || {}, api);
  if (typeof document === 'undefined') return;

  const dislikeApi = global.BlissfulFamilyDislikes;
  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  if (!dislikeApi || typeof dislikeApi.buildDislikeCatalog !== 'function') return;
  const catalog = dislikeApi.buildDislikeCatalog(ingredients);

  const readState = () => {
    try {
      return dislikeApi.normalizeState(JSON.parse(global.localStorage?.getItem?.(STORAGE_KEY) || 'null'));
    } catch (error) {
      return dislikeApi.normalizeState(null);
    }
  };

  const writeState = (state) => {
    const normalized = dislikeApi.normalizeState(state);
    try { global.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(normalized)); } catch (error) {}
    return normalized;
  };

  const getMemberTokens = (memberId) => dislikeApi.normalizeTokenList(
    readState().members[String(memberId || '')] || [],
  );

  const syncLegacySummary = (memberId, tokens) => {
    const card = Array.from(document.querySelectorAll('#family-member-list .family-member-card[data-family-id]'))
      .find((node) => node instanceof HTMLElement && node.dataset.familyId === memberId);
    const textarea = card?.querySelector('textarea[data-family-field="preferences"]');
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const next = tokens.length ? `Dislikes: ${tokens.map((token) => token.label).join(', ')}` : '';
    if (textarea.value === next) return;
    textarea.value = next;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const notifyChange = (memberId) => {
    const tokens = getMemberTokens(memberId);
    syncLegacySummary(memberId, tokens);
    global.dispatchEvent(new CustomEvent('blissful-family-dislikes-change', { detail: { memberId } }));
  };

  const styleChoice = (button, selected) => {
    button.style.borderRadius = '999px';
    button.style.textAlign = 'center';
    button.style.width = 'auto';
    button.style.minWidth = '0';
    button.style.paddingInline = '10px';
    button.style.background = selected ? 'var(--accent-1, #2563eb)' : '';
    button.style.borderColor = selected ? 'var(--accent-1, #2563eb)' : '';
    button.style.color = selected ? '#fff' : '';
  };

  const renderChoices = (root) => {
    const memberId = String(root.dataset.activeMemberId || '').trim();
    if (!memberId) return;
    const list = root.querySelector('#family-dislikes-picker-list');
    const search = root.querySelector('#family-dislikes-picker-search');
    if (!(list instanceof HTMLElement)) return;

    const choices = filterIngredientTokens(catalog, search instanceof HTMLInputElement ? search.value : '');
    const selected = new Set(getMemberTokens(memberId).map((token) => `${token.kind}:${token.key}`));
    list.replaceChildren();

    const section = document.createElement('section');
    section.className = 'family-dislikes-picker__section';
    section.style.gridTemplateColumns = 'repeat(auto-fill, minmax(110px, max-content))';
    section.style.alignItems = 'start';

    const heading = document.createElement('h3');
    heading.textContent = `Ingredients · ${choices.length}`;
    section.appendChild(heading);

    choices.forEach((token) => {
      const signature = `${token.kind}:${token.key}`;
      const isSelected = selected.has(signature);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'family-dislikes-picker__choice';
      button.textContent = token.label;
      button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      button.setAttribute('aria-label', `${isSelected ? 'Remove' : 'Add'} ${token.label} ${isSelected ? 'from' : 'to'} dislikes`);
      button.title = `${isSelected ? 'Remove' : 'Add'} ${token.label}${token.category ? ` · ${token.category}` : ''}`;
      styleChoice(button, isSelected);
      button.addEventListener('click', () => {
        const next = toggleTokenInState(
          readState(),
          memberId,
          token,
          dislikeApi.normalizeState,
          dislikeApi.normalizeTokenList,
        );
        writeState(next);
        notifyChange(memberId);
        renderChoices(root);
      });
      section.appendChild(button);
    });

    list.appendChild(section);
  };

  const replaceSearchListener = (root) => {
    const current = root.querySelector('#family-dislikes-picker-search');
    if (!(current instanceof HTMLInputElement)) return null;
    const replacement = current.cloneNode(true);
    current.replaceWith(replacement);
    replacement.value = '';
    replacement.addEventListener('input', () => renderChoices(root));
    return replacement;
  };

  const openFor = (memberId) => {
    const root = document.getElementById('family-dislikes-picker');
    if (!(root instanceof HTMLElement)) return false;
    root.dataset.activeMemberId = memberId;
    const title = root.querySelector('#family-dislikes-picker-title');
    const description = root.querySelector('.family-dislikes-picker__header p');
    if (title) title.textContent = 'Dislikes';
    if (description) description.textContent = 'Click an ingredient to toggle it on or off.';
    const search = replaceSearchListener(root);
    if (search instanceof HTMLInputElement) search.placeholder = 'Find an ingredient';
    root.hidden = false;
    document.body.classList.add('family-dislikes-picker-open');
    renderChoices(root);
    search?.focus();
    return true;
  };

  const handleAdd = (event) => {
    const button = event.target instanceof Element ? event.target.closest('.family-dislikes__add') : null;
    if (!(button instanceof HTMLButtonElement)) return;
    const card = button.closest('.family-member-card[data-family-id]');
    const memberId = String(card?.dataset.familyId || '').trim();
    if (!memberId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openFor(memberId);
  };

  const handleClose = (event) => {
    const close = event.target instanceof Element ? event.target.closest('[data-dislikes-close]') : null;
    if (!close) return;
    const root = document.getElementById('family-dislikes-picker');
    if (root instanceof HTMLElement) delete root.dataset.activeMemberId;
  };

  const start = () => {
    document.addEventListener('click', handleAdd, true);
    document.addEventListener('click', handleClose, true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
