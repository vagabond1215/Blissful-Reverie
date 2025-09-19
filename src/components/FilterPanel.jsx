import { useMemo, useState } from 'react'

const FilterPanel = ({
  filters,
  onFiltersChange,
  tagOptions,
  allergyOptions,
  equipmentOptions,
  ingredientOptions,
  onReset,
}) => {
  const [includeInput, setIncludeInput] = useState('')
  const [excludeInput, setExcludeInput] = useState('')

  const normalizedIngredientOptions = useMemo(() => ingredientOptions.slice(0, 200), [ingredientOptions])

  const toggleValue = (field, value) => {
    const current = new Set(filters[field])
    if (current.has(value)) {
      current.delete(value)
    } else {
      current.add(value)
    }
    onFiltersChange({ ...filters, [field]: Array.from(current) })
  }

  const handleSearchChange = (event) => {
    onFiltersChange({ ...filters, search: event.target.value })
  }

  const addIngredient = (type) => {
    const value = type === 'include' ? includeInput.trim().toLowerCase() : excludeInput.trim().toLowerCase()
    if (!value) return
    const field = type === 'include' ? 'includeIngredients' : 'excludeIngredients'
    if (filters[field].includes(value)) {
      if (type === 'include') setIncludeInput('')
      else setExcludeInput('')
      return
    }
    onFiltersChange({ ...filters, [field]: [...filters[field], value] })
    if (type === 'include') setIncludeInput('')
    else setExcludeInput('')
  }

  const removeIngredient = (type, value) => {
    const field = type === 'include' ? 'includeIngredients' : 'excludeIngredients'
    onFiltersChange({
      ...filters,
      [field]: filters[field].filter((item) => item !== value),
    })
  }

  return (
    <aside className="filter-panel">
      <div className="panel-header">
        <h2>Filter Meals</h2>
        <button type="button" className="reset-button" onClick={onReset}>
          Reset
        </button>
      </div>
      <label className="input-group">
        <span>Search</span>
        <input
          type="search"
          value={filters.search}
          onChange={handleSearchChange}
          placeholder="Search by name, description, or tag"
        />
      </label>
      <section className="filter-section">
        <h3>Tags</h3>
        <div className="checkbox-grid">
          {tagOptions.map((tag) => (
            <label key={tag} className="checkbox-option">
              <input
                type="checkbox"
                checked={filters.tags.includes(tag)}
                onChange={() => toggleValue('tags', tag)}
              />
              <span>{tag}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="filter-section">
        <h3>Allergies to Avoid</h3>
        <div className="checkbox-grid">
          {allergyOptions.map((allergy) => (
            <label key={allergy} className="checkbox-option">
              <input
                type="checkbox"
                checked={filters.allergies.includes(allergy)}
                onChange={() => toggleValue('allergies', allergy)}
              />
              <span className="badge badge-soft">{allergy}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="filter-section">
        <h3>Equipment</h3>
        <div className="checkbox-grid">
          {equipmentOptions.map((item) => (
            <label key={item} className="checkbox-option">
              <input
                type="checkbox"
                checked={filters.equipment.includes(item)}
                onChange={() => toggleValue('equipment', item)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </section>
      <section className="filter-section">
        <h3>Ingredients to Include</h3>
        <div className="ingredient-input">
          <input
            list="include-ingredients"
            value={includeInput}
            onChange={(event) => setIncludeInput(event.target.value)}
            placeholder="Add ingredient keyword"
          />
          <button type="button" onClick={() => addIngredient('include')}>
            Add
          </button>
          <datalist id="include-ingredients">
            {normalizedIngredientOptions.map((option) => (
              <option key={`include-${option}`} value={option} />
            ))}
          </datalist>
        </div>
        <div className="chip-row">
          {filters.includeIngredients.map((ingredient) => (
            <button
              type="button"
              key={`include-${ingredient}`}
              className="chip"
              onClick={() => removeIngredient('include', ingredient)}
            >
              {ingredient}
              <span aria-hidden="true"> ×</span>
            </button>
          ))}
        </div>
      </section>
      <section className="filter-section">
        <h3>Ingredients to Exclude</h3>
        <div className="ingredient-input">
          <input
            list="exclude-ingredients"
            value={excludeInput}
            onChange={(event) => setExcludeInput(event.target.value)}
            placeholder="Add ingredient keyword"
          />
          <button type="button" onClick={() => addIngredient('exclude')}>
            Add
          </button>
          <datalist id="exclude-ingredients">
            {normalizedIngredientOptions.map((option) => (
              <option key={`exclude-${option}`} value={option} />
            ))}
          </datalist>
        </div>
        <div className="chip-row">
          {filters.excludeIngredients.map((ingredient) => (
            <button
              type="button"
              key={`exclude-${ingredient}`}
              className="chip chip-danger"
              onClick={() => removeIngredient('exclude', ingredient)}
            >
              {ingredient}
              <span aria-hidden="true"> ×</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  )
}

export default FilterPanel
