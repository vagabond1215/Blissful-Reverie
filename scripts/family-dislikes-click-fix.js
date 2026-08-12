;(function (global) {
  const STORAGE_KEY = 'blissful-family-dislikes';

  const addTokenToState = (state, memberId, token, normalizeState, normalizeTokenList) => {
    const normalized = normalizeState(state);
    const id = String(memberId || '').trim();
    if (!id) return normalized;
    normalized.members[id] = normalizeTokenList([...(normalized.members[id] || []), token]);
    return normalized;
  };

  const api = { addTokenToState };
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
  const normalizeText = (value) => String(value || '').trim().toLowerCase();
  const getMemberTokens = (memberId) => dislikeApi.normalizeTokenList(readState().members[String(memberId || '')] || []);

  const notifyChange = (memberId) => {
    global.dispatchEvent(new CustomEvent('blissful-family-dislikes-change', { detail: { memberId } }));
    const card = Array.from(document.querySelectorAll('#family-member-list .family-member-card[data-family-id]'))
      .find((node) => node instanceof HTMLElement && node.dataset.familyId === memberId);
    if (card instanceof HTMLElement) {
      card.classList.toggle('family-dislikes-refresh-pulse');
      global.requestAnimationFrame(() => card.classList.toggle('family-dislikes-refresh-pulse'));
    }
  };

  const renderChoices = (root) => {
    const memberId = String(root.dataset.activeMemberId || '').trim();
    if (!memberId) return;
    const list = root.querySelector('#family-dislikes-picker-list');
    const search = root.querySelector('#family-dislikes-picker-search');
    if (!(list instanceof HTMLElement)) return;
    const query = normalizeText(search instanceof HTMLInputElement ? search.value : '');
    const selected = new Set(getMemberTokens(memberId).map((token) => `${token.kind}:${token.key}`));
    list.innerHTML = '';
    ['category', 'ingredient'].forEach((kind) => {
      const choices = catalog.filter((token) => token.kind === kind
        && (!query || (Array.isArray(token.search) ? token.search : [token.label]).some((term) => normalizeText(term).includes(query))));
      if (!choices.length) return;
      const section = document.createElement('section');
      section.className = 'family-dislikes-picker__section';
      const heading = document.createElement('h3');
      heading.textContent = kind === 'category' ? 'Categories' : 'Ingredients';
      section.appendChild(heading);
      choices.slice(0, query ? 100 : 80).forEach((token) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'family-dislikes-picker__choice';
        button.textContent = token.label;
        const signature = `${token.kind}:${token.key}`;
        button.disabled = selected.has(signature);
        if (button.disabled) button.setAttribute('aria-label', `${token.label} already added`);
        button.addEventListener('click', () => {
          const next = addTokenToState(
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
    });
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
    const search = replaceSearchListener(root);
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
