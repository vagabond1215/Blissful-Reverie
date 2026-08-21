;(function (global) {
  const DISLIKE_STORAGE_KEY = 'blissful-family-dislikes';
  const APP_STATE_STORAGE_KEY = 'blissful-app-state';
  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);

  const preserveMountedIndependentDislikes = ({ initialState, currentState, familyMembers } = {}) => {
    const initial = isRecord(initialState) ? initialState : {};
    const current = isRecord(currentState) ? currentState : {};
    const initialMembers = isRecord(initial.members) ? initial.members : {};
    const currentMembers = isRecord(current.members) ? { ...current.members } : {};
    const activeIds = new Set(
      (Array.isArray(familyMembers) ? familyMembers : [])
        .map((member) => String(member?.id || '').trim())
        .filter(Boolean),
    );
    const restoredIds = [];

    activeIds.forEach((id) => {
      if (!Object.prototype.hasOwnProperty.call(initialMembers, id)) return;
      if (Object.prototype.hasOwnProperty.call(currentMembers, id)) return;
      currentMembers[id] = initialMembers[id];
      restoredIds.push(id);
    });

    return {
      state: { ...current, version: 1, members: currentMembers },
      restoredIds,
    };
  };

  const api = { preserveMountedIndependentDislikes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulFamilyDislikesSafety = Object.assign({}, global.BlissfulFamilyDislikesSafety || {}, api);
  if (typeof document === 'undefined') return;

  const readJson = (key, fallback) => {
    try {
      const raw = global.localStorage?.getItem?.(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return isRecord(parsed) ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  };

  /*
    family-dislikes.js historically cleaned saved member entries by inspecting only
    rendered Family cards. On a fresh Recipes load the Family view has not rendered
    those cards yet, so every saved dislike could be mistaken for a removed member.
    Snapshot the pre-runtime state here and repair only properties that disappear
    while the corresponding member still exists in the persisted app state. An
    intentional clear remains an explicit empty array and is therefore preserved.
  */
  const startupDislikes = readJson(DISLIKE_STORAGE_KEY, { version: 1, members: {} });
  let startupRestoreAttempts = 0;
  let startupRestoreComplete = false;

  const restoreStartupDislikes = () => {
    if (startupRestoreComplete) return;
    const appState = readJson(APP_STATE_STORAGE_KEY, {});
    const currentState = readJson(DISLIKE_STORAGE_KEY, { version: 1, members: {} });
    const repaired = preserveMountedIndependentDislikes({
      initialState: startupDislikes,
      currentState,
      familyMembers: appState.familyMembers,
    });
    if (repaired.restoredIds.length) {
      try { global.localStorage?.setItem?.(DISLIKE_STORAGE_KEY, JSON.stringify(repaired.state)); } catch (error) {}
      repaired.restoredIds.forEach((memberId) => {
        global.dispatchEvent?.(new CustomEvent('blissful-family-dislikes-change', { detail: { memberId } }));
      });
    }
    startupRestoreComplete = true;
  };

  const waitForDislikeRuntime = () => {
    if (startupRestoreComplete) return;
    if (!global.BlissfulFamilyDislikes && startupRestoreAttempts < 90) {
      startupRestoreAttempts += 1;
      global.requestAnimationFrame(waitForDislikeRuntime);
      return;
    }
    /* Run after the runtime's own startup animation-frame cleanup. */
    global.requestAnimationFrame(() => global.requestAnimationFrame(restoreStartupDislikes));
  };

  const legacyByMember = new Map();
  const isDislikeSummary = (value) => /^dislikes\s*:/i.test(String(value || '').trim());

  const rememberLegacyNotes = () => {
    document.querySelectorAll('#family-member-list .family-member-card').forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      const memberId = String(card.dataset.familyId || '').trim();
      const textarea = card.querySelector('textarea[data-family-field="preferences"]');
      if (!memberId || !(textarea instanceof HTMLTextAreaElement)) return;
      const value = String(textarea.value || '').trim();
      if (value && !isDislikeSummary(value) && !legacyByMember.has(memberId)) {
        legacyByMember.set(memberId, value);
      }
    });
  };

  const protectLegacyNotes = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement) || target.dataset.familyField !== 'preferences') return;
    const card = target.closest('.family-member-card[data-family-id]');
    const memberId = String(card?.dataset.familyId || '').trim();
    if (!memberId) return;
    const current = String(target.value || '').trim();
    if (current && !isDislikeSummary(current)) {
      legacyByMember.set(memberId, current);
      return;
    }
    const legacy = legacyByMember.get(memberId);
    if (!legacy || current === legacy) return;
    event.stopImmediatePropagation();
    global.queueMicrotask?.(() => {
      if (target.isConnected) target.value = legacy;
    });
  };

  const start = () => {
    rememberLegacyNotes();
    waitForDislikeRuntime();
    document.addEventListener('input', protectLegacyNotes, true);
    document.addEventListener('change', protectLegacyNotes, true);
    const observer = new MutationObserver(() => rememberLegacyNotes());
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
