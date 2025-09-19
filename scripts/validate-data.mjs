import { ingredients } from '../src/data/ingredients.js'

const ALLOWED_CATEGORIES = new Set([
  'Pasta',
  'Dairy',
  'Meat',
  'Seafood',
  'Herb',
  'Spice',
  'Vegetable',
  'Fruit',
  'Nut/Seed',
  'Grain',
  'Legume',
  'Oil/Fat',
  'Sweetener',
  'Baking',
  'Condiment/Sauce',
  'Beverage',
])

const slugPattern = /^[a-z0-9-]+$/
const errors = []
const seenSlugs = new Set()
const seenNames = new Set()

ingredients.forEach((ingredient, index) => {
  const location = `${ingredient.slug} (index ${index})`

  if (!slugPattern.test(ingredient.slug)) {
    errors.push(`${location}: slug must be kebab-case and contain only lowercase letters, numbers, or dashes.`)
  }

  if (seenSlugs.has(ingredient.slug)) {
    errors.push(`${location}: duplicate slug detected.`)
  } else {
    seenSlugs.add(ingredient.slug)
  }

  const normalizedName = ingredient.name.toLowerCase()
  if (seenNames.has(normalizedName)) {
    errors.push(`${location}: name duplicates another ingredient (${ingredient.name}).`)
  } else {
    seenNames.add(normalizedName)
  }

  if (!ALLOWED_CATEGORIES.has(ingredient.category)) {
    errors.push(`${location}: category "${ingredient.category}" is not in the approved category list.`)
  }

  if (!Array.isArray(ingredient.tags)) {
    errors.push(`${location}: tags must be an array of strings.`)
  } else {
    const tagSet = new Set()
    ingredient.tags.forEach((tag) => {
      if (typeof tag !== 'string' || !tag.trim()) {
        errors.push(`${location}: tags must be non-empty strings.`)
        return
      }
      const trimmed = tag.trim()
      if (tagSet.has(trimmed)) {
        errors.push(`${location}: duplicate tag "${trimmed}".`)
      } else {
        tagSet.add(trimmed)
      }
    })
  }
})

if (errors.length) {
  console.error('\u274c Ingredient validation failed:')
  errors.forEach((message) => console.error(` - ${message}`))
  process.exit(1)
}

console.log('\u2705 Ingredient dataset looks great!')
