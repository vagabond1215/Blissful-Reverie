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
  let activeMemberId = '';
  let returnFocus = null;

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
    const card = document.querySelector(`#family-member-list .family-member-card[data-family-id="${CSS.escape(memberId)}"]`);
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

  const ensurePicker = () => {
    let root = document.getElementById('family-dislikes-chip-picker');
    if (root instanceof HTMLElement) return root;
    root = document.createElement('div');
    root.id = 'family-dislikes-chip-picker';
    root.className = 'family-dislikes-chip-picker';
    root.hidden = true;
    root.innerHTML = `
      <div class="family-dislikes-chip-picker__backdrop" data-dislikes-chip-close></div>
      <section class="family-dislikes-chip-picker__panel" role="dialog" aria-modal="true" aria-labelledby="family-dislikes-chip-picker-title">
        <header class="family-dislikes-chip-picker__header">
          <div>
            <h2 id="family-dislikes-chip-picker-title">Dislikes</h2>
            <p>Click ingredients to toggle them on or off.</p>
          </div>
          <button type="button" class="family-dislikes-chip-picker__close" data-dislikes-chip-close aria-label="Close dislikes">×</button>
        </header>
        <label class="family-dislikes-chip-picker__search">
          <span class="sr-only">Filter ingredients</span>
          <input type="search" id="family-dislikes-chip-search" placeholder="Find an ingredient" autocomplete="off">
        </label>
        <div class="family-dislikes-chip-picker__count" id="family-dislikes-chip-count" aria-live="polite"></div>
        <div class="family-dislikes-chip-picker__matrix" id="family-dislikes-chip-matrix"></div>
      </section>`;
    document.body.appendChild(root);
    root.querySelectorAll('[data-dislikes-chip-close]').forEach((node) => node.addEventListener('click', closePicker));
    root.querySelector('#family-dislikes-chip-search')?.addEventListener('input', renderChoices);
    return root;
  };

  const renderChoices = () => {
    const root = ensurePicker();
    const matrix = root.querySelector('#family-dislikes-chip-matrix');
    const search = root.querySelector('#family-dislikes-chip-search');
    const count = root.querySelector('#family-dislikes-chip-count');
    if (!(matrix instanceof HTMLElement) || !activeMemberId) return;
    const choices = filterIngredientTokens(catalog, search instanceof HTMLInputElement ? search.value : '');
    const selected = new Set(getMemberTokens(activeMemberId).map((token) => `${token.kind}:${token.key}`));
    matrix.replaceChildren();

    choices.forEach((token) => {
      const signature = `${token.kind}:${token.key}`;
      const isSelected = selected.has(signature);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'family-dislikes-chip-picker__chip';
      chip.classList.toggle('family-dislikes-chip-picker__chip--selected', isSelected);
      chip.dataset.dislikeKind = token.kind;
      chip.dataset.dislikeKey = token.key;
      chip.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      chip.setAttribute('aria-label', `${isSelected ? 'Remove' : 'Add'} ${token.label} ${isSelected ? 'from' : 'to'} dislikes`);
      chip.title = `${isSelected ? 'Remove' : 'Add'} ${token.label}${token.category ? ` · ${token.category}` : ''}`;
      chip.textContent = token.label;
      chip.addEventListener('click', () => {
        const next = toggleTokenInState(
          readState(),
          activeMemberId,
          token,
          dislikeApi.normalizeState,
          dislikeApi.normalizeTokenList,
        );
        writeState(next);
        notifyChange(activeMemberId);
        renderChoices();
      });
      matrix.appendChild(chip);
    });

    if (count instanceof HTMLElement) {
      count.textContent = `${choices.length} ingredient${choices.length === 1 ? '' : 's'}`;
    }
  };

  function openPicker(memberId, trigger) {
    const id = String(memberId || '').trim();
    if (!id) return false;
    activeMemberId = id;
    returnFocus = trigger instanceof HTMLElement ? trigger : null;
    const root = ensurePicker();
    const search = root.querySelector('#family-dislikes-chip-search');
    if (search instanceof HTMLInputElement) search.value = '';
    root.hidden = false;
    document.body.classList.add('family-dislikes-picker-open');
    renderChoices();
    if (search instanceof HTMLInputElement) search.focus();
    return true;
  }

  function closePicker() {
    const root = document.getElementById('family-dislikes-chip-picker');
    if (!(root instanceof HTMLElement) || root.hidden) return;
    root.hidden = true;
    document.body.classList.remove('family-dislikes-picker-open');
    activeMemberId = '';
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
    returnFocus = null;
  }

  const handleAdd = (event) => {
    const button = event.target instanceof Element ? event.target.closest('.family-dislikes__add') : null;
    if (!(button instanceof HTMLButtonElement)) return;
    const card = button.closest('.family-member-card[data-family-id]');
    const memberId = String(card?.dataset.familyId || '').trim();
    if (!memberId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openPicker(memberId, button);
  };

  const start = () => {
    ensurePicker();
    document.addEventListener('click', handleAdd, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closePicker();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
