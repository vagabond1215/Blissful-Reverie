;(function (global) {
  if (typeof document === 'undefined') return;

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
