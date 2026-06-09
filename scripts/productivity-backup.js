;(function (global) {
  const IMPORT_SUCCESS_KEY = 'blissful-backup-import-success';

  const buildBackupFilename = (date = new Date()) => {
    const value = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    return `blissful-reverie-backup-${value.toISOString().slice(0, 10)}.json`;
  };

  const serializeBackup = (backup) => `${JSON.stringify(backup, null, 2)}\n`;

  const parseBackupText = (text) => {
    try {
      return JSON.parse(String(text || ''));
    } catch (error) {
      throw new Error('Backup file is not valid JSON.');
    }
  };

  const restoreBackupText = (
    text,
    {
      tools = global.BlissfulProductivity,
      storage = global.localStorage,
    } = {},
  ) => {
    if (!tools || typeof tools.restoreBackup !== 'function') {
      throw new Error('Backup restore is unavailable.');
    }
    const backup = parseBackupText(text);
    tools.restoreBackup(backup, storage);
    return backup;
  };

  const downloadBackup = (
    backup,
    {
      documentRef = global.document,
      urlApi = global.URL,
      BlobCtor = global.Blob,
      date = new Date(),
    } = {},
  ) => {
    if (!documentRef || !urlApi?.createObjectURL || typeof BlobCtor !== 'function') {
      throw new Error('Backup download is unavailable.');
    }
    const blob = new BlobCtor([serializeBackup(backup)], { type: 'application/json' });
    const objectUrl = urlApi.createObjectURL(blob);
    const link = documentRef.createElement('a');
    link.href = objectUrl;
    link.download = buildBackupFilename(date);
    link.hidden = true;
    documentRef.body.appendChild(link);
    link.click();
    link.remove();
    global.setTimeout(() => urlApi.revokeObjectURL(objectUrl), 0);
    return link.download;
  };

  const api = {
    buildBackupFilename,
    serializeBackup,
    parseBackupText,
    restoreBackupText,
    downloadBackup,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document === 'undefined') {
    return;
  }

  const tools = global.BlissfulProductivity || {};

  const renderBackupControls = () => {
    const toolbar = document.getElementById('theme-toolbar');
    if (!toolbar || document.getElementById('productivity-settings-backup')) {
      return Boolean(toolbar);
    }
    if (
      typeof tools.createBackup !== 'function'
      || typeof tools.restoreBackup !== 'function'
    ) {
      return false;
    }

    const details = document.createElement('details');
    details.className = 'productivity-backup';
    details.id = 'productivity-settings-backup';

    const summary = document.createElement('summary');
    summary.className = 'productivity-backup__summary';
    summary.textContent = 'Local backup';
    details.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'productivity-backup__body';

    const description = document.createElement('p');
    description.className = 'productivity-backup__description';
    description.textContent = 'Download this browser\'s planner data or restore it from a Blissful Reverie JSON backup.';
    body.appendChild(description);

    const actions = document.createElement('div');
    actions.className = 'productivity-backup__actions';

    const exportButton = document.createElement('button');
    exportButton.type = 'button';
    exportButton.className = 'productivity-backup__button';
    exportButton.textContent = 'Export backup';
    actions.appendChild(exportButton);

    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.className = 'productivity-backup__button';
    importButton.textContent = 'Import backup';
    importButton.setAttribute('aria-controls', 'productivity-backup-file');
    actions.appendChild(importButton);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'productivity-backup-file';
    fileInput.className = 'sr-only';
    fileInput.accept = '.json,application/json';
    fileInput.tabIndex = -1;
    actions.appendChild(fileInput);
    body.appendChild(actions);

    const status = document.createElement('p');
    status.className = 'productivity-backup__status';
    status.hidden = true;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    body.appendChild(status);

    const setStatus = (message, state) => {
      status.textContent = message;
      status.dataset.state = state;
      status.hidden = false;
    };

    const setBusy = (busy) => {
      exportButton.disabled = busy;
      importButton.disabled = busy;
    };

    exportButton.addEventListener('click', () => {
      try {
        const backup = tools.createBackup(global.localStorage);
        const filename = downloadBackup(backup);
        setStatus(`Backup downloaded as ${filename}.`, 'success');
      } catch (error) {
        setStatus(error?.message || 'Backup export failed.', 'error');
      }
    });

    importButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      setBusy(true);
      setStatus('Importing backup...', 'pending');
      try {
        const text = await file.text();
        restoreBackupText(text, { tools, storage: global.localStorage });
        try {
          global.sessionStorage?.setItem?.(IMPORT_SUCCESS_KEY, 'true');
        } catch (error) {
          // The current status still confirms success if session storage is unavailable.
        }
        setStatus('Backup imported. Reloading planner...', 'success');
        global.setTimeout(() => global.location.reload(), 350);
      } catch (error) {
        setStatus(error?.message || 'Backup import failed.', 'error');
        setBusy(false);
      } finally {
        fileInput.value = '';
      }
    });

    try {
      if (global.sessionStorage?.getItem?.(IMPORT_SUCCESS_KEY) === 'true') {
        global.sessionStorage.removeItem(IMPORT_SUCCESS_KEY);
        setStatus('Backup imported successfully.', 'success');
        details.open = true;
      }
    } catch (error) {
      // Import already succeeded; a missing confirmation is non-fatal.
    }

    details.appendChild(body);
    toolbar.appendChild(details);
    return true;
  };

  const start = () => {
    if (renderBackupControls()) return;
    global.requestAnimationFrame(() => renderBackupControls());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
