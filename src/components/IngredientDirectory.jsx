import { useMemo, useState } from 'react'

const GF_TAG = 'Gluten-Free'
const VEGAN_TAG = 'Vegan'

const IngredientDirectory = ({ items }) => {
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [glutenFreeOnly, setGlutenFreeOnly] = useState(false)
  const [veganOnly, setVeganOnly] = useState(false)

  const categoryOrder = useMemo(() => {
    const seen = new Set()
    const ordered = []
    items.forEach((ingredient) => {
      if (!seen.has(ingredient.category)) {
        seen.add(ingredient.category)
        ordered.push(ingredient.category)
      }
    })
    return ['All', ...ordered]
  }, [items])

  const categoryRanks = useMemo(() => {
    const map = new Map()
    categoryOrder.slice(1).forEach((cat, index) => map.set(cat, index))
    return map
  }, [categoryOrder])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    return items
      .filter((ingredient) => {
        if (category !== 'All' && ingredient.category !== category) return false
        if (glutenFreeOnly && !ingredient.tags.includes(GF_TAG)) return false
        if (veganOnly && !ingredient.tags.includes(VEGAN_TAG)) return false
        if (!query) return true
        const haystack = `${ingredient.name} ${ingredient.slug} ${ingredient.tags.join(' ')}`.toLowerCase()
        return haystack.includes(query)
      })
      .sort((a, b) => {
        const categoryDifference = (categoryRanks.get(a.category) ?? 0) - (categoryRanks.get(b.category) ?? 0)
        if (categoryDifference !== 0) return categoryDifference
        return a.name.localeCompare(b.name)
      })
  }, [items, category, search, glutenFreeOnly, veganOnly, categoryRanks])

  return (
    <section className="ingredient-directory">
      <header className="ingredient-directory__header">
        <div>
          <h2>Ingredient Directory</h2>
          <p>Browse pantry staples, herbs, produce, and more with quick allergen-friendly filters.</p>
        </div>
        <div className="ingredient-directory__summary">
          <span>{filteredItems.length}</span>
          <p>ingredients match your filters</p>
        </div>
      </header>
      <div className="ingredient-directory__controls">
        <label className="ingredient-directory__control">
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categoryOrder.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="ingredient-directory__control ingredient-directory__control--search">
          <span>Search</span>
          <input
            type="search"
            placeholder="Search name, slug, or tag"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="ingredient-directory__toggle">
          <input
            type="checkbox"
            checked={glutenFreeOnly}
            onChange={(event) => setGlutenFreeOnly(event.target.checked)}
          />
          <span>Gluten-Free only</span>
        </label>
        <label className="ingredient-directory__toggle">
          <input type="checkbox" checked={veganOnly} onChange={(event) => setVeganOnly(event.target.checked)} />
          <span>Vegan only</span>
        </label>
      </div>
      <div className="ingredient-grid">
        {filteredItems.map((ingredient) => (
          <article key={ingredient.slug} className="ingredient-card">
            <header className="ingredient-card__header">
              <h3>{ingredient.name}</h3>
              <code>{ingredient.slug}</code>
            </header>
            <div className="ingredient-card__meta">
              <span className="badge badge-soft">{ingredient.category}</span>
            </div>
            <div className="ingredient-card__tags">
              {ingredient.tags.map((tag) => (
                <span key={tag} className="ingredient-tag">
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
        {!filteredItems.length && (
          <div className="ingredient-directory__empty">
            <h3>No ingredients found</h3>
            <p>Try clearing a filter or searching for a different keyword.</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default IngredientDirectory
