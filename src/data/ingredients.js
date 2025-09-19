// Ingredient dataset is kept in single-line entries grouped by category for easier maintenance.
// Each ingredient includes a slug, display name, category, and descriptive tags for quick filtering.
export const ingredients = [
  // Pasta (generally contains gluten unless specified)
  { slug: 'pasta-spaghetti', name: 'Spaghetti', category: 'Pasta', tags: ['Contains Gluten', 'Vegetarian'] },
  { slug: 'pasta-penne', name: 'Penne', category: 'Pasta', tags: ['Contains Gluten', 'Vegetarian'] },
  { slug: 'pasta-fusilli', name: 'Fusilli', category: 'Pasta', tags: ['Contains Gluten', 'Vegetarian'] },
  { slug: 'pasta-linguine', name: 'Linguine', category: 'Pasta', tags: ['Contains Gluten', 'Vegetarian'] },
  { slug: 'pasta-macaroni', name: 'Macaroni', category: 'Pasta', tags: ['Contains Gluten', 'Vegetarian'] },
  { slug: 'pasta-egg-noodles', name: 'Egg Noodles', category: 'Pasta', tags: ['Contains Gluten', 'Contains Eggs', 'Vegetarian'] },
  { slug: 'pasta-rice-noodles', name: 'Rice Noodles', category: 'Pasta', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'pasta-soba-buckwheat', name: 'Soba (Buckwheat)', category: 'Pasta', tags: ['May Contain Gluten', 'Vegetarian'] }, // many soba blends include wheat
  { slug: 'pasta-gluten-free-blend', name: 'Gluten-Free Pasta (corn/rice/quinoa)', category: 'Pasta', tags: ['Gluten-Free', 'Vegetarian'] },

  // Dairy
  { slug: 'dairy-butter-unsalted', name: 'Butter (Unsalted)', category: 'Dairy', tags: ['Contains Dairy', 'Vegetarian'] },
  { slug: 'dairy-butter-salted', name: 'Butter (Salted)', category: 'Dairy', tags: ['Contains Dairy', 'Vegetarian'] },
  { slug: 'dairy-cream-heavy', name: 'Heavy Cream', category: 'Dairy', tags: ['Contains Dairy', 'Vegetarian'] },
  { slug: 'dairy-cream-sour', name: 'Sour Cream', category: 'Dairy', tags: ['Contains Dairy', 'Vegetarian'] },
  { slug: 'dairy-milk-whole', name: 'Milk (Whole)', category: 'Dairy', tags: ['Contains Dairy', 'Vegetarian'] },
  { slug: 'dairy-milk-2', name: 'Milk (2%)', category: 'Dairy', tags: ['Contains Dairy', 'Vegetarian'] },
  { slug: 'dairy-milk-skim', name: 'Milk (Skim)', category: 'Dairy', tags: ['Contains Dairy', 'Vegetarian'] },
  { slug: 'dairy-cheese-cheddar', name: 'Cheddar', category: 'Dairy', tags: ['Contains Dairy', 'Vegetarian'] },
  { slug: 'dairy-cheese-mozzarella', name: 'Mozzarella', category: 'Dairy', tags: ['Contains Dairy', 'Vegetarian'] },
  { slug: 'dairy-cheese-parmesan', name: 'Parmesan', category: 'Dairy', tags: ['Contains Dairy', 'Vegetarian'] },
  { slug: 'dairy-yogurt-plain', name: 'Yogurt (Plain)', category: 'Dairy', tags: ['Contains Dairy', 'Vegetarian'] },
  { slug: 'dairy-ghee', name: 'Ghee', category: 'Dairy', tags: ['Contains Dairy', 'Vegetarian'] },

  // Meat (raw single-ingredient; suitability tags are general)
  { slug: 'meat-beef-ground-85', name: 'Ground Beef (85% Lean)', category: 'Meat', tags: ['Halal-Friendly', 'Kosher-Friendly', 'Paleo'] },
  { slug: 'meat-beef-steak-ribeye', name: 'Beef Ribeye', category: 'Meat', tags: ['Halal-Friendly', 'Kosher-Friendly', 'Paleo'] },
  { slug: 'meat-chicken-breast', name: 'Chicken Breast', category: 'Meat', tags: ['Halal-Friendly', 'Kosher-Friendly', 'Paleo'] },
  { slug: 'meat-chicken-thigh', name: 'Chicken Thigh', category: 'Meat', tags: ['Halal-Friendly', 'Kosher-Friendly', 'Paleo'] },
  { slug: 'meat-pork-chop', name: 'Pork Chop', category: 'Meat', tags: ['Paleo'] },
  { slug: 'meat-pork-shoulder', name: 'Pork Shoulder', category: 'Meat', tags: ['Paleo'] },
  { slug: 'meat-turkey-ground', name: 'Ground Turkey', category: 'Meat', tags: ['Halal-Friendly', 'Kosher-Friendly', 'Paleo'] },
  { slug: 'meat-lamb-leg', name: 'Lamb Leg', category: 'Meat', tags: ['Halal-Friendly', 'Kosher-Friendly', 'Paleo'] },
  { slug: 'meat-bacon', name: 'Bacon', category: 'Meat', tags: ['Paleo'] },

  // Seafood (included for completeness; mark pescatarian)
  { slug: 'seafood-salmon', name: 'Salmon', category: 'Seafood', tags: ['Pescatarian', 'Gluten-Free'] },
  { slug: 'seafood-tuna', name: 'Tuna', category: 'Seafood', tags: ['Pescatarian', 'Gluten-Free'] },
  { slug: 'seafood-shrimp', name: 'Shrimp', category: 'Seafood', tags: ['Pescatarian', 'Gluten-Free', 'Shellfish'] },

  // Herbs
  { slug: 'herb-basil', name: 'Basil', category: 'Herb', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'herb-cilantro', name: 'Cilantro', category: 'Herb', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'herb-dill', name: 'Dill', category: 'Herb', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'herb-mint', name: 'Mint', category: 'Herb', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'herb-oregano', name: 'Oregano', category: 'Herb', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'herb-parsley', name: 'Parsley', category: 'Herb', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'herb-rosemary', name: 'Rosemary', category: 'Herb', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'herb-thyme', name: 'Thyme', category: 'Herb', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },

  // Spices
  { slug: 'spice-black-pepper', name: 'Black Pepper', category: 'Spice', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'spice-cayenne', name: 'Cayenne', category: 'Spice', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Nightshade'] },
  { slug: 'spice-chili-powder', name: 'Chili Powder', category: 'Spice', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Nightshade'] },
  { slug: 'spice-cinnamon', name: 'Cinnamon', category: 'Spice', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'spice-cumin', name: 'Cumin', category: 'Spice', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'spice-garlic-powder', name: 'Garlic Powder', category: 'Spice', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Allium'] },
  { slug: 'spice-onion-powder', name: 'Onion Powder', category: 'Spice', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Allium'] },
  { slug: 'spice-paprika', name: 'Paprika', category: 'Spice', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Nightshade'] },
  { slug: 'spice-turmeric', name: 'Turmeric', category: 'Spice', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'spice-ginger-ground', name: 'Ginger (Ground)', category: 'Spice', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },

  // Vegetables
  { slug: 'veg-asparagus', name: 'Asparagus', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'veg-bell-pepper-red', name: 'Bell Pepper (Red)', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Nightshade', 'Low-FODMAP'] },
  { slug: 'veg-broccoli', name: 'Broccoli', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'veg-carrot', name: 'Carrot', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'veg-cauliflower', name: 'Cauliflower', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'veg-celery', name: 'Celery', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'veg-corn', name: 'Corn', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'veg-cucumber', name: 'Cucumber', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'veg-eggplant', name: 'Eggplant', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Nightshade'] },
  { slug: 'veg-garlic', name: 'Garlic', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Allium'] },
  { slug: 'veg-green-beans', name: 'Green Beans', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'veg-kale', name: 'Kale', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'veg-lettuce-romaine', name: 'Romaine Lettuce', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'veg-mushroom-button', name: 'Button Mushroom', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'veg-onion-yellow', name: 'Onion (Yellow)', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Allium'] },
  { slug: 'veg-pea-frozen', name: 'Peas (Frozen)', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'veg-potato-russet', name: 'Potato (Russet)', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Nightshade', 'Low-FODMAP'] },
  { slug: 'veg-spinach', name: 'Spinach', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'veg-sweet-potato', name: 'Sweet Potato', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'veg-tomato-roma', name: 'Tomato (Roma)', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Nightshade'] },
  { slug: 'veg-zucchini', name: 'Zucchini', category: 'Vegetable', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },

  // Fruits
  { slug: 'fruit-apple', name: 'Apple', category: 'Fruit', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'fruit-avocado', name: 'Avocado', category: 'Fruit', tags: ['Gluten-Free', 'Vegan', 'Vegetarian'] },
  { slug: 'fruit-banana', name: 'Banana', category: 'Fruit', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'fruit-blueberry', name: 'Blueberries', category: 'Fruit', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'fruit-grapes', name: 'Grapes', category: 'Fruit', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'fruit-lemon', name: 'Lemon', category: 'Fruit', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'fruit-lime', name: 'Lime', category: 'Fruit', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'fruit-orange', name: 'Orange', category: 'Fruit', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },
  { slug: 'fruit-strawberry', name: 'Strawberries', category: 'Fruit', tags: ['Gluten-Free', 'Vegan', 'Vegetarian', 'Low-FODMAP'] },

  // Nuts & Seeds
  { slug: 'nut-almond', name: 'Almonds', category: 'Nut/Seed', tags: ['Contains Nuts', 'Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'nut-cashew', name: 'Cashews', category: 'Nut/Seed', tags: ['Contains Nuts', 'Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'nut-peanut', name: 'Peanuts', category: 'Nut/Seed', tags: ['Contains Nuts', 'Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'nut-pistachio', name: 'Pistachios', category: 'Nut/Seed', tags: ['Contains Nuts', 'Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'seed-chia', name: 'Chia Seeds', category: 'Nut/Seed', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'seed-flax', name: 'Flaxseed', category: 'Nut/Seed', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'seed-pumpkin', name: 'Pumpkin Seeds', category: 'Nut/Seed', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'seed-sesame', name: 'Sesame Seeds', category: 'Nut/Seed', tags: ['Gluten-Free', 'Vegetarian', 'Vegan', 'Sesame'] },
  { slug: 'seed-sunflower', name: 'Sunflower Seeds', category: 'Nut/Seed', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'nut-walnut', name: 'Walnuts', category: 'Nut/Seed', tags: ['Contains Nuts', 'Gluten-Free', 'Vegetarian', 'Vegan'] },

  // Grains & Cereals
  { slug: 'grain-barley', name: 'Barley', category: 'Grain', tags: ['Contains Gluten', 'Vegetarian', 'Vegan'] },
  { slug: 'grain-bulgur', name: 'Bulgur', category: 'Grain', tags: ['Contains Gluten', 'Vegetarian', 'Vegan'] },
  { slug: 'grain-cornmeal', name: 'Cornmeal', category: 'Grain', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'grain-farro', name: 'Farro', category: 'Grain', tags: ['Contains Gluten', 'Vegetarian', 'Vegan'] },
  { slug: 'grain-oats', name: 'Oats (standard)', category: 'Grain', tags: ['May Contain Gluten', 'Vegetarian', 'Vegan'] }, // cross-contact unless certified GF
  { slug: 'grain-oats-gf', name: 'Oats (Certified GF)', category: 'Grain', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'grain-quinoa', name: 'Quinoa', category: 'Grain', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'grain-rice-basmati', name: 'Rice (Basmati)', category: 'Grain', tags: ['Gluten-Free', 'Vegetarian', 'Vegan', 'Low-FODMAP'] },
  { slug: 'grain-rice-brown', name: 'Rice (Brown)', category: 'Grain', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'grain-wheat-flour-ap', name: 'Wheat Flour (All-Purpose)', category: 'Grain', tags: ['Contains Gluten', 'Vegetarian', 'Vegan'] },

  // Legumes
  { slug: 'legume-black-beans', name: 'Black Beans', category: 'Legume', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'legume-chickpea', name: 'Chickpeas', category: 'Legume', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'legume-edamame', name: 'Edamame', category: 'Legume', tags: ['Gluten-Free', 'Vegetarian', 'Vegan', 'Contains Soy'] },
  { slug: 'legume-kidney-beans', name: 'Kidney Beans', category: 'Legume', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'legume-lentil-brown', name: 'Lentils (Brown)', category: 'Legume', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'legume-peanut', name: 'Peanuts (Legume)', category: 'Legume', tags: ['Contains Nuts', 'Gluten-Free', 'Vegetarian', 'Vegan'] },

  // Oils & Fats
  { slug: 'oil-avocado', name: 'Avocado Oil', category: 'Oil/Fat', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'oil-canola', name: 'Canola Oil', category: 'Oil/Fat', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'oil-coconut', name: 'Coconut Oil', category: 'Oil/Fat', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'oil-olive-extra-virgin', name: 'Olive Oil (Extra Virgin)', category: 'Oil/Fat', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'oil-sesame', name: 'Sesame Oil', category: 'Oil/Fat', tags: ['Gluten-Free', 'Vegetarian', 'Vegan', 'Sesame'] },
  { slug: 'fat-lard', name: 'Lard', category: 'Oil/Fat', tags: ['Gluten-Free', 'Paleo'] },

  // Sweeteners
  { slug: 'sweetener-brown-sugar', name: 'Brown Sugar', category: 'Sweetener', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'sweetener-honey', name: 'Honey', category: 'Sweetener', tags: ['Gluten-Free', 'Vegetarian'] }, // not vegan
  { slug: 'sweetener-maple-syrup', name: 'Maple Syrup', category: 'Sweetener', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'sweetener-white-sugar', name: 'White Sugar', category: 'Sweetener', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },

  // Baking
  { slug: 'baking-baking-powder', name: 'Baking Powder', category: 'Baking', tags: ['Gluten-Free*', 'Vegetarian', 'Vegan'] }, // *many are GF; check brand
  { slug: 'baking-baking-soda', name: 'Baking Soda', category: 'Baking', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'baking-cocoa-powder', name: 'Cocoa Powder', category: 'Baking', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'baking-cornstarch', name: 'Cornstarch', category: 'Baking', tags: ['Gluten-Free', 'Vegetarian', 'Vegan', 'Low-FODMAP'] },
  { slug: 'baking-egg', name: 'Eggs', category: 'Baking', tags: ['Contains Eggs'] },
  { slug: 'baking-yeast-active-dry', name: 'Yeast (Active Dry)', category: 'Baking', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'baking-vanilla-extract', name: 'Vanilla Extract', category: 'Baking', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },

  // Condiments & Sauces
  { slug: 'condiment-apple-cider-vinegar', name: 'Apple Cider Vinegar', category: 'Condiment/Sauce', tags: ['Gluten-Free', 'Vegetarian', 'Vegan', 'Low-FODMAP'] },
  { slug: 'condiment-balsamic-vinegar', name: 'Balsamic Vinegar', category: 'Condiment/Sauce', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'condiment-dijon-mustard', name: 'Dijon Mustard', category: 'Condiment/Sauce', tags: ['Gluten-Free*', 'Vegetarian', 'Vegan'] },
  { slug: 'condiment-ketchup', name: 'Ketchup', category: 'Condiment/Sauce', tags: ['Gluten-Free*', 'Vegetarian', 'Vegan'] },
  { slug: 'condiment-mayonnaise', name: 'Mayonnaise', category: 'Condiment/Sauce', tags: ['Contains Eggs', 'Gluten-Free*', 'Vegetarian'] },
  { slug: 'condiment-soy-sauce', name: 'Soy Sauce', category: 'Condiment/Sauce', tags: ['Contains Soy', 'Contains Gluten', 'Vegetarian', 'Vegan'] },
  { slug: 'condiment-tamari-gf', name: 'Tamari (GF)', category: 'Condiment/Sauce', tags: ['Gluten-Free', 'Contains Soy', 'Vegetarian', 'Vegan'] },
  { slug: 'condiment-sriracha', name: 'Sriracha', category: 'Condiment/Sauce', tags: ['Gluten-Free*', 'Vegetarian', 'Vegan', 'Nightshade'] },
  { slug: 'condiment-hot-sauce', name: 'Hot Sauce', category: 'Condiment/Sauce', tags: ['Gluten-Free*', 'Vegetarian', 'Vegan', 'Nightshade'] },
  { slug: 'condiment-worcestershire', name: 'Worcestershire Sauce', category: 'Condiment/Sauce', tags: ['Gluten-Free*', 'Contains Fish*', 'Vegetarian*'] }, // many contain anchovy; some are veg/GF

  // Beverages (common cooking uses: deglazing, marinades)
  { slug: 'bev-chicken-stock', name: 'Chicken Stock', category: 'Beverage', tags: ['Gluten-Free*'] },
  { slug: 'bev-vegetable-stock', name: 'Vegetable Stock', category: 'Beverage', tags: ['Gluten-Free*', 'Vegetarian', 'Vegan'] },
  { slug: 'bev-red-wine', name: 'Red Wine', category: 'Beverage', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'bev-white-wine', name: 'White Wine', category: 'Beverage', tags: ['Gluten-Free', 'Vegetarian', 'Vegan'] },
  { slug: 'bev-beer', name: 'Beer (Standard)', category: 'Beverage', tags: ['Contains Gluten', 'Vegetarian', 'Vegan'] },
]
