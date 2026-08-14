;(function (global) {
  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const isStringArray = (value) => Array.isArray(value) && value.every((entry) => typeof entry === 'string');
  const anyJson = () => true;
  const anyRaw = (value) => typeof value === 'string';

  const definitions = [
    { key: 'blissful-app-state', encoding: 'json', validate: isRecord },
    { key: 'blissful-meal-plan', encoding: 'json', validate: isRecord },
    { key: 'blissful-favorites', encoding: 'json', validate: isStringArray },
    { key: 'blissful-pantry-favorites', encoding: 'json', validate: isStringArray },
    { key: 'blissful-theme', encoding: 'json', validate: isRecord },
    { key: 'blissful-holiday-themes', encoding: 'json', validate: isRecord },
    { key: 'blissful-measurement', encoding: 'raw', validate: (value) => value === 'imperial' || value === 'metric' },
    { key: 'blissful-shopping-settings', encoding: 'json', validate: isRecord },
    { key: 'blissful-shopping-item-profiles', encoding: 'json', validate: isRecord },
    { key: 'blissful-pantry-usage', encoding: 'json', validate: isRecord },
    { key: 'blissful-pantry-stock-history', encoding: 'json', validate: isRecord },
    { key: 'blissful-inventory-unit-profiles', encoding: 'json', validate: isRecord },
    { key: 'blissful-inventory-unit-schema-v1', encoding: 'raw', validate: anyRaw },
    { key: 'blissful-pantry-view-settings', encoding: 'json', validate: isRecord },
    { key: 'blissful-pantry-favorites-only', encoding: 'raw', validate: (value) => value === 'true' || value === 'false' },
    { key: 'blissful-pantry-lists', encoding: 'json', validate: isRecord },
    { key: 'blissful-family-dislikes', encoding: 'json', validate: isRecord },
    { key: 'blissful-onboarding-dismissed', encoding: 'raw', validate: anyRaw },
    { key: 'blissful-pantry-unit-preferences', encoding: 'json', validate: isRecord },
    { key: 'blissful-pantry-unit-migration-v1', encoding: 'raw', validate: anyRaw },
  ];

  const registry = new Map(definitions.map((definition) => [definition.key, Object.freeze({ ...definition })]));
  const keys = Object.freeze(definitions.map((definition) => definition.key));

  const parseStoredValue = (definition, raw) => {
    if (typeof raw !== 'string') throw new Error(`Backup data for ${definition.key} is invalid.`);
    if (definition.encoding === 'raw') return raw;
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new Error(`Backup data for ${definition.key} is invalid.`);
    }
  };

  const validateStoredValue = (key, raw) => {
    const definition = registry.get(key);
    if (!definition) return true;
    const parsed = parseStoredValue(definition, raw);
    if (!(definition.validate || anyJson)(parsed)) {
      throw new Error(`Backup data for ${key} is invalid.`);
    }
    return true;
  };

  const collectData = (storage) => {
    const data = {};
    keys.forEach((key) => {
      try {
        const raw = storage?.getItem?.(key);
        if (raw !== null && raw !== undefined) {
          validateStoredValue(key, raw);
          data[key] = raw;
        }
      } catch (error) {
        if (error?.message?.startsWith?.('Backup data for ')) throw error;
      }
    });
    return data;
  };

  const getBackupEntries = (backup) => {
    const data = backup?.data;
    if (!isRecord(data)) throw new Error('Backup data is missing or invalid.');
    return keys
      .filter((key) => Object.prototype.hasOwnProperty.call(data, key))
      .map((key) => {
        const raw = data[key];
        validateStoredValue(key, raw);
        return [key, raw];
      });
  };

  const install = (tools = global.BlissfulProductivity) => {
    if (!tools || tools.__persistenceRegistryInstalled) return Boolean(tools?.__persistenceRegistryInstalled);
    if (typeof tools.createBackup !== 'function' || typeof tools.restoreBackup !== 'function') return false;
    const originalCreate = tools.createBackup.bind(tools);
    const originalRestore = tools.restoreBackup.bind(tools);

    tools.createBackup = (storage = global.localStorage) => {
      const backup = originalCreate(storage);
      backup.data = isRecord(backup.data) ? backup.data : {};
      Object.assign(backup.data, collectData(storage));
      return backup;
    };

    tools.restoreBackup = (backup, storage = global.localStorage) => {
      const entries = getBackupEntries(backup);
      if (!storage || typeof storage.setItem !== 'function') {
        throw new Error('Backup storage is unavailable.');
      }
      const previous = new Map();
      entries.forEach(([key]) => {
        try {
          previous.set(key, storage.getItem?.(key) ?? null);
        } catch (error) {
          previous.set(key, null);
        }
      });

      try {
        originalRestore(backup, storage);
        entries.forEach(([key, raw]) => storage.setItem(key, raw));
      } catch (error) {
        entries.slice().reverse().forEach(([key]) => {
          try {
            const raw = previous.get(key);
            if (raw === null || raw === undefined) storage.removeItem?.(key);
            else storage.setItem(key, raw);
          } catch (rollbackError) {}
        });
        throw error;
      }
      return true;
    };

    tools.__persistenceRegistryInstalled = true;
    tools.persistenceKeys = keys;
    return true;
  };

  const api = { definitions, registry, keys, validateStoredValue, collectData, getBackupEntries, install };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulPersistenceRegistry = Object.assign({}, global.BlissfulPersistenceRegistry || {}, api);

  if (typeof document === 'undefined') return;
  if (install()) return;
  const retry = () => {
    if (!install()) global.requestAnimationFrame(retry);
  };
  global.requestAnimationFrame(retry);
})(typeof window !== 'undefined' ? window : globalThis);
