import { useMemo, useState } from 'react'

const formatQuantity = (quantity) => {
  if (quantity === null || quantity === undefined) return ''
  const rounded = Math.round(quantity * 100) / 100
  return Number.isInteger(rounded) ? rounded : rounded.toFixed(2)
}

const MealCard = ({
  recipe,
  currentServings,
  onServingChange,
  note,
  onNoteChange,
}) => {
  const [showNotes, setShowNotes] = useState(false)

  const scale = useMemo(() => {
    if (!recipe.baseServings || !currentServings) return 1
    return currentServings / recipe.baseServings
  }, [recipe.baseServings, currentServings])

  const totalNutrition = useMemo(() => {
    if (!recipe.nutritionPerServing) return null
    return Object.entries(recipe.nutritionPerServing).reduce((acc, [key, value]) => {
      acc[key] = Math.round(value * currentServings * 10) / 10
      return acc
    }, {})
  }, [recipe.nutritionPerServing, currentServings])

  return (
    <article className="meal-card">
      <header className="meal-card__header">
        <div>
          <h3>{recipe.name}</h3>
          <p className="meal-card__description">{recipe.description}</p>
          <div className="tag-list">
            {recipe.tags.map((tag) => (
              <span key={tag} className="badge">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="serving-controls">
          <label>
            <span>Servings</span>
            <input
              type="number"
              min={1}
              value={currentServings}
              onChange={(event) => onServingChange(Number(event.target.value) || recipe.baseServings)}
            />
          </label>
          <p className="base-serving">Base: {recipe.baseServings}</p>
        </div>
      </header>
      <section className="meal-card__section">
        <h4>Ingredients</h4>
        <ul className="ingredient-list">
          {recipe.ingredients.map((ingredient) => (
            <li key={`${recipe.id}-${ingredient.item}`}>
              <span className="ingredient-quantity">
                {formatQuantity(ingredient.quantity * scale)} {ingredient.unit}
              </span>
              <span className="ingredient-name">{ingredient.item}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="meal-card__section">
        <h4>Instructions</h4>
        <ol className="instruction-list">
          {recipe.instructions.map((step, index) => (
            <li key={`${recipe.id}-step-${index}`}>{step}</li>
          ))}
        </ol>
      </section>
      <section className="meal-card__details">
        <div>
          <h4>Equipment</h4>
          <ul className="inline-list">
            {recipe.equipment.map((item) => (
              <li key={`${recipe.id}-${item}`}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Allergens</h4>
          <ul className="inline-list">
            {recipe.allergens.length ? (
              recipe.allergens.map((allergen) => (
                <li key={`${recipe.id}-${allergen}`} className="badge badge-soft">
                  {allergen}
                </li>
              ))
            ) : (
              <li className="badge badge-soft">None</li>
            )}
          </ul>
        </div>
      </section>
      {recipe.nutritionPerServing && (
        <section className="meal-card__section nutrition">
          <h4>Nutrition</h4>
          <div className="nutrition-grid">
            {Object.entries(recipe.nutritionPerServing).map(([key, value]) => (
              <div key={`${recipe.id}-${key}`}>
                <span className="nutrition-label">{key}</span>
                <span className="nutrition-value">{value} / serving</span>
                {totalNutrition && (
                  <span className="nutrition-total">{totalNutrition[key]} total</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      <footer className="meal-card__footer">
        <button type="button" onClick={() => setShowNotes((prev) => !prev)}>
          {showNotes ? 'Hide notes' : 'Add notes'}
        </button>
        {showNotes && (
          <textarea
            value={note || ''}
            placeholder="Add personal notes, timing adjustments, or plating ideas"
            onChange={(event) => onNoteChange(event.target.value)}
          />
        )}
      </footer>
    </article>
  )
}

export default MealCard
