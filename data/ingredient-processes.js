;(function (global) {
  const processes = [
    {
      id: 'hot-smoked-salmon',
      name: 'Hot-Smoked Salmon',
      kind: 'cook',
      buyable: true,
      inputs: [
        { slug: 'seafood-salmon', quantity: 1, unit: 'pound' },
        { slug: 'spice-kosher-salt', quantity: 1, unit: 'tbsp' },
        { slug: 'sweetener-brown-sugar', quantity: 1, unit: 'tbsp' },
      ],
      output: { slug: 'seafood-salmon-smoked', quantity: 12, unit: 'oz' },
      equipment: ['Smoker or covered grill', 'Food thermometer'],
      instructions: [
        'Season the salmon with salt and brown sugar and refrigerate while the smoker or grill is prepared.',
        'Hot-smoke over indirect heat until the center of the thickest portion reaches 145°F (63°C).',
        'Cool promptly, portion, and refrigerate the finished smoked salmon.',
      ],
    },
    {
      id: 'cook-jasmine-rice',
      name: 'Cook Jasmine Rice',
      kind: 'cook',
      buyable: true,
      inputs: [{ slug: 'grain-rice-jasmine', quantity: 1, unit: 'cup' }],
      output: { slug: 'grain-rice-cooked', quantity: 3, unit: 'cup' },
      equipment: ['Saucepan with lid'],
      instructions: [
        'Rinse the rice if desired and cook it with the appropriate amount of water for the selected rice.',
        'Rest covered after cooking, then fluff and cool promptly if it will be stored for later use.',
      ],
    },
    {
      id: 'make-ghee',
      name: 'Ghee from Butter',
      kind: 'process',
      buyable: true,
      inputs: [{ slug: 'dairy-butter-unsalted', quantity: 4, unit: 'stick' }],
      output: { slug: 'dairy-ghee', quantity: 1.5, unit: 'cup' },
      equipment: ['Saucepan', 'Fine-mesh strainer'],
      instructions: [
        'Melt the butter gently and continue cooking until the milk solids separate and lightly brown.',
        'Strain the clear butterfat through a fine filter into a clean heat-safe container.',
      ],
    },
    {
      id: 'make-clarified-butter',
      name: 'Clarified Butter',
      kind: 'process',
      buyable: true,
      inputs: [{ slug: 'dairy-butter-unsalted', quantity: 2, unit: 'stick' }],
      output: { slug: 'oil-clarified-butter', quantity: 0.75, unit: 'cup' },
      equipment: ['Saucepan', 'Fine-mesh strainer'],
      instructions: [
        'Melt butter over low heat without browning the milk solids.',
        'Skim foam and strain away the separated milk solids, keeping the clear butterfat.',
      ],
    },
    {
      id: 'make-refried-beans',
      name: 'Refried Pinto Beans',
      kind: 'cook',
      buyable: true,
      inputs: [
        { slug: 'legume-pinto-beans', quantity: 1, unit: 'can' },
        { slug: 'oil-canola', quantity: 1, unit: 'tbsp' },
        { slug: 'spice-cumin', quantity: 0.5, unit: 'tsp' },
      ],
      output: { slug: 'legume-refried-beans', quantity: 1.5, unit: 'cup' },
      equipment: ['Skillet', 'Potato masher'],
      instructions: [
        'Warm the oil and cumin, then add drained pinto beans with a splash of water.',
        'Mash while heating until the beans reach the desired refried-bean consistency.',
      ],
    },
    {
      id: 'marinate-artichoke-hearts',
      name: 'Marinated Artichoke Hearts',
      kind: 'process',
      buyable: true,
      inputs: [
        { slug: 'veg-artichoke', quantity: 1, unit: 'can' },
        { slug: 'oil-olive-extra-virgin', quantity: 0.25, unit: 'cup' },
        { slug: 'condiment-apple-cider-vinegar', quantity: 2, unit: 'tbsp' },
      ],
      output: { slug: 'veg-artichoke-hearts-marinated', quantity: 1.5, unit: 'cup' },
      equipment: ['Mixing bowl', 'Covered refrigerator container'],
      instructions: [
        'Drain the artichoke hearts and toss them with oil and vinegar.',
        'Refrigerate in a covered container so the flavors can meld before use.',
      ],
    },
    {
      id: 'roast-red-peppers',
      name: 'Roasted Red Peppers',
      kind: 'cook',
      buyable: true,
      inputs: [{ slug: 'veg-bell-pepper-red', quantity: 4, unit: 'each' }],
      output: { slug: 'veg-roasted-red-peppers-jarred', quantity: 2, unit: 'cup' },
      equipment: ['Oven or broiler', 'Baking sheet'],
      instructions: [
        'Char the peppers under a broiler or in a hot oven, turning until the skins are blistered.',
        'Cover briefly to steam, then peel, seed, and slice. Refrigerate rather than shelf-canning.',
      ],
    },
    {
      id: 'freeze-mixed-berries',
      name: 'Freeze Mixed Berries',
      kind: 'preserve',
      buyable: true,
      inputs: [{ slug: 'fruit-mixed-berries', quantity: 3, unit: 'cup' }],
      output: { slug: 'fruit-mixed-berries-frozen', quantity: 3, unit: 'cup' },
      equipment: ['Sheet pan', 'Freezer-safe bag or container'],
      instructions: [
        'Dry the berries well and freeze them in a single layer until firm.',
        'Transfer the frozen berries to a freezer-safe bag or container.',
      ],
    },
    {
      id: 'freeze-chopped-spinach',
      name: 'Frozen Chopped Spinach',
      kind: 'preserve',
      buyable: true,
      inputs: [{ slug: 'veg-spinach', quantity: 16, unit: 'oz' }],
      output: { slug: 'veg-spinach-frozen-chopped', quantity: 10, unit: 'oz' },
      equipment: ['Pot', 'Ice bath', 'Freezer-safe bag'],
      instructions: [
        'Blanch the spinach briefly, chill it immediately, drain thoroughly, and chop it.',
        'Portion into a freezer-safe bag, remove excess air, and freeze.',
      ],
    },
    {
      id: 'freeze-corn-kernels',
      name: 'Frozen Corn Kernels',
      kind: 'preserve',
      buyable: true,
      inputs: [{ slug: 'veg-corn-ear-fresh', quantity: 4, unit: 'each' }],
      output: { slug: 'veg-corn-kernels-frozen', quantity: 3, unit: 'cup' },
      equipment: ['Pot', 'Ice bath', 'Knife', 'Freezer-safe bag'],
      instructions: [
        'Blanch the corn ears, chill them immediately, and cut the kernels from the cobs.',
        'Dry, portion, and freeze the kernels in a freezer-safe bag.',
      ],
    },
  ];

  global.BLISSFUL_INGREDIENT_PROCESSES = processes;
  if (typeof module !== 'undefined' && module.exports) module.exports = processes;
})(typeof window !== 'undefined' ? window : globalThis);
