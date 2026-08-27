;(function (global) {
  const catalog = [
    {
      "token": "oven",
      "name": "Oven",
      "category": "Appliances"
    },
    {
      "token": "stovetop",
      "name": "Stovetop",
      "category": "Appliances"
    },
    {
      "token": "broiler",
      "name": "Broiler",
      "category": "Appliances"
    },
    {
      "token": "grill",
      "name": "Grill",
      "category": "Appliances"
    },
    {
      "token": "smoker",
      "name": "Smoker",
      "category": "Appliances"
    },
    {
      "token": "microwave",
      "name": "Microwave",
      "category": "Appliances"
    },
    {
      "token": "refrigerator",
      "name": "Refrigerator",
      "category": "Appliances"
    },
    {
      "token": "freezer",
      "name": "Freezer",
      "category": "Appliances"
    },
    {
      "token": "air-fryer",
      "name": "Air Fryer",
      "category": "Small Appliances"
    },
    {
      "token": "blender",
      "name": "Blender",
      "category": "Small Appliances"
    },
    {
      "token": "espresso-machine",
      "name": "Espresso Machine",
      "category": "Small Appliances"
    },
    {
      "token": "food-processor",
      "name": "Food Processor",
      "category": "Small Appliances"
    },
    {
      "token": "hand-mixer",
      "name": "Hand Mixer",
      "category": "Small Appliances"
    },
    {
      "token": "ice-cream-maker",
      "name": "Ice Cream Maker",
      "category": "Small Appliances"
    },
    {
      "token": "immersion-blender",
      "name": "Immersion Blender",
      "category": "Small Appliances"
    },
    {
      "token": "panini-press",
      "name": "Panini Press",
      "category": "Small Appliances"
    },
    {
      "token": "slow-cooker",
      "name": "Slow Cooker",
      "category": "Small Appliances"
    },
    {
      "token": "stand-mixer",
      "name": "Stand Mixer",
      "category": "Small Appliances"
    },
    {
      "token": "toaster",
      "name": "Toaster",
      "category": "Small Appliances"
    },
    {
      "token": "waffle-iron",
      "name": "Waffle Iron",
      "category": "Small Appliances"
    },
    {
      "token": "cast-iron-skillet",
      "name": "Cast Iron Skillet",
      "category": "Cookware",
      "aliases": [
        "Cast-Iron Skillet"
      ]
    },
    {
      "token": "double-boiler",
      "name": "Double Boiler",
      "category": "Cookware"
    },
    {
      "token": "dutch-oven",
      "name": "Dutch Oven",
      "category": "Cookware",
      "variants": [
        {
          "id": "dutch-ovens-5-qt",
          "label": "5 qt"
        },
        {
          "id": "dutch-ovens-7-qt",
          "label": "7 qt"
        }
      ]
    },
    {
      "token": "fondue-pot",
      "name": "Fondue Pot",
      "category": "Cookware"
    },
    {
      "token": "griddle",
      "name": "Griddle",
      "category": "Cookware"
    },
    {
      "token": "grill-pan",
      "name": "Grill Pan",
      "category": "Cookware"
    },
    {
      "token": "nonstick-skillet",
      "name": "Nonstick Skillet",
      "category": "Cookware"
    },
    {
      "token": "oven-safe-skillet",
      "name": "Oven-Safe Skillet",
      "category": "Cookware"
    },
    {
      "token": "saucepan",
      "name": "Saucepan",
      "category": "Cookware",
      "variants": [
        {
          "id": "saucepans-1-qt",
          "label": "1 qt"
        },
        {
          "id": "saucepans-2-qt",
          "label": "2 qt"
        },
        {
          "id": "saucepans-3-qt",
          "label": "3 qt"
        }
      ]
    },
    {
      "token": "skillet",
      "name": "Skillet",
      "category": "Cookware",
      "aliases": [
        "Frying Pan"
      ],
      "variants": [
        {
          "id": "skillets-8-in",
          "label": "8 in"
        },
        {
          "id": "skillets-10-in",
          "label": "10 in"
        },
        {
          "id": "skillets-12-in",
          "label": "12 in"
        }
      ]
    },
    {
      "token": "stock-pot",
      "name": "Stock Pot",
      "category": "Cookware",
      "aliases": [
        "Stockpot"
      ],
      "variants": [
        {
          "id": "stock-pots-8-qt",
          "label": "8 qt"
        },
        {
          "id": "stock-pots-12-qt",
          "label": "12 qt"
        }
      ]
    },
    {
      "token": "wok",
      "name": "Wok",
      "category": "Cookware"
    },
    {
      "token": "baking-dish",
      "name": "Baking Dish",
      "category": "Bakeware"
    },
    {
      "token": "baking-sheet",
      "name": "Baking Sheet",
      "category": "Bakeware",
      "aliases": [
        "Baking Sheets",
        "Sheet Pan",
        "Rimmed Baking Sheet",
        "Parchment Lined Tray"
      ],
      "legacyTokens": [
        "baking-sheets",
        "sheet-pan",
        "parchment-lined-tray"
      ],
      "variants": [
        {
          "id": "baking-sheets-quarter",
          "label": "Quarter sheet · 9 × 13 in"
        },
        {
          "id": "baking-sheets-half",
          "label": "Half sheet · 13 × 18 in"
        }
      ]
    },
    {
      "token": "cake-pans",
      "name": "Cake Pans",
      "category": "Bakeware",
      "aliases": [
        "Cake Pan",
        "Round Cake Pan",
        "Round Cake Pans"
      ],
      "variants": [
        {
          "id": "cake-pans-8-in-round",
          "label": "8 in round"
        },
        {
          "id": "cake-pans-9-in-round",
          "label": "9 in round"
        },
        {
          "id": "cake-pans-9x13",
          "label": "9 × 13 in rectangular"
        }
      ]
    },
    {
      "token": "loaf-pan",
      "name": "Loaf Pan",
      "category": "Bakeware",
      "aliases": [
        "Loaf Pans"
      ],
      "legacyTokens": [
        "loaf-pans"
      ],
      "variants": [
        {
          "id": "loaf-pans-8-5x4-5",
          "label": "8.5 × 4.5 in"
        },
        {
          "id": "loaf-pans-9x5",
          "label": "9 × 5 in"
        }
      ]
    },
    {
      "token": "muffin-tin",
      "name": "Muffin Tin",
      "category": "Bakeware"
    },
    {
      "token": "pie-plate",
      "name": "Pie Plate",
      "category": "Bakeware"
    },
    {
      "token": "pizza-stone",
      "name": "Pizza Stone",
      "category": "Bakeware",
      "aliases": [
        "Stone"
      ]
    },
    {
      "token": "ramekins",
      "name": "Ramekins",
      "category": "Bakeware"
    },
    {
      "token": "roasting-pan",
      "name": "Roasting Pan",
      "category": "Bakeware"
    },
    {
      "token": "springform-pan",
      "name": "Springform Pan",
      "category": "Bakeware"
    },
    {
      "token": "tart-pan",
      "name": "Tart Pan",
      "category": "Bakeware"
    },
    {
      "token": "wire-rack",
      "name": "Wire Rack",
      "category": "Bakeware"
    },
    {
      "token": "chef-knife",
      "name": "Chef's Knife",
      "category": "Prep & Measuring",
      "aliases": [
        "Chef Knife"
      ]
    },
    {
      "token": "citrus-juicer",
      "name": "Citrus Juicer",
      "category": "Prep & Measuring"
    },
    {
      "token": "citrus-zester",
      "name": "Citrus Zester",
      "category": "Prep & Measuring"
    },
    {
      "token": "colander",
      "name": "Colander",
      "category": "Prep & Measuring"
    },
    {
      "token": "cutting-board",
      "name": "Cutting Board",
      "category": "Prep & Measuring"
    },
    {
      "token": "ice-bath",
      "name": "Ice Bath",
      "category": "Prep & Measuring"
    },
    {
      "token": "liquid-measuring-cups",
      "name": "Liquid Measuring Cups",
      "category": "Prep & Measuring",
      "aliases": [
        "Liquid Measuring Cup"
      ],
      "variants": [
        {
          "id": "liquid-measuring-cups-1-cup",
          "label": "1 cup"
        },
        {
          "id": "liquid-measuring-cups-2-cup",
          "label": "2 cup"
        },
        {
          "id": "liquid-measuring-cups-4-cup",
          "label": "4 cup"
        }
      ]
    },
    {
      "token": "mandoline",
      "name": "Mandoline",
      "category": "Prep & Measuring"
    },
    {
      "token": "measuring-cups",
      "name": "Measuring Cups",
      "category": "Prep & Measuring",
      "aliases": [
        "Measuring Cup",
        "Dry Measuring Cup",
        "Dry Measuring Cups"
      ],
      "variants": [
        {
          "id": "measuring-cups-1-4-cup",
          "label": "1/4 cup"
        },
        {
          "id": "measuring-cups-1-3-cup",
          "label": "1/3 cup"
        },
        {
          "id": "measuring-cups-1-2-cup",
          "label": "1/2 cup"
        },
        {
          "id": "measuring-cups-1-cup",
          "label": "1 cup"
        }
      ]
    },
    {
      "token": "measuring-spoons",
      "name": "Measuring Spoons",
      "category": "Prep & Measuring",
      "aliases": [
        "Measuring Spoon"
      ],
      "variants": [
        {
          "id": "measuring-spoons-1-4-tsp",
          "label": "1/4 tsp"
        },
        {
          "id": "measuring-spoons-1-2-tsp",
          "label": "1/2 tsp"
        },
        {
          "id": "measuring-spoons-1-tsp",
          "label": "1 tsp"
        },
        {
          "id": "measuring-spoons-1-tbsp",
          "label": "1 tbsp"
        }
      ]
    },
    {
      "token": "mixing-bowls",
      "name": "Mixing Bowls",
      "category": "Prep & Measuring",
      "aliases": [
        "Mixing Bowl"
      ],
      "variants": [
        {
          "id": "mixing-bowls-small",
          "label": "Small · about 1.5 qt"
        },
        {
          "id": "mixing-bowls-medium",
          "label": "Medium · about 3 qt"
        },
        {
          "id": "mixing-bowls-large",
          "label": "Large · about 5 qt"
        }
      ]
    },
    {
      "token": "potato-masher",
      "name": "Potato Masher",
      "category": "Prep & Measuring"
    },
    {
      "token": "potato-ricer",
      "name": "Potato Ricer",
      "category": "Prep & Measuring"
    },
    {
      "token": "rolling-pin",
      "name": "Rolling Pin",
      "category": "Prep & Measuring"
    },
    {
      "token": "sharp-knife",
      "name": "Sharp Knife",
      "category": "Prep & Measuring"
    },
    {
      "token": "small-bowls",
      "name": "Small Bowls",
      "category": "Prep & Measuring"
    },
    {
      "token": "spiralizer",
      "name": "Spiralizer",
      "category": "Prep & Measuring"
    },
    {
      "token": "strainer",
      "name": "Strainer",
      "category": "Prep & Measuring"
    },
    {
      "token": "fryer-thermometer",
      "name": "Fryer Thermometer",
      "category": "Utensils & Tools"
    },
    {
      "token": "instant-read-thermometer",
      "name": "Instant-Read Thermometer",
      "category": "Utensils & Tools"
    },
    {
      "token": "kitchen-shears",
      "name": "Kitchen Shears",
      "category": "Utensils & Tools"
    },
    {
      "token": "kitchen-torch",
      "name": "Kitchen Torch",
      "category": "Utensils & Tools"
    },
    {
      "token": "mixing-spoon",
      "name": "Mixing Spoon",
      "category": "Utensils & Tools"
    },
    {
      "token": "pastry-brush",
      "name": "Pastry Brush",
      "category": "Utensils & Tools",
      "aliases": [
        "Basting Brush"
      ]
    },
    {
      "token": "piping-bag",
      "name": "Piping Bag",
      "category": "Utensils & Tools"
    },
    {
      "token": "pizza-peel",
      "name": "Pizza Peel",
      "category": "Utensils & Tools"
    },
    {
      "token": "skewers",
      "name": "Skewers",
      "category": "Utensils & Tools"
    },
    {
      "token": "slotted-spoon",
      "name": "Slotted Spoon",
      "category": "Utensils & Tools"
    },
    {
      "token": "spatula",
      "name": "Spatula",
      "category": "Utensils & Tools"
    },
    {
      "token": "spider-strainer",
      "name": "Spider Strainer",
      "category": "Utensils & Tools"
    },
    {
      "token": "spoon",
      "name": "Spoon",
      "category": "Utensils & Tools"
    },
    {
      "token": "spreader",
      "name": "Spreader",
      "category": "Utensils & Tools"
    },
    {
      "token": "tongs",
      "name": "Tongs",
      "category": "Utensils & Tools"
    },
    {
      "token": "whisk",
      "name": "Whisk",
      "category": "Utensils & Tools"
    },
    {
      "token": "wooden-spoon",
      "name": "Wooden Spoon",
      "category": "Utensils & Tools"
    },
    {
      "token": "pitcher",
      "name": "Pitcher",
      "category": "Storage & Serving"
    },
    {
      "token": "serving-board",
      "name": "Serving Board",
      "category": "Storage & Serving"
    },
    {
      "token": "serving-cups",
      "name": "Serving Cups",
      "category": "Storage & Serving"
    },
    {
      "token": "serving-glasses",
      "name": "Serving Glasses",
      "category": "Storage & Serving"
    },
    {
      "token": "serving-platter",
      "name": "Serving Platter",
      "category": "Storage & Serving",
      "aliases": [
        "Serving Platters"
      ]
    },
    {
      "token": "storage-bags",
      "name": "Storage Bags",
      "category": "Storage & Serving"
    },
    {
      "token": "storage-container",
      "name": "Storage Container",
      "category": "Storage & Serving",
      "aliases": [
        "Storage Containers"
      ]
    },
    {
      "token": "paper-towels",
      "name": "Paper Towels",
      "category": "Kitchen Supplies"
    },
    {
      "token": "parchment-paper",
      "name": "Parchment Paper",
      "category": "Kitchen Supplies"
    },
    {
      "token": "toothpicks",
      "name": "Toothpicks",
      "category": "Kitchen Supplies"
    }
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = catalog;
  global.BLISSFUL_EQUIPMENT = catalog;
})(typeof window !== 'undefined' ? window : globalThis);
