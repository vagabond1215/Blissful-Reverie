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

  const parseRecord = (raw, fallback = {}) => {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return isRecord(parsed) ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  };

  const guardCleanupValue = (storage, key, value, getItem) => {
    if (String(key) !== DISLIKE_STORAGE_KEY) return value;
    const stack = String(new Error().stack || '');
    if (!stack.includes('cleanupRemovedMembers')) return value;

    const previousState = parseRecord(getItem.call(storage, DISLIKE_STORAGE_KEY), { version: 1, members: {} });
    const nextState = parseRecord(String(value || ''), { version: 1, members: {} });
    const appState = parseRecord(getItem.call(storage, APP_STATE_STORAGE_KEY), {});
    const repaired = preserveMountedIndependentDislikes({
      initialState: previousState,
      currentState: nextState,
      familyMembers: appState.familyMembers,
    });
    return repaired.restoredIds.length ? JSON.stringify(repaired.state) : value;
  };

  const installCleanupStorageGuard = () => {
    const storage = global.localStorage;
    if (!storage || typeof storage.setItem !== 'function' || typeof storage.getItem !== 'function') return;

    if (global.Storage?.prototype && storage instanceof global.Storage) {
      const proto = global.Storage.prototype;
      if (proto.__blissfulFamilyDislikeCleanupGuard) return;
      const originalSetItem = proto.setItem;
      const originalGetItem = proto.getItem;
      Object.defineProperty(proto, '__blissfulFamilyDislikeCleanupGuard', {
        value: true,
        configurable: true,
      });
      proto.setItem = function setItemWithFamilyDislikeGuard(key, value) {
        const guarded = this === global.localStorage
          ? guardCleanupValue(this, key, value, originalGetItem)
          : value;
        return originalSetItem.call(this, key, guarded);
      };
      return;
    }

    if (storage.__blissfulFamilyDislikeCleanupGuard) return;
    const originalSetItem = storage.setItem.bind(storage);
    const originalGetItem = storage.getItem.bind(storage);
    try {
      Object.defineProperty(storage, '__blissfulFamilyDislikeCleanupGuard', {
        value: true,
        configurable: true,
      });
      storage.setItem = (key, value) => originalSetItem(
        key,
        guardCleanupValue(storage, key, value, { call: (_storage, requestedKey) => originalGetItem(requestedKey) }),
      );
    } catch (error) {
      // If an unusual Storage implementation cannot be patched, leave it untouched.
    }
  };

  installCleanupStorageGuard();

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
    document.addEventListener('input', protectLegacyNotes, true);
    document.addEventListener('change', protectLegacyNotes, true);
    const observer = new MutationObserver(() => rememberLegacyNotes());
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
