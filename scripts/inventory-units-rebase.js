;(function (global) {
  const core = global.BlissfulInventoryUnits || (typeof require === 'function' ? require('./inventory-units-core.js') : {});
  const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

  const rebaseProfile = (profile, newStockUnit) => {
    const current = core.normalizeProfile?.(profile);
    const target = core.normalizeUnit?.(newStockUnit);
    const targetDefinition = core.getUnit?.(target);
    if (!current || !target || !targetDefinition || targetDefinition.group === 'package') return null;
    if (target === current.stockUnit) return current;
    const oldStockPerTarget = core.toStockQuantity?.(1, target, current);
    if (!positive(oldStockPerTarget)) return null;
    const equivalentsToStock = {};
    (core.UNIT_REGISTRY || []).forEach((unit) => {
      if (!unit || unit.group === 'package') return;
      const oldStockPerUnit = core.toStockQuantity?.(1, unit.id, current);
      if (positive(oldStockPerUnit)) equivalentsToStock[unit.id] = Number(oldStockPerUnit) / Number(oldStockPerTarget);
    });
    equivalentsToStock[target] = 1;
    return core.normalizeProfile({
      stockUnit: target,
      purchaseUnit: current.purchaseUnit,
      unitsPerPurchase: Number(current.unitsPerPurchase) / Number(oldStockPerTarget),
      equivalentsToStock,
    });
  };

  const api = { rebaseProfile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.BlissfulInventoryUnits = Object.assign({}, core, api);
})(typeof window !== 'undefined' ? window : globalThis);
