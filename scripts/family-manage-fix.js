;(function (global) {
  const APP_STATE_STORAGE_KEY = 'blissful-app-state';

  const removeMemberFromState = (state, memberId) => {
    const source = state && typeof state === 'object' && !Array.isArray(state) ? state : {};
    const id = String(memberId || '').trim();
    if (!id) return source;
    const members = Array.isArray(source.familyMembers) ? source.familyMembers : [];
    return {
      ...source,
      familyMembers: members.filter((member) => String(member?.id || '') !== id),
      mealPlanMemberFilter: Array.isArray(source.mealPlanMemberFilter)
        ? source.mealPlanMemberFilter.filter((entry) => String(entry || '') !== id)
        : source.mealPlanMemberFilter,
    };
  };

  const api = { removeMemberFromState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulFamilyManageFix = Object.assign({}, global.BlissfulFamilyManageFix || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;

  const readState = () => {
    try {
      const parsed = JSON.parse(global.localStorage?.getItem?.(APP_STATE_STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  };

  const syncMemberIds = () => {
    const rows = Array.from(document.querySelectorAll('#family-manage-list .family-manage-dialog__member'));
    const cards = Array.from(document.querySelectorAll('#family-member-list .family-member-card[data-family-id]'));
    rows.forEach((row, index) => {
      if (!(row instanceof HTMLElement)) return;
      const card = cards[index];
      const memberId = String(card?.dataset.familyId || '').trim();
      if (!memberId) return;
      row.dataset.familyId = memberId;
      const trash = row.querySelector('.family-manage-dialog__trash');
      if (trash instanceof HTMLButtonElement) trash.dataset.familyId = memberId;
    });
  };

  const applyRemoval = (memberId) => {
    const current = readState();
    const next = removeMemberFromState(current, memberId);
    const before = Array.isArray(current.familyMembers) ? current.familyMembers.length : 0;
    const after = Array.isArray(next.familyMembers) ? next.familyMembers.length : 0;
    if (after === before) return false;
    const app = global.BlissfulApp;
    if (app && typeof app.applyStarterState === 'function') {
      app.applyStarterState(next);
    } else {
      try { global.localStorage?.setItem?.(APP_STATE_STORAGE_KEY, JSON.stringify(next)); } catch (error) {}
    }
    global.requestAnimationFrame(() => {
      syncMemberIds();
      global.dispatchEvent(new Event('blissful-family-dislikes-change'));
    });
    return true;
  };

  const handleTrash = (event) => {
    const trash = event.target instanceof Element
      ? event.target.closest('.family-manage-dialog__trash')
      : null;
    if (!(trash instanceof HTMLButtonElement)) return;
    const row = trash.closest('.family-manage-dialog__member');
    const memberId = String(trash.dataset.familyId || row?.dataset.familyId || '').trim();
    if (!memberId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const name = row?.querySelector('.family-manage-dialog__member-name')?.textContent?.trim() || 'this family member';
    const confirmed = global.confirm?.(
      `Remove ${name}? All member data will be permanently lost. This cannot be undone.`,
    );
    if (!confirmed) return;
    applyRemoval(memberId);
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      syncMemberIds();
    });
  };

  const start = () => {
    syncMemberIds();
    document.addEventListener('click', handleTrash, true);
    const list = document.getElementById('family-manage-list');
    const observer = new MutationObserver(schedule);
    observer.observe(list || document.body, { childList: true, subtree: true });
    if (!list) {
      const bodyObserver = new MutationObserver(() => {
        if (document.getElementById('family-manage-list')) schedule();
      });
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
