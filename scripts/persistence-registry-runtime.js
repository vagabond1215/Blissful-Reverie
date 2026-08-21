;(function (global) {
  const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const isStringArray = (value) => Array.isArray(value) && value.every((entry) => typeof entry === 'string');
  const isRaw = (value) => typeof value === 'string';

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
    { key: 'blissful-shopping-recipe-references', encoding: 'raw', validate: (value) => ['show', 'hide', 'true', 'false'].includes(value) },
    { key: 'blissful-shop-active', encoding: 'raw', validate: (value) => value === 'true' || value === 'false' },
    { key: 'blissful-pantry-usage', encoding: 'json', validate: isRecord },
    { key: 'blissful-pantry-stock-history', encoding: 'json', validate: isRecord },
    { key: 'blissful-inventory-unit-profiles', encoding: 'json', validate: isRecord },
    { key: 'blissful-inventory-unit-schema-v1', encoding: 'raw', validate: (value) => value === 'done' },
    { key: 'blissful-inventory-legacy-unit-preferences-v1', encoding: 'raw', validate: (value) => value === 'done' },
    { key: 'blissful-pantry-view-settings', encoding: 'json', validate: isRecord },
    { key: 'blissful-pantry-favorites-only', encoding: 'raw', validate: (value) => value === 'true' || value === 'false' },
    { key: 'blissful-pantry-lists', encoding: 'json', validate: isRecord },
    { key: 'blissful-family-dislikes', encoding: 'json', validate: isRecord },
    { key: 'blissful-onboarding-dismissed', encoding: 'raw', validate: (value) => value === 'true' },
    { key: 'blissful-pantry-unit-preferences', encoding: 'json', validate: isRecord },
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
    if (!definition) return false;
    const parsed = parseStoredValue(definition, raw);
    if (!definition.validate(parsed)) throw new Error(`Backup data for ${key} is invalid.`);
    return true;
  };

  const collectData = (storage) => {
    const data = {};
    keys.forEach((key) => {
      let raw;
      try {
        raw = storage?.getItem?.(key);
      } catch (error) {
        return;
      }
      if (raw === null || raw === undefined) return;
      validateStoredValue(key, raw);
      data[key] = raw;
    });
    return data;
  };

  const getBackupEntries = (backup) => {
    if (!isRecord(backup?.data)) throw new Error('Backup data is missing or invalid.');
    return keys
      .filter((key) => Object.prototype.hasOwnProperty.call(backup.data, key))
      .map((key) => {
        const raw = backup.data[key];
        validateStoredValue(key, raw);
        return [key, raw];
      });
  };

  const restoreEntries = (entries, storage) => {
    if (!storage || typeof storage.setItem !== 'function') throw new Error('Backup storage is unavailable.');
    const previous = new Map();
    entries.forEach(([key]) => {
      try {
        previous.set(key, storage.getItem?.(key) ?? null);
      } catch (error) {
        previous.set(key, null);
      }
    });

    try {
      entries.forEach(([key, raw]) => storage.setItem(key, raw));
    } catch (error) {
      entries.slice().reverse().forEach(([key]) => {
        try {
          const raw = previous.get(key);
          if (raw === null || raw === undefined) storage.removeItem?.(key);
          else storage.setItem(key, raw);
        } catch (rollbackError) {
          // Best effort: preserve the original storage error for the caller.
        }
      });
      throw new Error('Unable to restore backup.');
    }
    return true;
  };

  const install = (tools = global.BlissfulProductivity) => {
    if (!tools) return false;
    tools.persistenceKeys = keys;
    tools.__persistenceRegistryInstalled = true;
    return true;
  };

  const api = {
    definitions,
    registry,
    keys,
    validateStoredValue,
    collectData,
    getBackupEntries,
    restoreEntries,
    install,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulPersistenceRegistry = Object.assign({}, global.BlissfulPersistenceRegistry || {}, api);
  install();
})(typeof window !== 'undefined' ? window : globalThis);
