;(function (global) {
  const VIEW_SETTINGS_STORAGE_KEY = 'blissful-pantry-view-settings';
  const normalizeTagMode = (value) => value === 'expanded' ? 'expanded' : 'hidden';
  const toggleTagMode = (value) => normalizeTagMode(value) === 'expanded' ? 'hidden' : 'expanded';
  const api = { normalizeTagMode, toggleTagMode };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulPantryTagRefine = Object.assign({}, global.BlissfulPantryTagRefine || {}, api);
  if (typeof document === 'undefined') return;

  let scheduled = false;
  const readSettings = () => {
    try {
      const raw = global.localStorage?.getItem?.(VIEW_SETTINGS_STORAGE_KEY);
      const value = raw ? JSON.parse(raw) : {};
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (error) {
      return {};
    }
  };
  const writeSettings = (settings) => {
    try {
      global.localStorage?.setItem?.(VIEW_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {}
  };
  const getMode = () => normalizeTagMode(readSettings().tagDefault);
  const setMode = (mode) => {
    const settings = readSettings();
    writeSettings({ ...settings, tagDefault: normalizeTagMode(mode) });
  };

  const syncSettingsControl = () => {
    const details = document.getElementById('productivity-settings-pantry');
    if (!details) return;
    const field = Array.from(details.querySelectorAll('.pantry-view-settings__field')).find(
      (node) => node.querySelector('span')?.textContent?.trim() === 'Tags by default',
    );
    const select = field?.querySelector('select');
    if (!(select instanceof HTMLSelectElement)) return;
    if (select.dataset.simpleTagMode !== 'true') {
      select.dataset.simpleTagMode = 'true';
      select.innerHTML = '<option value="expanded">Shown</option><option value="hidden">Hidden</option>';
    }
    select.value = getMode();
  };

  const applyTagMode = () => {
    const mode = getMode();
    document.querySelectorAll('#pantry-grid .pantry-row-tags').forEach((row) => {
      if (!(row instanceof HTMLElement)) return;
      row.querySelector('.pantry-row-tags__summary')?.remove();
      if ('open' in row) row.open = true;
      row.hidden = mode !== 'expanded';
    });
    const button = document.getElementById('pantry-tags-action');
    if (button instanceof HTMLButtonElement) {
      const visible = mode === 'expanded';
      button.setAttribute('aria-pressed', visible ? 'true' : 'false');
      button.setAttribute('aria-label', visible ? 'Hide pantry tags' : 'Show pantry tags');
      button.title = visible ? 'Hide tags' : 'Show tags';
    }
    syncSettingsControl();
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(() => {
      scheduled = false;
      const settings = readSettings();
      if (settings.tagDefault === 'collapsed') {
        setMode('hidden');
      }
      applyTagMode();
    });
  };

  const start = () => {
    const settings = readSettings();
    if (settings.tagDefault === 'collapsed') setMode('hidden');
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('#pantry-tags-action') : null;
      if (!(target instanceof HTMLButtonElement)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setMode(toggleTagMode(getMode()));
      applyTagMode();
    }, true);
    document.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || target.dataset.simpleTagMode !== 'true') return;
      setMode(target.value);
      applyTagMode();
    });
    const observer = new MutationObserver(() => schedule());
    observer.observe(document.body, { childList: true, subtree: true });
    applyTagMode();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
