;(function (global) {
  const BIRTHDAY_STORAGE_YEAR = 2000;
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const toPositiveInt = (value) => {
    const number = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(number) && number > 0 ? number : 0;
  };

  const getInitials = (name) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const getActualDaysInMonth = (month, year = new Date().getFullYear()) => {
    const numericMonth = toPositiveInt(month);
    const numericYear = Number.isFinite(Number(year)) ? Number(year) : new Date().getFullYear();
    if (numericMonth < 1 || numericMonth > 12) return 0;
    return new Date(numericYear, numericMonth, 0).getDate();
  };

  const getSelectableDaysInMonth = (month) => {
    const numericMonth = toPositiveInt(month);
    if (numericMonth < 1 || numericMonth > 12) return 0;
    return new Date(BIRTHDAY_STORAGE_YEAR, numericMonth, 0).getDate();
  };

  const clampDayForMonth = (month, day, year = new Date().getFullYear()) => {
    const numericDay = toPositiveInt(day);
    const selectableMax = getSelectableDaysInMonth(month);
    if (!numericDay || !selectableMax) return 0;
    if (numericDay <= selectableMax) return numericDay;
    return Math.min(numericDay, getActualDaysInMonth(month, year));
  };

  const parseBirthday = (value) => {
    const match = String(value || '').match(/^\d{4}-(\d{2})-(\d{2})$/);
    if (!match) return { month: 0, day: 0 };
    const month = Number(match[1]);
    const day = Number(match[2]);
    const max = getSelectableDaysInMonth(month);
    if (!max || day < 1 || day > max) return { month: 0, day: 0 };
    return { month, day };
  };

  const encodeBirthday = (month, day) => {
    const numericMonth = toPositiveInt(month);
    const numericDay = toPositiveInt(day);
    const max = getSelectableDaysInMonth(numericMonth);
    if (!max || numericDay < 1 || numericDay > max) return '';
    return `${BIRTHDAY_STORAGE_YEAR}-${String(numericMonth).padStart(2, '0')}-${String(numericDay).padStart(2, '0')}`;
  };

  const getNextAvatarIndex = (currentIndex, optionCount) => {
    const count = Math.max(0, Number(optionCount) || 0);
    if (!count) return 0;
    const index = Math.max(0, Number(currentIndex) || 0);
    return (index + 1) % count;
  };

  const api = {
    BIRTHDAY_STORAGE_YEAR,
    MONTHS,
    getInitials,
    getActualDaysInMonth,
    getSelectableDaysInMonth,
    clampDayForMonth,
    parseBirthday,
    encodeBirthday,
    getNextAvatarIndex,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulFamilyRedesign = Object.assign({}, global.BlissfulFamilyRedesign || {}, api);
  if (typeof document === 'undefined') return;

  let previousFocus = null;
  let scheduled = false;

  const isFamilyActive = () => {
    const view = document.getElementById('family-view');
    return view instanceof HTMLElement && !view.hidden;
  };

  const isPantryActive = () => {
    const view = document.getElementById('pantry-view');
    return view instanceof HTMLElement && !view.hidden;
  };

  const ensurePageActionBar = () => {
    const row = document.querySelector('#recipes-page .topbar__row');
    if (!row) return null;
    let bar = document.getElementById('page-action-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'page-action-bar';
      bar.className = 'page-action-bar';
      bar.setAttribute('role', 'group');
      bar.setAttribute('aria-label', 'Page actions');
      const primaryNav = document.getElementById('primary-nav');
      if (primaryNav?.nextSibling) row.insertBefore(bar, primaryNav.nextSibling);
      else row.appendChild(bar);
    }
    return bar;
  };

  const ensureManageAction = () => {
    const bar = ensurePageActionBar();
    if (!bar) return null;
    let button = document.getElementById('family-manage-action');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = 'family-manage-action';
      button.className = 'page-action-bar__button';
      button.textContent = 'Manage Family';
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', 'family-manage-dialog');
      button.addEventListener('click', () => openManager());
      bar.appendChild(button);
    }
    return button;
  };

  const syncPageActions = () => {
    const bar = ensurePageActionBar();
    const manage = ensureManageAction();
    if (!bar || !manage) return;
    const familyActive = isFamilyActive();
    const pantryActive = isPantryActive();
    manage.hidden = !familyActive;
    ['pantry-restock-button', 'pantry-lists-action', 'pantry-tags-action'].forEach((id) => {
      const control = document.getElementById(id);
      if (control instanceof HTMLElement) control.hidden = !pantryActive;
    });
    const hasVisibleAction = Array.from(bar.children).some(
      (node) => node instanceof HTMLElement && !node.hidden,
    );
    bar.hidden = !hasVisibleAction;
  };

  const getCardName = (card) => card.querySelector('[data-family-field="name"]')?.value?.trim() || 'Family member';

  const findLegacyRemoveButton = (memberId) => Array.from(
    document.querySelectorAll('#family-member-list [data-remove-family]'),
  ).find((button) => button instanceof HTMLButtonElement && button.dataset.removeFamily === memberId) || null;

  const removeFamilyMember = (memberId, name) => {
    const confirmed = global.confirm?.(
      `Remove ${name}? All member data will be permanently lost. This cannot be undone.`,
    );
    if (!confirmed) return false;
    const button = findLegacyRemoveButton(memberId);
    if (!(button instanceof HTMLButtonElement)) return false;
    button.click();
    global.requestAnimationFrame(() => {
      refineFamilyPage();
      renderManager();
    });
    return true;
  };

  const ensureManager = () => {
    let root = document.getElementById('family-manage-dialog');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'family-manage-dialog';
    root.className = 'family-manage-dialog';
    root.hidden = true;
    root.innerHTML = `
      <div class="family-manage-dialog__backdrop" data-family-manage-close></div>
      <section class="family-manage-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="family-manage-title">
        <header class="family-manage-dialog__header">
          <h2 id="family-manage-title">Manage Family</h2>
          <button type="button" class="family-manage-dialog__close" data-family-manage-close aria-label="Close Manage Family">×</button>
        </header>
        <div class="family-manage-dialog__list" id="family-manage-list"></div>
        <footer class="family-manage-dialog__footer">
          <button type="button" class="family-manage-dialog__add" id="family-manage-add">Add Member</button>
        </footer>
      </section>`;
    document.body.appendChild(root);
    root.querySelectorAll('[data-family-manage-close]').forEach((node) => {
      node.addEventListener('click', closeManager);
    });
    root.querySelector('#family-manage-add')?.addEventListener('click', () => {
      const legacyAdd = document.getElementById('family-add-member');
      if (legacyAdd instanceof HTMLButtonElement) {
        legacyAdd.click();
        global.requestAnimationFrame(() => {
          refineFamilyPage();
          renderManager();
        });
      }
    });
    return root;
  };

  function renderManager() {
    const root = ensureManager();
    if (root.hidden) return;
    const list = root.querySelector('#family-manage-list');
    if (!list) return;
    list.innerHTML = '';
    const cards = Array.from(document.querySelectorAll('#family-member-list .family-member-card'));
    cards.forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      const memberId = String(card.dataset.familyId || '');
      if (!memberId) return;
      const row = document.createElement('div');
      row.className = 'family-manage-dialog__member';
      const name = document.createElement('span');
      name.className = 'family-manage-dialog__member-name';
      name.textContent = getCardName(card);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'family-manage-dialog__trash';
      remove.setAttribute('aria-label', `Remove ${name.textContent}`);
      remove.title = `Remove ${name.textContent}`;
      remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"></path></svg>';
      remove.addEventListener('click', () => removeFamilyMember(memberId, name.textContent));
      row.append(name, remove);
      list.appendChild(row);
    });
  }

  function openManager() {
    const root = ensureManager();
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.hidden = false;
    document.body.classList.add('family-manage-open');
    renderManager();
    root.querySelector('.family-manage-dialog__close')?.focus();
  }

  function closeManager() {
    const root = document.getElementById('family-manage-dialog');
    if (!(root instanceof HTMLElement)) return;
    root.hidden = true;
    document.body.classList.remove('family-manage-open');
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
    previousFocus = null;
  }

  const dispatchFamilyValue = (control) => {
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const syncAvatar = (card) => {
    const avatar = card.querySelector('.family-member-card__avatar-button');
    const select = card.querySelector('select[data-family-field="icon"]');
    const nameInput = card.querySelector('input[data-family-field="name"]');
    if (!(avatar instanceof HTMLButtonElement) || !(select instanceof HTMLSelectElement)) return;
    const selectedIndex = Math.max(0, select.selectedIndex);
    const useInitials = selectedIndex <= 0;
    avatar.classList.toggle('family-member-card__avatar-button--initials', useInitials);
    avatar.textContent = useInitials
      ? getInitials(nameInput?.value || '')
      : String(select.options[selectedIndex]?.value || select.value || getInitials(nameInput?.value || ''));
  };

  const ensureAvatarButton = (card) => {
    const header = card.querySelector('.family-member-card__header');
    const legacyAvatar = header?.querySelector('.family-member-card__avatar');
    const iconSelect = card.querySelector('select[data-family-field="icon"]');
    if (!header || !(iconSelect instanceof HTMLSelectElement)) return null;
    let button = card.querySelector('.family-member-card__avatar-button');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'family-member-card__avatar-button';
      button.setAttribute('aria-label', 'Change family member icon');
      button.title = 'Change icon';
      button.addEventListener('click', () => {
        const options = Array.from(iconSelect.options);
        if (!options.length) return;
        const nextIndex = getNextAvatarIndex(Math.max(0, iconSelect.selectedIndex), options.length);
        iconSelect.selectedIndex = nextIndex;
        dispatchFamilyValue(iconSelect);
        syncAvatar(card);
      });
      legacyAvatar?.replaceWith(button);
    } else if (legacyAvatar && legacyAvatar !== button) {
      legacyAvatar.remove();
    }
    iconSelect.hidden = true;
    iconSelect.closest('.family-member-card__field')?.classList.add('family-member-card__legacy-field');
    syncAvatar(card);
    return button;
  };

  const buildDayOptions = (select, month, selectedDay) => {
    if (!(select instanceof HTMLSelectElement)) return;
    const max = getSelectableDaysInMonth(month);
    const value = toPositiveInt(selectedDay);
    select.innerHTML = '<option value="">Day</option>';
    for (let day = 1; day <= max; day += 1) {
      const option = document.createElement('option');
      option.value = String(day);
      option.textContent = String(day);
      if (day === value) option.selected = true;
      select.appendChild(option);
    }
  };

  const ensureBirthdayControl = (card) => {
    const birthdayInput = card.querySelector('input[data-family-field="birthday"]');
    if (!(birthdayInput instanceof HTMLInputElement)) return null;
    let control = card.querySelector('.family-member-card__birthday-control');
    if (!control) {
      control = document.createElement('label');
      control.className = 'family-member-card__inline-field family-member-card__birthday-control';
      const label = document.createElement('span');
      label.className = 'family-member-card__inline-label';
      label.textContent = 'Birthday';
      const inputs = document.createElement('span');
      inputs.className = 'family-member-card__birthday-inputs';
      const monthSelect = document.createElement('select');
      monthSelect.className = 'family-member-card__birthday-month';
      monthSelect.setAttribute('aria-label', 'Birthday month');
      monthSelect.innerHTML = '<option value="">Month</option>' + MONTHS.map(
        (month, index) => `<option value="${index + 1}">${month}</option>`,
      ).join('');
      const daySelect = document.createElement('select');
      daySelect.className = 'family-member-card__birthday-day';
      daySelect.setAttribute('aria-label', 'Birthday day');
      inputs.append(monthSelect, daySelect);
      control.append(label, inputs);

      const persist = () => {
        birthdayInput.value = encodeBirthday(monthSelect.value, daySelect.value);
        dispatchFamilyValue(birthdayInput);
      };

      monthSelect.addEventListener('change', () => {
        const month = toPositiveInt(monthSelect.value);
        if (!month) {
          buildDayOptions(daySelect, 0, 0);
          birthdayInput.value = '';
          dispatchFamilyValue(birthdayInput);
          return;
        }
        const currentDay = toPositiveInt(daySelect.value);
        const nextDay = currentDay
          ? clampDayForMonth(month, currentDay, new Date().getFullYear())
          : 0;
        buildDayOptions(daySelect, month, nextDay);
        persist();
      });
      daySelect.addEventListener('change', persist);
      control.__birthdayInput = birthdayInput;
    }

    const parsed = parseBirthday(birthdayInput.value);
    const monthSelect = control.querySelector('.family-member-card__birthday-month');
    const daySelect = control.querySelector('.family-member-card__birthday-day');
    if (monthSelect instanceof HTMLSelectElement && daySelect instanceof HTMLSelectElement) {
      if (String(monthSelect.value) !== String(parsed.month || '')) monthSelect.value = parsed.month ? String(parsed.month) : '';
      buildDayOptions(daySelect, parsed.month, parsed.day);
    }
    birthdayInput.hidden = true;
    birthdayInput.closest('.family-member-card__field')?.classList.add('family-member-card__legacy-field');
    return control;
  };

  const ensureTargetControl = (card) => {
    const input = card.querySelector('input[data-family-field="targetCalories"]');
    if (!(input instanceof HTMLInputElement)) return null;
    const legacyField = input.closest('.family-member-card__field');
    let control = card.querySelector('.family-member-card__target-control');
    if (!control) {
      control = document.createElement('label');
      control.className = 'family-member-card__inline-field family-member-card__target-control';
      const label = document.createElement('span');
      label.className = 'family-member-card__inline-label';
      label.textContent = 'Target';
      input.placeholder = 'kcal';
      control.append(label, input);
    }
    legacyField?.classList.add('family-member-card__legacy-field');
    return control;
  };

  const findFieldByLabel = (card, labelText) => Array.from(
    card.querySelectorAll('.family-member-card__fields > .family-member-card__field'),
  ).find((field) => field.querySelector(':scope > span')?.textContent?.trim() === labelText) || null;

  const enhanceFamilyCard = (card) => {
    if (!(card instanceof HTMLElement)) return;
    card.classList.add('family-member-card--refined');
    const header = card.querySelector('.family-member-card__header');
    const nameInput = card.querySelector('input[data-family-field="name"]');
    if (!header || !(nameInput instanceof HTMLInputElement)) return;

    const avatar = ensureAvatarButton(card);
    const target = ensureTargetControl(card);
    const birthday = ensureBirthdayControl(card);
    const remove = card.querySelector('.family-member-card__remove');
    if (remove instanceof HTMLElement) remove.hidden = true;

    let primary = card.querySelector('.family-member-card__primary-row');
    if (!primary) {
      primary = document.createElement('div');
      primary.className = 'family-member-card__primary-row';
      card.insertBefore(primary, card.firstChild);
    }
    [avatar, nameInput, target, birthday].forEach((node) => {
      if (node && node.parentElement !== primary) primary.appendChild(node);
    });
    header.classList.add('family-member-card__legacy-header');

    let secondary = card.querySelector('.family-member-card__secondary-grid');
    if (!secondary) {
      secondary = document.createElement('div');
      secondary.className = 'family-member-card__secondary-grid';
      card.appendChild(secondary);
    }
    const diets = findFieldByLabel(card, 'Diets');
    const allergies = findFieldByLabel(card, 'Allergies');
    const preferencesInput = card.querySelector('textarea[data-family-field="preferences"]');
    const preferences = preferencesInput?.closest('.family-member-card__field') || null;
    if (diets) {
      diets.querySelector(':scope > span').textContent = 'Diet';
      diets.classList.add('family-member-card__secondary-field');
      secondary.appendChild(diets);
    }
    if (allergies) {
      allergies.classList.add('family-member-card__secondary-field');
      secondary.appendChild(allergies);
    }
    if (preferences) {
      const label = preferences.querySelector(':scope > span');
      if (label) label.textContent = 'Dislikes';
      preferencesInput.placeholder = 'Foods or flavors to avoid';
      preferencesInput.rows = 2;
      preferences.classList.add('family-member-card__secondary-field', 'family-member-card__secondary-field--dislikes');
      secondary.appendChild(preferences);
    }
    syncAvatar(card);
  };

  function refineFamilyPage() {
    const view = document.getElementById('family-view');
    if (view instanceof HTMLElement) {
      view.classList.add('family-view--refined');
      view.querySelectorAll('.family-member-card').forEach(enhanceFamilyCard);
    }
    syncPageActions();
    const dialog = document.getElementById('family-manage-dialog');
    if (dialog instanceof HTMLElement && !dialog.hidden) renderManager();
  }

  const scheduleRefine = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      refineFamilyPage();
    });
  };

  const bindEvents = () => {
    document.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.dataset.familyField !== 'name') return;
      const card = target.closest('.family-member-card');
      if (card instanceof HTMLElement) syncAvatar(card);
      if (!document.getElementById('family-manage-dialog')?.hidden) renderManager();
    });
    document.addEventListener('click', (event) => {
      const nav = event.target instanceof Element ? event.target.closest('[data-view-target]') : null;
      if (nav) global.requestAnimationFrame(syncPageActions);
    }, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !document.getElementById('family-manage-dialog')?.hidden) closeManager();
    });
  };

  const start = () => {
    ensureManager();
    ensureManageAction();
    bindEvents();
    refineFamilyPage();
    const observer = new MutationObserver(() => scheduleRefine());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
