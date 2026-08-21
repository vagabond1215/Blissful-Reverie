const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const BASE_URL = 'http://127.0.0.1:4173/';

const visible = async (locator) => locator.evaluate((node) => {
  if (!(node instanceof HTMLElement)) return false;
  const style = getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}).catch(() => false);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#primary-nav [data-view-target="kitchen"]');
    await page.locator('#primary-nav [data-view-target="kitchen"]').click();
    await page.waitForFunction(() => {
      const input = document.getElementById('kitchen-topbar-search-input');
      return input instanceof HTMLInputElement && !document.getElementById('kitchen-topbar-search')?.hidden;
    });

    const search = page.locator('#kitchen-topbar-search');
    const input = page.locator('#kitchen-topbar-search-input');
    const topbar = page.locator('#recipes-page .topbar__row');
    const nav = page.locator('#primary-nav');
    assert.equal(await visible(search), true, 'Kitchen topbar search should be visible.');
    assert.equal(await visible(page.locator('#filter-panel .input-group--search:has(#filter-search)')), false, 'Legacy sidebar search should be hidden on Kitchen.');

    const [searchBox, inputBox, topbarBox, navBox] = await Promise.all([
      search.boundingBox(), input.boundingBox(), topbar.boundingBox(), nav.boundingBox(),
    ]);
    assert(searchBox && inputBox && topbarBox && navBox, 'Kitchen topbar geometry should be measurable.');
    assert(searchBox.x >= navBox.x + navBox.width - 1, `Kitchen search should sit after primary nav (${searchBox.x} vs ${navBox.x + navBox.width}).`);
    assert(inputBox.x + inputBox.width <= topbarBox.x + topbarBox.width + 1, 'Kitchen search should remain inside the topbar.');
    assert(Math.abs((inputBox.x + inputBox.width) - (topbarBox.x + topbarBox.width)) < 28, 'Kitchen search should align to the right side of the topbar.');

    await input.fill('Measuring Spoons');
    await page.waitForTimeout(180);
    assert.equal(await visible(page.locator('[data-kitchen-group="measuring-spoons"]')), true, 'Kitchen topbar search should filter to grouped equipment.');
    assert.equal(await visible(page.locator('#kitchen-list .kitchen-list__item').filter({ hasText: 'Air Fryer' }).first()), false, 'Unmatched Kitchen equipment should be filtered out.');

    await input.fill('');
    await page.waitForTimeout(180);
    const normalRow = page.locator('#kitchen-list .kitchen-list__item').filter({ hasText: 'Air Fryer' }).first();
    const groupRow = page.locator('[data-kitchen-group="baking-sheets"]');
    assert.equal(await visible(normalRow), true, 'Normal Kitchen row should be visible after clearing search.');
    assert.equal(await visible(groupRow), true, 'Grouped Kitchen row should be visible after clearing search.');

    const [normalCheckbox, groupCheckbox, normalName, groupName] = await Promise.all([
      normalRow.locator('.kitchen-list__checkbox').boundingBox(),
      groupRow.locator('.kitchen-equipment-group__checkbox').boundingBox(),
      normalRow.locator('.kitchen-list__name').boundingBox(),
      groupRow.locator('.kitchen-equipment-group__name').boundingBox(),
    ]);
    assert(normalCheckbox && groupCheckbox && normalName && groupName, 'Kitchen row alignment geometry should be measurable.');
    assert(Math.abs(normalCheckbox.x - groupCheckbox.x) <= 1.5, `Grouped checkbox should align with normal rows (${groupCheckbox.x} vs ${normalCheckbox.x}).`);
    assert(Math.abs(normalName.x - groupName.x) <= 1.5, `Grouped label should align with normal rows (${groupName.x} vs ${normalName.x}).`);

    await page.locator('#primary-nav [data-view-target="meals"]').click();
    await page.waitForTimeout(120);
    assert.equal(await visible(search), false, 'Kitchen search must hide outside Kitchen.');
    assert.equal(await visible(page.locator('#recipe-topbar-search')), true, 'Recipe search should resume ownership on Recipes.');

    for (const width of [768, 375]) {
      await page.setViewportSize({ width, height: 800 });
      await page.locator('#primary-nav [data-view-target="kitchen"]').click();
      await page.waitForTimeout(140);
      assert.equal(await visible(search), true, `Kitchen search should remain visible at ${width}px.`);
      assert.equal(await visible(page.locator('#filter-panel .input-group--search:has(#filter-search)')), false, `Sidebar search should remain hidden at ${width}px.`);
      const geometry = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
        input: document.getElementById('kitchen-topbar-search-input')?.getBoundingClientRect(),
        row: document.querySelector('#recipes-page .topbar__row')?.getBoundingClientRect(),
      }));
      assert(geometry.doc <= geometry.viewport, `Kitchen topbar should not overflow at ${width}px (${geometry.doc} > ${geometry.viewport}).`);
      assert(geometry.input && geometry.row, `Kitchen search geometry missing at ${width}px.`);
      assert(geometry.input.right <= geometry.row.right + 1, `Kitchen search should stay inside topbar at ${width}px.`);
      assert(Math.abs(geometry.input.right - geometry.row.right) < 20, `Kitchen search should stay right-aligned at ${width}px.`);
    }

    console.log('Kitchen topbar search and row alignment browser acceptance passed.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
