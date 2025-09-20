# Blissful Reverie Meal Planner

Blissful Reverie is a self-contained web-based meal planning workspace focused on ingredient discovery and pantry-driven cooking. Open `index.html` in any modern browser to explore recipes without installing dependencies or running a local server.

## Features

- **Card-based recipes** with adjustable serving sizes, detailed ingredients, instructions, nutrition, equipment, and allergen notes.
- **Extensive library** of 72 savoury meals (12 each for chicken, turkey, beef, and pork) plus 24 desserts spanning common tags such as breakfast, lunch, dinner, pasta, soup, sandwich, low-sodium, dairy, no-dairy, and gluten free.
- **Dynamic filters** for full-text search, tags, allergens, required equipment, and ingredient include/exclude rules.
- **Pantry assistant** to maintain a virtual pantry, surface cookable meals, and optionally limit the recipe grid to only what you can make right now.
- **Ingredient atlas** for browsing canonical pantry items with allergen tags, categories, and dietary filters.
- **Personal notes** saved on every card to capture timing adjustments, guest feedback, or plating ideas.

## Using the planner

1. Download or clone this repository.
2. Double-click `index.html` (or open it with any modern browser such as Chrome, Edge, Firefox, or Safari).
3. Start browsing recipes, add pantry items, and filter the library—everything runs entirely in the browser.

## Project structure

```
index.html          Main application shell that loads the static experience
styles/app.css      Global styling for the dashboard and directory
scripts/app.js      Vanilla JavaScript powering interactivity and state management
data/ingredients.js Ingredient directory data exposed as a browser global
data/recipes.js     Full recipe catalogue with metadata and nutrition
```

## Dataset guidelines

- Ingredient metadata lives in `data/ingredients.js`. Each entry stays on a single line with `slug`, `name`, `category`, and `tags` fields.
- Categories should come from the shared set used throughout the planner (Pasta, Dairy, Meat, Seafood, Herb, Spice, Vegetable, Fruit, Nut/Seed, Grain, Legume, Oil/Fat, Sweetener, Baking, Condiment/Sauce, Beverage).
- Tags capture allergen and dietary hints (e.g., `Gluten-Free`, `Contains Nuts`, `Vegan`). Add new tags sparingly so filters remain focused.

### Extending the planner

- Add new recipes by updating `data/recipes.js`. Each recipe supports a base serving size that is used to scale ingredients and nutrition totals on the fly.
- Grow the ingredient directory by editing `data/ingredients.js`. Keep entries on a single line and reuse existing tags when possible.
- For complex filtering or additional metadata, enhance the logic in `scripts/app.js`.

Enjoy planning blissful meals!