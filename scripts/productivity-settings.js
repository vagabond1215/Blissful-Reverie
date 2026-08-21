;(function () {
  if (typeof document === 'undefined') {
    return;
  }

  const ensureStylesheet = (href) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  };

  const ensureScript = (src) => {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    (document.body || document.head).appendChild(script);
  };

  const ensureBaseThemeStylesheet = () => {
    ensureStylesheet('styles/base-theme.css');
  };

  const ensureMealPlanSleekStylesheet = () => {
    ensureStylesheet('styles/meal-plan-sleek.css');
  };

  const ensureTopbarDockedStylesheet = () => {
    ensureStylesheet('styles/topbar-docked.css');
  };

  const ensureShoppingListSleekStylesheet = () => {
    ensureStylesheet('styles/shopping-list-sleek.css');
  };

  const ensureUiCleanupStylesheet = () => {
    ensureStylesheet('styles/ui-cleanup.css');
  };

  const ensureTopbarHoverFixStylesheet = () => {
    ensureStylesheet('styles/topbar-hover-fix.css');
  };

  const ensureDashboardContrastStylesheet = () => {
    ensureStylesheet('styles/dashboard-contrast.css');
  };

  const ensureThemeFoundationStylesheet = () => {
    ensureStylesheet('styles/theme-foundation.css');
  };

  const ensureVisualResetStylesheets = () => {
    ensureBaseThemeStylesheet();
    ensureMealPlanSleekStylesheet();
    ensureTopbarDockedStylesheet();
    ensureShoppingListSleekStylesheet();
    ensureUiCleanupStylesheet();
    ensureTopbarHoverFixStylesheet();
    ensureDashboardContrastStylesheet();
    ensureThemeFoundationStylesheet();
  };

  ensureVisualResetStylesheets();

  const ensurePersistenceRegistryAssets = () => {
    ensureScript('scripts/persistence-registry-runtime.js');
  };

  const ensureProductivityStylesheet = () => {
    ensureStylesheet('styles/productivity.css');
  };

  const ensureMealPlanAffordanceAssets = () => {
    ensureStylesheet('styles/meal-plan-affordance.css');
    ensureScript('scripts/meal-plan-affordance-copy.js');
  };

  const ensureShoppingReferenceAssets = () => {
    ensureScript('scripts/shopping-reference-settings.js');
  };

  const ensureShoppingManagementAssets = () => {
    ensureStylesheet('styles/shopping-management.css');
    ensureScript('scripts/shopping-management.js');
  };

  const ensurePantryRedesignAssets = () => {
    ensureStylesheet('styles/pantry-redesign.css');
    ensureScript('scripts/pantry-redesign.js');
  };

  const ensurePantryListsAssets = () => {
    ensureStylesheet('styles/pantry-lists.css');
    ensureScript('scripts/pantry-lists.js');
    ensureScript('scripts/pantry-result-badge.js');
  };

  const ensureFamilyPantryRefinementAssets = () => {
    ensureStylesheet('styles/family-redesign.css');
    ensureScript('scripts/family-redesign.js');
    ensureStylesheet('styles/family-avatar-picker.css');
    ensureScript('scripts/family-avatar-picker.js');
    ensureStylesheet('styles/pantry-tag-refine.css');
    ensureScript('scripts/pantry-tag-refine.js');
    ensureScript('scripts/pantry-density-fix.js');
  };

  const ensureRecipeFamilyActionAssets = () => {
    ensureStylesheet('styles/recipe-pagination.css');
    ensureStylesheet('styles/recipe-page-actions.css');
    ensureScript('scripts/recipe-page-actions.js');
    ensureStylesheet('styles/family-dislikes.css');
    ensureScript('scripts/family-dislikes-preferences-safety.js');
    ensureScript('scripts/family-dislikes.js');
    ensureScript('scripts/family-dislikes-click-fix.js');
  };

  const ensureTopbarInteractionAssets = () => {
    ensureStylesheet('styles/topbar-consistency.css');
    ensureScript('scripts/pantry-topbar-controls.js');
    ensureScript('scripts/family-manage-fix.js');
  };

  // Legacy Kitchen-mutating runtime retired: scripts/restock-wizard.js and scripts/restock-pantry-nav.js.
  const ensureRestockAssets = () => {
    ensureStylesheet('styles/restock-wizard.css');
    ensureScript('scripts/restock-pantry-only.js');
  };

  const ensureWorkspaceFlowAssets = () => {
    ensureStylesheet('styles/workspace-flow-fix.css');
  };

  const ensureUiPolishAssets = () => {
    ensureStylesheet('styles/ui-polish.css');
    ensureScript('scripts/ui-polish.js');
  };

  const ensureShoppingReadinessRefinementAssets = () => {
    ensureStylesheet('styles/shopping-readiness-refine.css');
    ensureStylesheet('styles/recipe-card-layout.css');
    ensureScript('scripts/meal-plan-shopping-refine.js');
    ensureScript('scripts/discovery-preview-actions.js');
  };

  const ensurePantryWorkspaceAssets = () => {
    ensureStylesheet('styles/pantry-workspace.css');
    ensureStylesheet('styles/pantry-workspace-actions.css');
    ensureScript('scripts/pantry-workspace.js');
    ensureScript('scripts/pantry-workspace-actions.js');
  };

  const ensureShopKitchenWorkspaceAssets = () => {
    ensureStylesheet('styles/shop-kitchen-workspace.css');
    ensureScript('scripts/shop-kitchen-workspace.js');
  };

  const ensureResponsiveHardeningStylesheet = () => {
    ensureStylesheet('styles/responsive-hardening.css');
  };

  const simplifySettings = () => {
    const toolbar = document.getElementById('theme-toolbar');
    if (!toolbar || document.getElementById('productivity-settings-advanced')) {
      return Boolean(toolbar);
    }

    const palette = document.getElementById('theme-palette');
    const paletteGroup = palette?.closest?.('.theme-toolbar__group');
    const holidayGroup = toolbar.querySelector('.theme-toolbar__group--holiday');

    if (!paletteGroup && !holidayGroup) {
      return Boolean(toolbar);
    }

    ensureProductivityStylesheet();

    const advanced = document.createElement('details');
    advanced.className = 'productivity-settings-advanced';
    advanced.id = 'productivity-settings-advanced';

    const summary = document.createElement('summary');
    summary.className = 'productivity-settings-advanced__summary';
    summary.textContent = 'Advanced appearance';
    advanced.appendChild(summary);

    const body = document.createElement('div');
    body.className = 'productivity-settings-advanced__body';

    const description = document.createElement('p');
    description.className = 'productivity-settings-advanced__description';
    description.textContent = 'Customize palettes and automatic holiday themes only when you need deeper visual control.';
    body.appendChild(description);

    const insertionPoint = paletteGroup || holidayGroup;
    toolbar.insertBefore(advanced, insertionPoint);

    if (paletteGroup) {
      body.appendChild(paletteGroup);
    }
    if (holidayGroup) {
      body.appendChild(holidayGroup);
    }
    advanced.appendChild(body);

    return true;
  };

  const start = () => {
    ensurePersistenceRegistryAssets();
    ensureMealPlanAffordanceAssets();
    ensureShoppingReferenceAssets();
    ensureShoppingManagementAssets();
    ensurePantryRedesignAssets();
    ensurePantryListsAssets();
    ensureFamilyPantryRefinementAssets();
    ensureRecipeFamilyActionAssets();
    ensureTopbarInteractionAssets();
    ensureRestockAssets();
    ensureWorkspaceFlowAssets();
    ensureUiPolishAssets();
    ensureShoppingReadinessRefinementAssets();
    ensurePantryWorkspaceAssets();
    ensureShopKitchenWorkspaceAssets();
    ensureResponsiveHardeningStylesheet();
    if (simplifySettings()) {
      ensureVisualResetStylesheets();
      return;
    }
    window.requestAnimationFrame(() => {
      simplifySettings();
      ensureVisualResetStylesheets();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
