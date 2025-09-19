import { useMemo, useState } from 'react'
import './App.css'
import { recipes } from './data/recipes'
import FilterPanel from './components/FilterPanel'
import MealCard from './components/MealCard'
import PantryManager from './components/PantryManager'

const INITIAL_FILTERS = {
  search: '',
  tags: [],
  allergies: [],
  equipment: [],
  includeIngredients: [],
  excludeIngredients: [],
}

const normalizeText = (text) => text.toLowerCase()

const canCookWithPantry = (recipe, pantryItems) => {
  if (!pantryItems.length) return false
  const ingredients = recipe.ingredients.map((ingredient) => normalizeText(ingredient.item))
  return ingredients.every((ingredient) =>
    pantryItems.some((pantryItem) => ingredient.includes(pantryItem) || pantryItem.includes(ingredient)),
  )
}

function App() {
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [servingOverrides, setServingOverrides] = useState({})
  const [notes, setNotes] = useState({})
  const [pantryItems, setPantryItems] = useState([])
  const [showCookableOnly, setShowCookableOnly] = useState(false)

  const tagOptions = useMemo(() => {
    const set = new Set()
    recipes.forEach((recipe) => recipe.tags.forEach((tag) => set.add(tag)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [])

  const allergyOptions = useMemo(() => {
    const defaults = ['dairy', 'gluten', 'eggs', 'nuts', 'soy', 'fish', 'shellfish']
    const set = new Set(defaults)
    recipes.forEach((recipe) => recipe.allergens.forEach((allergen) => set.add(allergen)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [])

  const equipmentOptions = useMemo(() => {
    const set = new Set()
    recipes.forEach((recipe) => recipe.equipment.forEach((item) => set.add(item)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [])

  const ingredientOptions = useMemo(() => {
    const set = new Set()
    recipes.forEach((recipe) => recipe.ingredients.forEach((ingredient) => set.add(ingredient.item.toLowerCase())))
    return Array.from(set).sort()
  }, [])

  const pantryTokens = useMemo(() => pantryItems.map((item) => item.toLowerCase()), [pantryItems])

  const cookableRecipes = useMemo(() => {
    if (!pantryTokens.length) return []
    return recipes.filter((recipe) => canCookWithPantry(recipe, pantryTokens))
  }, [pantryTokens])

  const cookableRecipeIds = useMemo(() => new Set(cookableRecipes.map((recipe) => recipe.id)), [cookableRecipes])

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const haystack = `${recipe.name} ${recipe.description} ${recipe.tags.join(' ')} ${recipe.category}`.toLowerCase()
      const ingredientNames = recipe.ingredients.map((ingredient) => ingredient.item.toLowerCase())

      if (filters.search && !haystack.includes(filters.search.toLowerCase())) {
        return false
      }

      if (filters.tags.length && !filters.tags.every((tag) => recipe.tags.includes(tag))) {
        return false
      }

      if (filters.allergies.length && recipe.allergens.some((allergen) => filters.allergies.includes(allergen))) {
        return false
      }

      if (filters.equipment.length && !filters.equipment.every((item) => recipe.equipment.includes(item))) {
        return false
      }

      if (
        filters.includeIngredients.length &&
        !filters.includeIngredients.every((needle) => ingredientNames.some((name) => name.includes(needle)))
      ) {
        return false
      }

      if (filters.excludeIngredients.length && ingredientNames.some((name) => filters.excludeIngredients.some((ex) => name.includes(ex)))) {
        return false
      }

      if (showCookableOnly && pantryTokens.length && !cookableRecipeIds.has(recipe.id)) {
        return false
      }

      return true
    })
  }, [filters, showCookableOnly, pantryTokens.length, cookableRecipeIds])

  const handleFiltersChange = (nextFilters) => {
    setFilters(nextFilters)
  }

  const handleServingChange = (recipeId, servings) => {
    const validServings = Math.max(1, Math.round(servings))
    setServingOverrides((prev) => ({ ...prev, [recipeId]: validServings }))
  }

  const handleNoteChange = (recipeId, value) => {
    setNotes((prev) => ({ ...prev, [recipeId]: value }))
  }

  const handlePantryAdd = (item) => {
    const normalized = item.toLowerCase()
    if (pantryTokens.includes(normalized)) return
    setPantryItems((prev) => [...prev, normalized])
  }

  const handlePantryRemove = (item) => {
    setPantryItems((prev) => prev.filter((entry) => entry !== item))
  }

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS)
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="title-group">
          <h1>Blissful Reverie Meal Planner</h1>
          <p>Build weekly menus, adapt serving sizes, and filter recipes around your lifestyle.</p>
        </div>
      </header>
      <main className="layout">
        <FilterPanel
          filters={filters}
          onFiltersChange={handleFiltersChange}
          tagOptions={tagOptions}
          allergyOptions={allergyOptions}
          equipmentOptions={equipmentOptions}
          ingredientOptions={ingredientOptions}
          onReset={resetFilters}
        />
        <section className="content">
          <div className="content-header">
            <h2>Meal Library</h2>
            <p>{filteredRecipes.length} meals match your filters.</p>
          </div>
          <div className="meal-grid">
            {filteredRecipes.map((recipe) => (
              <MealCard
                key={recipe.id}
                recipe={recipe}
                currentServings={servingOverrides[recipe.id] ?? recipe.baseServings}
                onServingChange={(value) => handleServingChange(recipe.id, value)}
                note={notes[recipe.id]}
                onNoteChange={(value) => handleNoteChange(recipe.id, value)}
              />
            ))}
            {!filteredRecipes.length && (
              <div className="empty-state">
                <h3>No meals found</h3>
                <p>Try removing a filter or adding more pantry items to expand your options.</p>
              </div>
            )}
          </div>
        </section>
        <PantryManager
          pantryItems={pantryItems}
          onAddItem={handlePantryAdd}
          onRemoveItem={handlePantryRemove}
          cookableRecipes={cookableRecipes}
          showCookableOnly={showCookableOnly}
          onToggleCookable={() => setShowCookableOnly((prev) => !prev)}
        />
      </main>
    </div>
  )
}

export default App
