;(function (global) {
  const STORAGE_KEY = 'blissful-family-dislikes';
  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const normalizeText = (value) => String(value || '').trim().toLowerCase();
  const slugify = (value) => normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const normalizeToken = (value) => {
    const source = isRecord(value) ? value : {};
    const kind = source.kind === 'category' ? 'category' : source.kind === 'ingredient' ? 'ingredient' : '';
    const key = String(source.key || '').trim();
    const label = String(source.label || '').trim();
    if (!kind || !key || !label) return null;
    return { kind, key, label };
  };

  const normalizeTokenList = (values) => {
    const seen = new Set();
    const result = [];
    (Array.isArray(values) ? values : []).forEach((value) => {
      const token = normalizeToken(value);
      if (!token) return;
      const signature = `${token.kind}:${token.key}`;
      if (seen.has(signature)) return;
      seen.add(signature);
      result.push(token);
    });
    return result;
  };

  const normalizeState = (value) => {
    const source = isRecord(value) ? value : {};
    const members = {};
    if (isRecord(source.members)) {
      Object.entries(source.members).forEach(([memberId, tokens]) => {
        const key = String(memberId || '').trim();
        if (!key) return;
        members[key] = normalizeTokenList(tokens);
      });
    }
    return { version: 1, members };
  };

  const buildDislikeCatalog = (ingredients) => {
    const list = Array.isArray(ingredients) ? ingredients : [];
    const result = [];
    const categorySeen = new Set();
    list.forEach((ingredient) => {
      const slug = String(ingredient?.slug || '').trim();
      const name = String(ingredient?.name || '').trim();
      if (slug && name) {
        const aliases = Array.isArray(ingredient?.aliases) ? ingredient.aliases : [];
        result.push({
          kind: 'ingredient',
          key: slug,
          label: name,
          category: String(ingredient?.category || '').trim(),
          search: [name, slug, ...aliases].map(normalizeText).filter(Boolean),
        });
      }
      const category = String(ingredient?.category || '').trim();
      const categoryKey = slugify(category);
      if (category && categoryKey && !categorySeen.has(categoryKey)) {
        categorySeen.add(categoryKey);
        result.push({
          kind: 'category',
          key: categoryKey,
          label: category,
          category,
          search: [category].map(normalizeText),
        });
      }
    });
    return result.sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label));
  };

  const recipeConflictsWithTokens = ({ recipeSlugs, tokens, ingredientBySlug } = {}) => {
    const slugs = recipeSlugs instanceof Set ? recipeSlugs : new Set(Array.isArray(recipeSlugs) ? recipeSlugs : []);
    const dislikes = normalizeTokenList(tokens);
    if (!slugs.size || !dislikes.length) return false;
    for (const token of dislikes) {
      if (token.kind === 'ingredient' && slugs.has(token.key)) return true;
      if (token.kind === 'category') {
        for (const slug of slugs) {
          const ingredient = ingredientBySlug instanceof Map ? ingredientBySlug.get(slug) : ingredientBySlug?.[slug];
          if (!ingredient) continue;
          if (slugify(ingredient.category) === token.key) return true;
        }
      }
    }
    return false;
  };

  const api = {
    STORAGE_KEY,
    normalizeToken,
    normalizeTokenList,
    normalizeState,
    buildDislikeCatalog,
    recipeConflictsWithTokens,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulFamilyDislikes = Object.assign({}, global.BlissfulFamilyDislikes || {}, api);
  if (typeof document === 'undefined') return;

  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];
  const recipes = Array.isArray(global.BLISSFUL_RECIPES) ? global.BLISSFUL_RECIPES : [];
  const ingredientBySlug = new Map(ingredients.filter((item) => item?.slug).map((item) => [item.slug, item]));
  const recipeById = new Map(recipes.filter((recipe) => recipe?.id).map((recipe) => [recipe.id, recipe]));
  const recipeByName = new Map(recipes.filter((recipe) => recipe?.name).map((recipe) => [normalizeText(recipe.name), recipe]));
  const catalog = buildDislikeCatalog(ingredients);
  let recipeIngredientSlugs = new Map();
  let activePickerMemberId = '';
  let scheduled = false;
  let backupRetries = 0;

  const readState = () => {
    try {
      return normalizeState(JSON.parse(global.localStorage?.getItem?.(STORAGE_KEY) || 'null'));
    } catch (error) {
      return normalizeState(null);
    }
  };
  const writeState = (state) => {
    const normalized = normalizeState(state);
    try { global.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(normalized)); } catch (error) {}
    return normalized;
  };
  const getMemberTokens = (memberId) => normalizeTokenList(readState().members[String(memberId || '')] || []);
  const setMemberTokens = (memberId, tokens) => {
    const id = String(memberId || '').trim();
    if (!id) return readState();
    const state = readState();
    state.members[id] = normalizeTokenList(tokens);
    const saved = writeState(state);
    global.dispatchEvent(new CustomEvent('blissful-family-dislikes-change', { detail: { memberId: id } }));
    return saved;
  };

  const calculateRecipeIngredients = () => {
    const matching = global.BlissfulMatching || {};
    if (typeof matching.createIngredientMatcherIndex === 'function' && typeof matching.mapRecipesToIngredientMatches === 'function') {
      try {
        const index = matching.createIngredientMatcherIndex(ingredients);
        const mapped = matching.mapRecipesToIngredientMatches(recipes, index);
        if (mapped?.recipeIngredientMatches instanceof Map) {
          recipeIngredientSlugs = mapped.recipeIngredientMatches;
          return;
        }
      } catch (error) {}
    }
    recipeIngredientSlugs = new Map();
    recipes.forEach((recipe) => {
      const serialized = normalizeText(JSON.stringify(recipe?.ingredients || recipe?.ingredientLines || []));
      const set = new Set();
      ingredients.forEach((ingredient) => {
        const terms = [ingredient?.name, ingredient?.slug, ...(Array.isArray(ingredient?.aliases) ? ingredient.aliases : [])]
          .map(normalizeText).filter(Boolean);
        if (terms.some((term) => serialized.includes(term))) set.add(ingredient.slug);
      });
      if (recipe?.id) recipeIngredientSlugs.set(recipe.id, set);
    });
  };

  const getFamilyCards = () => Array.from(document.querySelectorAll('#family-member-list .family-member-card'))
    .filter((card) => card instanceof HTMLElement && card.dataset.familyId);

  const migrateLegacyPreferences = (card) => {
    const memberId = String(card.dataset.familyId || '');
    if (!memberId || getMemberTokens(memberId).length) return;
    const textarea = card.querySelector('textarea[data-family-field="preferences"]');
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const text = String(textarea.value || '').trim();
    if (!/^dislikes\s*:/i.test(text)) return;
    const labels = text.replace(/^dislikes\s*:/i, '').split(/[,;|]/).map((value) => normalizeText(value)).filter(Boolean);
    const tokens = catalog.filter((token) => labels.includes(normalizeText(token.label)));
    if (tokens.length) setMemberTokens(memberId, tokens);
  };

  const syncLegacySummary = (card, tokens) => {
    const textarea = card.querySelector('textarea[data-family-field="preferences"]');
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const next = tokens.length ? `Dislikes: ${tokens.map((token) => token.label).join(', ')}` : '';
    if (textarea.value === next) return;
    textarea.value = next;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const renderMemberTokens = (card) => {
    if (!(card instanceof HTMLElement)) return;
    const memberId = String(card.dataset.familyId || '');
    if (!memberId) return;
    migrateLegacyPreferences(card);
    const textarea = card.querySelector('textarea[data-family-field="preferences"]');
    const field = textarea?.closest('.family-member-card__field');
    if (!(field instanceof HTMLElement) || !(textarea instanceof HTMLTextAreaElement)) return;
    textarea.hidden = true;
    textarea.classList.add('family-dislikes__legacy-input');
    let heading = field.querySelector('.family-dislikes__heading');
    let label = field.querySelector(':scope > span');
    if (!heading) {
      heading = document.createElement('div');
      heading.className = 'family-dislikes__heading';
      if (label) heading.appendChild(label);
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'family-dislikes__add';
      add.textContent = 'Add';
      add.setAttribute('aria-haspopup', 'dialog');
      add.addEventListener('click', () => openPicker(memberId));
      heading.appendChild(add);
      field.insertBefore(heading, field.firstChild);
    }
    label = heading.querySelector('span');
    if (label) label.textContent = 'Dislikes';
    let list = field.querySelector('.family-dislikes__tokens');
    if (!list) {
      list = document.createElement('div');
      list.className = 'family-dislikes__tokens';
      field.appendChild(list);
    }
    const tokens = getMemberTokens(memberId);
    list.innerHTML = '';
    tokens.forEach((token) => {
      const chip = document.createElement('span');
      chip.className = 'family-dislikes__token';
      chip.textContent = token.label;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'family-dislikes__token-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove dislike ${token.label}`);
      remove.addEventListener('click', () => {
        const next = getMemberTokens(memberId).filter((entry) => !(entry.kind === token.kind && entry.key === token.key));
        setMemberTokens(memberId, next);
        renderMemberTokens(card);
        applyRecipeFiltering();
        syncScheduleDialog();
      });
      chip.appendChild(remove);
      list.appendChild(chip);
    });
    if (!tokens.length) {
      const empty = document.createElement('span');
      empty.className = 'family-dislikes__empty';
      empty.textContent = 'None';
      list.appendChild(empty);
    }
    syncLegacySummary(card, tokens);
  };

  const ensurePicker = () => {
    let root = document.getElementById('family-dislikes-picker');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'family-dislikes-picker';
    root.className = 'family-dislikes-picker';
    root.hidden = true;
    root.innerHTML = `
      <div class="family-dislikes-picker__backdrop" data-dislikes-close></div>
      <section class="family-dislikes-picker__panel" role="dialog" aria-modal="true" aria-labelledby="family-dislikes-picker-title">
        <header class="family-dislikes-picker__header">
          <div><h2 id="family-dislikes-picker-title">Add dislike</h2><p>Choose an ingredient or ingredient category.</p></div>
          <button type="button" class="family-dislikes-picker__close" data-dislikes-close aria-label="Close dislike picker">×</button>
        </header>
        <label class="family-dislikes-picker__search"><span class="sr-only">Filter dislike choices</span><input type="search" id="family-dislikes-picker-search" placeholder="Find ingredient or category" autocomplete="off"></label>
        <div class="family-dislikes-picker__list" id="family-dislikes-picker-list"></div>
      </section>`;
    document.body.appendChild(root);
    root.querySelectorAll('[data-dislikes-close]').forEach((node) => node.addEventListener('click', closePicker));
    root.querySelector('#family-dislikes-picker-search')?.addEventListener('input', renderPickerChoices);
    return root;
  };

  const renderPickerChoices = () => {
    const root = ensurePicker();
    const list = root.querySelector('#family-dislikes-picker-list');
    const search = root.querySelector('#family-dislikes-picker-search');
    if (!(list instanceof HTMLElement)) return;
    const query = normalizeText(search instanceof HTMLInputElement ? search.value : '');
    const selected = new Set(getMemberTokens(activePickerMemberId).map((token) => `${token.kind}:${token.key}`));
    list.innerHTML = '';
    ['category', 'ingredient'].forEach((kind) => {
      const choices = catalog.filter((token) => token.kind === kind && (!query || token.search.some((term) => term.includes(query))));
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
          const next = [...getMemberTokens(activePickerMemberId), token];
          setMemberTokens(activePickerMemberId, next);
          getFamilyCards().filter((card) => card.dataset.familyId === activePickerMemberId).forEach(renderMemberTokens);
          renderPickerChoices();
          applyRecipeFiltering();
          syncScheduleDialog();
        });
        section.appendChild(button);
      });
      list.appendChild(section);
    });
  };

  function openPicker(memberId) {
    const root = ensurePicker();
    activePickerMemberId = String(memberId || '');
    const search = root.querySelector('#family-dislikes-picker-search');
    if (search instanceof HTMLInputElement) search.value = '';
    root.hidden = false;
    document.body.classList.add('family-dislikes-picker-open');
    renderPickerChoices();
    if (search instanceof HTMLInputElement) search.focus();
  }
  function closePicker() {
    const root = document.getElementById('family-dislikes-picker');
    if (!(root instanceof HTMLElement)) return;
    root.hidden = true;
    document.body.classList.remove('family-dislikes-picker-open');
    activePickerMemberId = '';
  }

  const getActiveRecipeFamilyMemberIds = () => {
    const cards = getFamilyCards();
    const buttons = Array.from(document.querySelectorAll('#recipe-family-filter .recipe-family-filter__button'));
    const ids = [];
    buttons.forEach((button, index) => {
      if (!(button instanceof HTMLButtonElement) || button.getAttribute('aria-pressed') !== 'true') return;
      const card = cards[index];
      if (card?.dataset.familyId) ids.push(card.dataset.familyId);
    });
    return ids;
  };

  const getCombinedTokens = (memberIds) => normalizeTokenList(
    (Array.isArray(memberIds) ? memberIds : []).flatMap((memberId) => getMemberTokens(memberId)),
  );

  const recipeConflicts = (recipe, tokens) => {
    if (!recipe?.id) return false;
    const slugs = recipeIngredientSlugs.get(recipe.id) || new Set();
    return recipeConflictsWithTokens({ recipeSlugs: slugs, tokens, ingredientBySlug });
  };

  function applyRecipeFiltering() {
    const tokens = getCombinedTokens(getActiveRecipeFamilyMemberIds());
    document.querySelectorAll('#meal-grid .meal-card[data-recipe-id]').forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      const recipe = recipeById.get(String(card.dataset.recipeId || ''));
      const conflict = tokens.length > 0 && recipeConflicts(recipe, tokens);
      card.classList.toggle('meal-card--family-disliked', conflict);
      if (conflict) card.dataset.familyDislikeConflict = 'true';
      else delete card.dataset.familyDislikeConflict;
    });
    global.dispatchEvent(new Event('blissful-family-dislikes-change'));
  }

  const getScheduleSelectedMemberIds = () => Array.from(document.querySelectorAll('.schedule-dialog__member.schedule-dialog__member--active'))
    .map((button) => String(button.dataset.scheduleMember || '').trim()).filter(Boolean);

  function syncScheduleDialog() {
    const recipeLabel = document.getElementById('schedule-dialog-recipe');
    if (!(recipeLabel instanceof HTMLElement)) return;
    const recipe = recipeByName.get(normalizeText(recipeLabel.textContent));
    const selectedIds = getScheduleSelectedMemberIds();
    const tokens = getCombinedTokens(selectedIds);
    const conflict = Boolean(recipe && tokens.length && recipeConflicts(recipe, tokens));
    const form = recipeLabel.closest('form');
    if (!(form instanceof HTMLFormElement)) return;
    let warning = form.querySelector('#schedule-dialog-dislike-warning');
    if (!warning) {
      warning = document.createElement('p');
      warning.id = 'schedule-dialog-dislike-warning';
      warning.className = 'schedule-dialog__dislike-warning';
      const actions = form.querySelector('.schedule-dialog__actions');
      if (actions) form.insertBefore(warning, actions);
      else form.appendChild(warning);
    }
    warning.hidden = !conflict;
    warning.textContent = conflict ? 'This recipe conflicts with a selected family member’s Dislikes.' : '';
    const submit = form.querySelector('button[type="submit"]');
    if (submit instanceof HTMLButtonElement) {
      submit.disabled = conflict;
      submit.title = conflict ? 'Remove the conflicting family member or choose another recipe.' : '';
    }
  }

  const extendBackup = () => {
    const tools = global.BlissfulProductivity;
    if (!tools || tools.__familyDislikesBackupExtended) return Boolean(tools?.__familyDislikesBackupExtended);
    if (typeof tools.createBackup !== 'function' || typeof tools.restoreBackup !== 'function') return false;
    const originalCreate = tools.createBackup.bind(tools);
    const originalRestore = tools.restoreBackup.bind(tools);
    tools.createBackup = (storage = global.localStorage) => {
      const backup = originalCreate(storage);
      backup.data = isRecord(backup.data) ? backup.data : {};
      const raw = storage?.getItem?.(STORAGE_KEY);
      if (raw !== null && raw !== undefined) backup.data[STORAGE_KEY] = raw;
      return backup;
    };
    tools.restoreBackup = (backup, storage = global.localStorage) => {
      const raw = backup?.data?.[STORAGE_KEY];
      if (raw !== undefined) {
        if (typeof raw !== 'string') throw new Error(`Backup data for ${STORAGE_KEY} is invalid.`);
        normalizeState(JSON.parse(raw));
      }
      const result = originalRestore(backup, storage);
      if (raw !== undefined) storage?.setItem?.(STORAGE_KEY, raw);
      return result;
    };
    tools.__familyDislikesBackupExtended = true;
    return true;
  };

  const cleanupRemovedMembers = () => {
    const ids = new Set(getFamilyCards().map((card) => card.dataset.familyId));
    const state = readState();
    let changed = false;
    Object.keys(state.members).forEach((id) => {
      if (!ids.has(id)) {
        delete state.members[id];
        changed = true;
      }
    });
    if (changed) writeState(state);
  };

  const sync = () => {
    getFamilyCards().forEach(renderMemberTokens);
    cleanupRemovedMembers();
    applyRecipeFiltering();
    syncScheduleDialog();
    if (!extendBackup() && backupRetries < 60) {
      backupRetries += 1;
      global.requestAnimationFrame(schedule);
    }
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      sync();
    });
  };

  const start = () => {
    calculateRecipeIngredients();
    ensurePicker();
    sync();
    document.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('.recipe-family-filter__button, .schedule-dialog__member')) {
        global.requestAnimationFrame(() => {
          applyRecipeFiltering();
          syncScheduleDialog();
        });
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !document.getElementById('family-dislikes-picker')?.hidden) closePicker();
    });
    const observer = new MutationObserver(() => schedule());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'aria-pressed'] });
    global.addEventListener('storage', (event) => { if (event.key === STORAGE_KEY) schedule(); });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
