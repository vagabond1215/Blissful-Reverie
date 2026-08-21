const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE_URL = process.env.BLISSFUL_BROWSER_URL || 'http://127.0.0.1:4173';
const TARGET_RECIPE = 'Turkey Bulgogi Rice Bowls';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => Array.isArray(window.BLISSFUL_INGREDIENTS) && document.querySelector('#meal-grid .meal-card'), null, { timeout: 15000 });
  await page.evaluate(() => {
    const current = JSON.parse(localStorage.getItem('blissful-app-state') || '{}');
    current.activeView = 'meals';
    current.pantryInventory = Object.fromEntries(
      window.BLISSFUL_INGREDIENTS
        .filter((ingredient) => ingredient?.slug)
        .map((ingredient) => [ingredient.slug, { quantity: '99', unit: 'each' }]),
    );
    if (current.mealFilters && typeof current.mealFilters === 'object') current.mealFilters.search = '';
    localStorage.setItem('blissful-app-state', JSON.stringify(current));
  });

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction((target) => Array.from(document.querySelectorAll('.productivity-dashboard__recipe-chip')).some((chip) => chip.textContent.trim() === target), TARGET_RECIPE, { timeout: 20000 });
  await page.waitForFunction(() => document.querySelector('#recipe-pagination [data-recipe-page-action="next"]:not(:disabled)'), null, { timeout: 10000 });

  await page.evaluate(() => {
    document.querySelector('#recipe-pagination [data-recipe-page-action="next"]')?.click();
    document.querySelector('#recipe-pagination [data-recipe-page-action="next"]')?.click();
  });
  await page.waitForFunction(() => document.getElementById('meal-grid')?.dataset?.page === '3', null, { timeout: 5000 });

  const before = await page.evaluate((target) => ({
    search: document.getElementById('filter-search')?.value || '',
    page: document.getElementById('meal-grid')?.dataset?.page || '',
    targetMounted: Array.from(document.querySelectorAll('#meal-grid .meal-card h3')).some((heading) => heading.textContent.trim() === target),
  }), TARGET_RECIPE);
  assert.equal(before.search, '');
  assert.equal(before.page, '3');
  assert.equal(before.targetMounted, false, `${TARGET_RECIPE} must be off-page for this acceptance test.`);

  await page.evaluate((target) => {
    const chip = Array.from(document.querySelectorAll('.productivity-dashboard__recipe-chip'))
      .find((node) => node.textContent.trim() === target);
    if (!(chip instanceof HTMLButtonElement)) throw new Error(`Discovery chip not found: ${target}`);
    chip.click();
  }, TARGET_RECIPE);

  await page.waitForFunction((target) => {
    const dialog = document.getElementById('recipe-preview-dialog');
    return dialog && !dialog.hidden && dialog.querySelector('#recipe-preview-title')?.textContent.trim() === target;
  }, TARGET_RECIPE, { timeout: 5000 });

  const preview = await page.evaluate(() => ({
    ingredients: document.querySelectorAll('#recipe-preview-dialog .ingredient-list li').length,
    instructions: document.querySelectorAll('#recipe-preview-dialog .instruction-list li').length,
    equipment: Array.from(document.querySelectorAll('#recipe-preview-dialog .meal-card__section h4'))
      .find((heading) => heading.textContent.trim() === 'Equipment')
      ?.parentElement?.querySelectorAll('li').length || 0,
    planButton: Boolean(document.querySelector('#recipe-preview-dialog [data-discovery-preview-plan]')),
  }));
  assert(preview.ingredients > 0, 'Off-page preview should include ingredients from recipe data.');
  assert(preview.instructions > 0, 'Off-page preview should include instructions from recipe data.');
  assert(preview.equipment > 0, 'Off-page preview should include equipment from recipe data.');
  assert.equal(preview.planButton, true, 'Off-page preview should expose Plan & Shop.');

  await page.evaluate(() => {
    const plan = document.querySelector('#recipe-preview-dialog [data-discovery-preview-plan]');
    if (!(plan instanceof HTMLButtonElement)) throw new Error('Plan & Shop button missing.');
    plan.click();
  });

  await page.waitForFunction((target) => {
    const dialog = document.querySelector('.schedule-dialog[data-open="true"]:not([hidden])');
    return Boolean(dialog && document.getElementById('schedule-dialog-recipe')?.textContent.trim() === target);
  }, TARGET_RECIPE, { timeout: 10000 });
  await page.waitForTimeout(1400);

  const after = await page.evaluate((target) => ({
    search: document.getElementById('filter-search')?.value || '',
    page: document.getElementById('meal-grid')?.dataset?.page || '',
    scheduleOpen: Boolean(document.querySelector('.schedule-dialog[data-open="true"]:not([hidden])')),
    scheduledRecipe: document.getElementById('schedule-dialog-recipe')?.textContent.trim() || '',
    previewHidden: Boolean(document.getElementById('recipe-preview-dialog')?.hidden),
    targetMounted: Array.from(document.querySelectorAll('#meal-grid .meal-card h3')).some((heading) => heading.textContent.trim() === target),
  }), TARGET_RECIPE);

  assert.equal(after.search, before.search, 'Plan & Shop should restore the previous Recipes search.');
  assert.equal(after.page, before.page, 'Plan & Shop should restore the previous Recipes page.');
  assert.equal(after.scheduleOpen, true, 'The real scheduling dialog should remain open after restoration.');
  assert.equal(after.scheduledRecipe, TARGET_RECIPE, 'The scheduling dialog should retain the off-page recipe action.');
  assert.equal(after.previewHidden, true, 'The Discovery preview should close after forwarding to scheduling.');
  assert.equal(after.targetMounted, false, 'The temporary off-page recipe mount should be gone after restoration.');
  assert.deepEqual(pageErrors, [], `Unexpected page errors: ${pageErrors.join('\n')}`);

  console.log('Browser Discovery Plan & Shop acceptance passed:', { before, preview, after });
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
