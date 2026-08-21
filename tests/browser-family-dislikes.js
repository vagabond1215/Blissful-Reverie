const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE_URL = process.env.BLISSFUL_BROWSER_URL || 'http://127.0.0.1:4173';
let browser;

(async () => {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('blissful-app-state', JSON.stringify({
      activeView: 'meals',
      familyMembers: [{
        id: 'sam',
        name: 'Sam',
        icon: '🧑',
        targetCalories: 2000,
        allergies: [],
        diets: [],
        birthday: '',
        preferences: '',
      }],
      mealFilters: { familyMembers: ['sam'] },
    }));
    localStorage.setItem('blissful-family-dislikes', JSON.stringify({
      version: 1,
      members: {
        sam: [{ kind: 'category', key: 'meat', label: 'Meat' }],
      },
    }));
  });

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => (
    window.BlissfulRecipePagination?.__familyDislikesIntegrated === true
    && document.querySelector('#recipe-family-filter .recipe-family-filter__button[aria-pressed="true"]')
    && document.querySelector('#meal-grid .meal-card')
  ), null, { timeout: 15000 });
  await page.waitForTimeout(750);

  const result = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('blissful-family-dislikes') || '{}');
    const totalResults = Number(document.getElementById('meal-grid')?.dataset?.totalResults || 0);
    const recipeCount = Array.isArray(window.BLISSFUL_RECIPES) ? window.BLISSFUL_RECIPES.length : 0;
    return {
      familyCards: document.querySelectorAll('#family-member-list .family-member-card').length,
      activeFamilyButtons: document.querySelectorAll('#recipe-family-filter .recipe-family-filter__button[aria-pressed="true"]').length,
      savedTokens: Array.isArray(stored?.members?.sam) ? stored.members.sam : [],
      totalResults,
      recipeCount,
      mountedCards: document.querySelectorAll('#meal-grid .meal-card').length,
    };
  });

  assert.equal(result.familyCards, 0, 'Family cards should remain unrendered on a fresh Recipes load.');
  assert.equal(result.activeFamilyButtons, 1, 'The persisted family member should remain active in Recipes.');
  assert.deepEqual(result.savedTokens, [{ kind: 'category', key: 'meat', label: 'Meat' }], 'Fresh Recipes load must not delete persisted dislikes.');
  assert(result.recipeCount > 0, 'Recipe catalog should be available.');
  assert(result.totalResults > 0 && result.totalResults < result.recipeCount, `Persisted Meat dislike should filter Recipes before pagination (${result.totalResults}/${result.recipeCount}).`);
  assert(result.mountedCards > 0 && result.mountedCards <= 24, `Recipes should remain paginated to at most 24 mounted cards (got ${result.mountedCards}).`);
  assert.deepEqual(pageErrors, [], `Unexpected page errors: ${pageErrors.join('\n')}`);

  console.log('Browser Family Dislikes fresh-load acceptance passed:', result);
  await browser.close();
  browser = null;
})().catch(async (error) => {
  console.error(error);
  try { await browser?.close(); } catch (closeError) {}
  process.exitCode = 1;
});
