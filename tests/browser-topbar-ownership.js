const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const BASE_URL = 'http://127.0.0.1:4173/';
const KNOWN = {
  recipes: ['favorite-filter', 'pantry-only-toggle', 'substitution-toggle', 'reset-filters'],
  pantry: ['pantry-restock-button', 'pantry-lists-action', 'pantry-stock-cycle-action', 'pantry-sort-action', 'pantry-favorites-action', 'pantry-tags-action'],
  shop: ['shop-recipe-references-action', 'shop-group-by-action'],
  family: ['family-manage-action'],
};
const ALL_KNOWN = Object.values(KNOWN).flat();

const isVisible = async (locator) => locator.evaluate((node) => {
  if (!(node instanceof HTMLElement)) return false;
  const style = getComputedStyle(node);
  const rect = node.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}).catch(() => false);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('#primary-nav');
    await page.waitForFunction(() => document.querySelector('#primary-nav [data-shop-tab="true"]'));

    const tabSelector = (workspace) => workspace === 'shop'
      ? '#primary-nav [data-shop-tab="true"]'
      : `#primary-nav [data-view-target="${workspace === 'recipes' ? 'meals' : workspace}"]`;

    const clickWorkspace = async (workspace) => {
      await page.locator(tabSelector(workspace)).click();
      await page.waitForTimeout(180);
    };

    const snapshot = async () => page.evaluate((allKnown) => {
      const visible = (node) => {
        if (!(node instanceof HTMLElement)) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };
      const selected = Array.from(document.querySelectorAll('#primary-nav .view-toggle__button'))
        .filter((tab) => tab.classList.contains('view-toggle__button--active') || tab.getAttribute('aria-current') === 'page')
        .map((tab) => tab.dataset.shopTab === 'true' ? 'shop' : tab.dataset.viewTarget);
      const known = Object.fromEntries(allKnown.map((id) => {
        const node = document.getElementById(id);
        return [id, Boolean(node && visible(node))];
      }));
      const bar = document.getElementById('page-action-bar');
      return {
        selected,
        known,
        barVisible: Boolean(bar && visible(bar)),
        recipeSearchVisible: Boolean(document.getElementById('recipe-topbar-search') && visible(document.getElementById('recipe-topbar-search'))),
        pantrySearchVisible: Boolean(document.getElementById('pantry-topbar-search') && visible(document.getElementById('pantry-topbar-search'))),
      };
    }, ALL_KNOWN);

    const assertWorkspace = async (workspace) => {
      const state = await snapshot();
      const expectedSelected = workspace === 'recipes' ? 'meals' : workspace;
      assert(state.selected.includes(expectedSelected), `${workspace}: selected tab missing; got ${state.selected.join(', ')}`);

      const owner = KNOWN[workspace] || [];
      for (const id of ALL_KNOWN) {
        if (owner.includes(id)) {
          assert.equal(state.known[id], true, `${workspace}: expected ${id} visible`);
        } else {
          assert.equal(state.known[id], false, `${workspace}: leaked ${id}`);
        }
      }

      if (['recipes', 'pantry', 'shop', 'family'].includes(workspace)) {
        assert.equal(state.barVisible, true, `${workspace}: action bar should be visible`);
      } else {
        assert.equal(state.barVisible, false, `${workspace}: action bar should be hidden`);
      }
      assert.equal(state.recipeSearchVisible, workspace === 'recipes', `${workspace}: recipe search ownership mismatch`);
      assert.equal(state.pantrySearchVisible, workspace === 'pantry', `${workspace}: pantry search ownership mismatch`);
      console.log(workspace, state);
    };

    await page.waitForFunction(() => ['favorite-filter', 'pantry-only-toggle', 'substitution-toggle', 'reset-filters'].every((id) => document.getElementById(id)));
    await assertWorkspace('recipes');

    await clickWorkspace('pantry');
    await page.waitForFunction(() => ['pantry-restock-button', 'pantry-lists-action', 'pantry-stock-cycle-action', 'pantry-sort-action', 'pantry-favorites-action', 'pantry-tags-action'].every((id) => document.getElementById(id)));
    await assertWorkspace('pantry');

    await clickWorkspace('shop');
    await page.waitForFunction(() => ['shop-recipe-references-action', 'shop-group-by-action'].every((id) => document.getElementById(id)));
    await assertWorkspace('shop');

    await clickWorkspace('pantry');
    await assertWorkspace('pantry');

    await clickWorkspace('family');
    await page.waitForFunction(() => document.getElementById('family-manage-action'));
    await assertWorkspace('family');

    await clickWorkspace('pantry');
    await assertWorkspace('pantry');

    await clickWorkspace('recipes');
    await assertWorkspace('recipes');

    await clickWorkspace('shop');
    await assertWorkspace('shop');

    await clickWorkspace('family');
    await assertWorkspace('family');

    await clickWorkspace('kitchen');
    await assertWorkspace('kitchen');

    await clickWorkspace('meal-plan');
    await assertWorkspace('meal-plan');

    await clickWorkspace('recipes');
    await assertWorkspace('recipes');

    console.log('Topbar browser ownership acceptance passed.');
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
