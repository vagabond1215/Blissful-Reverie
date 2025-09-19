# Blissful Reverie Meal Planner

Blissful Reverie is a web-based meal planning workspace focused on ingredient discovery and pantry-driven cooking. The interface
provides rich recipe cards, flexible filtering, and a smart pantry list that highlights every meal you can cook with the items you
already have on hand.

## Features

- **Card-based recipes** with adjustable serving sizes, detailed ingredients, instructions, nutrition, equipment, and allergen notes.
- **Extensive library** of 72 savoury meals (12 each for chicken, turkey, beef, and pork) plus 24 desserts spanning common tags such
  as breakfast, lunch, dinner, pasta, soup, sandwich, low-sodium, dairy, no-dairy, and gluten free.
- **Dynamic filters** for full-text search, tags, allergens, required equipment, and ingredient include/exclude rules.
- **Pantry assistant** to maintain a virtual pantry, surface cookable meals, and optionally limit the recipe grid to only what you can
  make right now.
- **Personal notes** saved on every card to capture timing adjustments, guest feedback, or plating ideas.

## Getting started

```bash
npm install
npm run dev
```

The development server runs on [http://localhost:5173](http://localhost:5173) with hot reload.

To create a production build:

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  components/      Reusable UI components for filters, cards, and pantry manager
  data/            Full recipe catalogue with nutritional, equipment, and tagging metadata
  App.jsx          Main application shell that orchestrates filters, pantry, and layouts
  App.css          Custom styling for the dashboard experience
```

## Extending the planner

- Add new recipes by updating `src/data/recipes.js`. Each recipe supports a base serving size that is used to scale ingredients and
  nutrition totals on the fly.
- For complex filtering or additional metadata, augment the recipe schema and enhance `App.jsx` logic.
- The pantry matching helper (`canCookWithPantry`) currently performs simple substring checks. It can be swapped with a more robust
  ingredient normaliser if desired.

Enjoy planning blissful meals!
