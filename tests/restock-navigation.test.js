const assert = require('node:assert');

const navigation = require('../scripts/restock-pantry-nav.js');

assert.deepEqual(
  navigation.buildKitchenState({ activeView: 'pantry', pantryInventory: { olives: { quantity: '2', unit: 'can' } } }),
  { activeView: 'kitchen', pantryInventory: { olives: { quantity: '2', unit: 'can' } } },
);

assert.equal(
  navigation.shouldReplaceTopbarButton({ restockBound: 'true', restockTrigger: '', label: 'Kitchen' }),
  true,
);
assert.equal(
  navigation.shouldReplaceTopbarButton({ restockBound: '', restockTrigger: 'topbar', label: 'Restock' }),
  true,
);
assert.equal(
  navigation.shouldReplaceTopbarButton({ restockBound: '', restockTrigger: '', label: 'Restock' }),
  true,
);
assert.equal(
  navigation.shouldReplaceTopbarButton({ restockBound: '', restockTrigger: '', label: 'Kitchen' }),
  false,
);

console.log('Restock navigation tests passed.');
