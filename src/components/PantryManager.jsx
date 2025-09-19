import { useState } from 'react'

const PantryManager = ({
  pantryItems,
  onAddItem,
  onRemoveItem,
  cookableRecipes,
  showCookableOnly,
  onToggleCookable,
}) => {
  const [input, setInput] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!input.trim()) return
    onAddItem(input.trim())
    setInput('')
  }

  return (
    <aside className="pantry-panel">
      <h2>Your Pantry</h2>
      <form className="pantry-form" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Add an ingredient (e.g., chicken, cumin)"
        />
        <button type="submit">Add Item</button>
      </form>
      <ul className="pantry-list">
        {pantryItems.length ? (
          pantryItems.map((item) => (
            <li key={item}>
              <span>{item}</span>
              <button type="button" onClick={() => onRemoveItem(item)}>
                Remove
              </button>
            </li>
          ))
        ) : (
          <li className="empty">No pantry items yet.</li>
        )}
      </ul>
      <div className="cookable-toggle">
        <label>
          <input type="checkbox" checked={showCookableOnly} onChange={onToggleCookable} />
          Show only cookable meals
        </label>
      </div>
      <section className="cookable-list">
        <h3>Meals you can make ({cookableRecipes.length})</h3>
        {cookableRecipes.length ? (
          <ul>
            {cookableRecipes.map((recipe) => (
              <li key={recipe.id}>{recipe.name}</li>
            ))}
          </ul>
        ) : (
          <p className="empty">Add more items to unlock recipes.</p>
        )}
      </section>
    </aside>
  )
}

export default PantryManager
