const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE_URL = process.env.BLISSFUL_BROWSER_URL || 'http://127.0.0.1:4173';
const EXPECTED_TABS = ['Recipes', 'Kitchen', 'Pantry', 'Shop', 'Meal Plan', 'Family'];

const clickDom = (page, selector) => page.evaluate((value) => {
  const element = document.querySelector(value);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing element: ${value}`);
  element.click();
}, selector);

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const width of [375, 768, 1440]) {
    for (const mode of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: width === 375 ? 812 : 900 } });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.evaluate((themeMode) => {
        localStorage.setItem('blissful-theme', JSON.stringify({ mode: themeMode, palettes: {} }));
      }, mode);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => document.querySelector('#meal-grid .meal-card') && document.querySelector('#primary-nav [data-shop-tab="true"]'), null, { timeout: 15000 });
      await page.waitForTimeout(350);
      const snapshot = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        tabs: Array.from(document.querySelectorAll('#primary-nav .tabs-list > button')).map((button) => button.textContent.trim()),
        settingsRect: (() => {
          const rect = document.querySelector('#settings-panel > summary')?.getBoundingClientRect();
          return rect ? { width: rect.width, height: rect.height } : null;
        })(),
      }));
      assert(snapshot.documentWidth <= snapshot.viewportWidth + 1, `${width}px ${mode}: horizontal overflow ${snapshot.documentWidth} > ${snapshot.viewportWidth}.`);
      assert.deepEqual(snapshot.tabs, EXPECTED_TABS, `${width}px ${mode}: primary tab order changed.`);
      assert(snapshot.settingsRect && snapshot.settingsRect.width >= 40 && snapshot.settingsRect.height >= 40, `${width}px ${mode}: settings target should remain clearly visible and about 40px square.`);
      await context.close();
    }
  }

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#primary-nav [data-shop-tab="true"]') && document.querySelector('#meal-grid .meal-card'), null, { timeout: 15000 });
  await page.evaluate(() => {
    const current = JSON.parse(localStorage.getItem('blissful-app-state') || '{}');
    current.activeView = 'meals';
    current.kitchenInventory = [];
    current.kitchenFilters = { search: '' };
    if (current.mealFilters && typeof current.mealFilters === 'object') current.mealFilters.search = '';
    localStorage.setItem('blissful-app-state', JSON.stringify(current));
    localStorage.setItem('blissful-shop-active', 'false');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('#primary-nav [data-shop-tab="true"]') && document.querySelector('#meal-grid .meal-card'), null, { timeout: 15000 });

  const tabSelectors = [
    '#primary-nav [data-view-target="meals"]',
    '#primary-nav [data-view-target="kitchen"]',
    '#primary-nav [data-view-target="pantry"]',
    '#primary-nav [data-shop-tab="true"]',
    '#primary-nav [data-view-target="meal-plan"]',
    '#primary-nav [data-view-target="family"]',
  ];
  const navXs = [];
  for (const selector of tabSelectors) {
    await clickDom(page, selector);
    await page.waitForTimeout(220);
    navXs.push(await page.evaluate(() => document.querySelector('#primary-nav .tabs-list')?.getBoundingClientRect().x));
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    assert.equal(noOverflow, true, `Desktop overflow after ${selector}.`);
  }
  const validXs = navXs.filter((value) => Number.isFinite(value));
  assert.equal(validXs.length, tabSelectors.length, 'Primary nav should remain measurable on every tab.');
  assert(Math.max(...validXs) - Math.min(...validXs) <= 1, `Primary nav visibly shifted between tabs: ${navXs.join(', ')}`);

  await clickDom(page, '#primary-nav [data-shop-tab="true"]');
  await page.waitForFunction(() => document.body.classList.contains('shop-view-active') && localStorage.getItem('blissful-shop-active') === 'true', null, { timeout: 5000 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.body.classList.contains('shop-view-active') && !document.getElementById('shop-view')?.hidden, null, { timeout: 10000 });
  await clickDom(page, '#primary-nav [data-view-target="meals"]');

  await clickDom(page, '#primary-nav [data-view-target="kitchen"]');
  await page.waitForFunction(() => document.querySelector('[data-kitchen-group="measuring-spoons"]') && document.querySelector('[data-kitchen-group="baking-sheets"]'), null, { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector('[data-kitchen-group="baking-sheets"] .kitchen-equipment-group__name')?.textContent.trim() === 'Baking Sheet', null, { timeout: 10000 });

  const kitchenLabels = await page.evaluate(() => ({
    bakingSheet: document.querySelector('[data-kitchen-group="baking-sheets"] .kitchen-equipment-group__name')?.textContent.trim(),
    measuringSpoons: document.querySelector('[data-kitchen-group="measuring-spoons"] .kitchen-equipment-group__name')?.textContent.trim(),
  }));
  assert.equal(kitchenLabels.bakingSheet, 'Baking Sheet');
  assert.equal(kitchenLabels.measuringSpoons, 'Measuring Spoons');

  await page.evaluate(() => {
    const parent = document.querySelector('[data-kitchen-group="measuring-spoons"] .kitchen-equipment-group__checkbox');
    if (!(parent instanceof HTMLInputElement)) throw new Error('Measuring Spoons parent checkbox missing.');
    if (!parent.checked) parent.click();
  });
  await page.waitForFunction(() => document.querySelector('[data-kitchen-group="measuring-spoons"] .kitchen-equipment-group__status')?.textContent.trim() === '4/4', null, { timeout: 5000 });
  await page.evaluate(() => {
    const child = document.querySelector('[data-kitchen-group="measuring-spoons"] [data-kitchen-variant-id="measuring-spoons-1-4-tsp"]');
    if (!(child instanceof HTMLInputElement)) throw new Error('1/4 tsp child checkbox missing.');
    if (child.checked) child.click();
  });
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-kitchen-group="measuring-spoons"]');
    const parent = row?.querySelector('.kitchen-equipment-group__checkbox');
    return row?.querySelector('.kitchen-equipment-group__status')?.textContent.trim() === '3/4'
      && parent instanceof HTMLInputElement
      && parent.indeterminate;
  }, null, { timeout: 5000 });

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('[data-kitchen-group="measuring-spoons"]'), null, { timeout: 10000 });
  const persistedPartial = await page.evaluate(() => {
    const row = document.querySelector('[data-kitchen-group="measuring-spoons"]');
    const parent = row?.querySelector('.kitchen-equipment-group__checkbox');
    return {
      status: row?.querySelector('.kitchen-equipment-group__status')?.textContent.trim(),
      indeterminate: parent instanceof HTMLInputElement && parent.indeterminate,
    };
  });
  assert.deepEqual(persistedPartial, { status: '3/4', indeterminate: true });

  for (const query of ['Measuring Spoons', '1/4 tsp']) {
    await page.evaluate((value) => {
      const input = document.getElementById('filter-search');
      if (!(input instanceof HTMLInputElement)) throw new Error('Kitchen search input missing.');
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, query);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => Boolean(document.querySelector('[data-kitchen-group="measuring-spoons"]'))), true, `Kitchen search should surface Measuring Spoons for ${query}.`);
  }
  await page.evaluate(() => {
    const input = document.getElementById('filter-search');
    input.value = 'blender';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => Boolean(document.querySelector('[data-kitchen-group="measuring-spoons"]'))), false, 'Unrelated Kitchen search must not surface the synthetic Measuring Spoons group.');

  await clickDom(page, '#primary-nav [data-view-target="pantry"]');
  await page.waitForFunction(() => document.querySelectorAll('#pantry-grid .pantry-card').length > 500, null, { timeout: 15000 });
  const pantry = await page.evaluate(() => ({
    cards: document.querySelectorAll('#pantry-grid .pantry-card').length,
    unitSelectors: document.querySelectorAll('#pantry-grid .pantry-card__unit-select').length,
    unitProfiles: document.querySelectorAll('#pantry-grid .pantry-unit-profile').length,
    processPanels: document.querySelectorAll('#pantry-grid .ingredient-processes').length,
  }));
  assert.equal(pantry.unitSelectors, pantry.cards, 'Each Pantry row should retain exactly one visible inventory-unit selector.');
  assert.equal(pantry.unitProfiles, 0, 'Pantry must not reintroduce hidden unit-profile panels.');
  assert.equal(pantry.processPanels, 0, 'Pantry must not reintroduce hidden process panels.');

  await desktop.close();

  const tablet = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tabletPage = await tablet.newPage();
  await tabletPage.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await tabletPage.waitForFunction(() => document.querySelector('#meal-grid .meal-card'), null, { timeout: 15000 });
  const initialDetails = await tabletPage.evaluate(() => document.querySelectorAll('#meal-grid .meal-card__detail-body').length);
  assert.equal(initialDetails, 0, 'Recipe detail bodies should remain lazy at 768px.');
  await tabletPage.evaluate(() => {
    const details = document.querySelector('#meal-grid .meal-card .meal-card__disclosure');
    if (!(details instanceof HTMLDetailsElement)) throw new Error('Recipe disclosure missing.');
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
  });
  await tabletPage.waitForFunction(() => document.querySelectorAll('#meal-grid .meal-card__detail-body').length === 1, null, { timeout: 5000 });
  const tabletLayout = await tabletPage.evaluate(() => {
    const body = document.querySelector('#meal-grid .meal-card__detail-body');
    const sections = Array.from(body?.querySelectorAll(':scope > .meal-card__section') || []).slice(0, 2);
    const rects = sections.map((section) => section.getBoundingClientRect());
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      twoColumns: rects.length === 2 && Math.abs(rects[0].top - rects[1].top) <= 4 && rects[1].left > rects[0].left,
      detailBodies: document.querySelectorAll('#meal-grid .meal-card__detail-body').length,
    };
  });
  assert.equal(tabletLayout.detailBodies, 1);
  assert.equal(tabletLayout.twoColumns, true, 'Ingredients and Instructions should render as two columns at 768px.');
  assert(tabletLayout.documentWidth <= tabletLayout.viewportWidth + 1, 'Expanding a tablet recipe must not create horizontal overflow.');
  await tablet.close();

  console.log('Browser workspace/layout acceptance passed:', { navXs, kitchenLabels, persistedPartial, pantry, tabletLayout });
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
