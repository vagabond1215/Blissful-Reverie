const assert = require('node:assert');
const backupUi = require('../scripts/productivity-backup.js');
const tools = require('../scripts/productivity-tools.js');

assert.equal(
  backupUi.buildBackupFilename(new Date('2026-06-09T18:00:00.000Z')),
  'blissful-reverie-backup-2026-06-09.json',
);

const backup = {
  app: 'Blissful Reverie',
  version: 1,
  exportedAt: '2026-06-09T18:00:00.000Z',
  data: {
    'blissful-favorites': JSON.stringify(['recipe-a']),
    'blissful-measurement': 'metric',
  },
};
const serialized = backupUi.serializeBackup(backup);
assert(serialized.endsWith('\n'));
assert.deepEqual(backupUi.parseBackupText(serialized), backup);

const restored = new Map();
backupUi.restoreBackupText(serialized, {
  tools,
  storage: {
    getItem: (key) => restored.get(key) ?? null,
    setItem: (key, value) => restored.set(key, value),
    removeItem: (key) => restored.delete(key),
  },
});
assert.equal(restored.get('blissful-favorites'), JSON.stringify(['recipe-a']));
assert.equal(restored.get('blissful-measurement'), 'metric');

assert.throws(
  () => backupUi.restoreBackupText('{broken json', { tools, storage: {} }),
  /Backup file is not valid JSON/,
);
assert.throws(
  () => backupUi.restoreBackupText(JSON.stringify({
    app: 'Unknown Planner',
    version: 1,
    data: {},
  }), { tools, storage: {} }),
  /not for Blissful Reverie/,
);

console.log('Productivity backup tests passed.');
