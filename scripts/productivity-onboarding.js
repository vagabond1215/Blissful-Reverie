;(function (global) {
  const tools = global.BlissfulProductivity || {};
  const ingredients = Array.isArray(global.BLISSFUL_INGREDIENTS) ? global.BLISSFUL_INGREDIENTS : [];

  if (typeof document === 'undefined' || typeof tools.createStarterState !== 'function') {
    return;
  }

  const APP_STATE_STORAGE_KEY = 'blissful-app-state';
  const DISMISSED_STORAGE_KEY = 'blissful-onboarding-dismissed';

  const starterPantrySlugs = [
    'grain-rice-white',
    'grain-quinoa',
    'pasta-spaghetti',
    'veg-garlic',
    'veg-onion-yellow',
    'veg-carrot',
    'veg-spinach',
    'legume-chickpea',
    'oil-olive',
    'spice-kosher-salt',
    'spice-black-pepper',
    'dairy-cheese-parmesan',
  ];

  const dietOptions = [
    '',
    'Vegetarian',
    'Vegan',
    'Gluten Free',
    'Dairy Free',
    'High Protein',
  ];

  const allergyOptions = [
    '',
    'dairy',
    'eggs',
    'fish',
    'gluten',
    'nuts',
    'peanuts',
    'shellfish',
    'soy',
  ];

  const hasExistingAppState = () => {
    if (typeof tools.hasMeaningfulStoredState === 'function') {
      return tools.hasMeaningfulStoredState(global.localStorage);
    }
    try {
      const raw = global.localStorage?.getItem?.(APP_STATE_STORAGE_KEY);
      if (!raw) return false;
      const stored = JSON.parse(raw);
      return typeof tools.hasMeaningfulAppState === 'function'
        ? tools.hasMeaningfulAppState(stored)
        : Boolean(stored && typeof stored === 'object' && !Array.isArray(stored));
    } catch (error) {
      return false;
    }
  };

  const wasDismissed = () => {
    try {
      return global.localStorage?.getItem?.(DISMISSED_STORAGE_KEY) === 'true';
    } catch (error) {
      return true;
    }
  };

  const getIngredientName = (slug) =>
    ingredients.find((ingredient) => ingredient && ingredient.slug === slug)?.name || slug;

  const createOption = (value, label) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  };

  const applyStyles = () => {
    if (document.getElementById('productivity-onboarding-styles')) return;
    const style = document.createElement('style');
    style.id = 'productivity-onboarding-styles';
    style.textContent = `
      .productivity-onboarding {
        display: grid;
        gap: 1rem;
        margin-bottom: 1rem;
        padding: 1rem;
        border: 1px solid var(--border-1);
        border-radius: 1.25rem;
        background: var(--surface-0);
      }

      .productivity-onboarding__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }

      .productivity-onboarding__title {
        margin: 0;
        font-size: 1.05rem;
      }

      .productivity-onboarding__subtitle {
        margin: 0.25rem 0 0;
        color: var(--text-muted);
        font-size: 0.9rem;
      }

      .productivity-onboarding__dismiss {
        flex: 0 0 auto;
        border: 1px solid var(--border-1);
        border-radius: 999px;
        padding: 0.25rem 0.55rem;
        background: var(--surface-1);
        color: var(--text);
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      .productivity-onboarding__form {
        display: grid;
        gap: 0.85rem;
      }

      .productivity-onboarding__fields {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.75rem;
      }

      .productivity-onboarding__field {
        display: grid;
        gap: 0.35rem;
        color: var(--text);
        font-size: 0.86rem;
        font-weight: 700;
      }

      .productivity-onboarding__field input,
      .productivity-onboarding__field select {
        width: 100%;
        border: 1px solid var(--border-1);
        border-radius: 0.75rem;
        padding: 0.55rem 0.65rem;
        background: var(--surface-1);
        color: var(--text);
        font: inherit;
        font-weight: 500;
      }

      .productivity-onboarding__pantry {
        display: grid;
        gap: 0.5rem;
      }

      .productivity-onboarding__pantry-title {
        margin: 0;
        font-size: 0.9rem;
      }

      .productivity-onboarding__chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
      }

      .productivity-onboarding__chip {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        border: 1px solid var(--border-1);
        border-radius: 999px;
        padding: 0.35rem 0.55rem;
        background: var(--surface-1);
        color: var(--text);
        font-size: 0.82rem;
        cursor: pointer;
      }

      .productivity-onboarding__actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
      }

      .productivity-onboarding__submit {
        border: 1px solid var(--border-1);
        border-radius: 999px;
        padding: 0.55rem 0.9rem;
        background: var(--surface-1);
        color: var(--text);
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }

      .productivity-onboarding__note {
        margin: 0;
        color: var(--text-muted);
        font-size: 0.82rem;
      }
    `;
    document.head.appendChild(style);
  };

  const saveStarterState = (form) => {
    const data = new FormData(form);
    const householdName = String(data.get('householdName') || '').trim() || 'Household';
    const diet = String(data.get('diet') || '').trim();
    const allergy = String(data.get('allergy') || '').trim();
    const pantrySlugs = Array.from(form.querySelectorAll('[name="pantry"]'))
      .filter((input) => input instanceof HTMLInputElement && input.checked)
      .map((input) => input.value);

    const starterState = tools.createStarterState({
      familyName: householdName,
      diets: diet ? [diet] : [],
      allergies: allergy ? [allergy] : [],
      pantrySlugs,
      kitchenItems: [],
    });

    try {
      global.localStorage?.setItem?.(APP_STATE_STORAGE_KEY, JSON.stringify(starterState));
      global.localStorage?.removeItem?.(DISMISSED_STORAGE_KEY);
    } catch (error) {
      return null;
    }
    return starterState;
  };

  const renderOnboarding = () => {
    if (hasExistingAppState() || wasDismissed()) return;
    const mealView = document.getElementById('meal-view');
    const mealGrid = document.getElementById('meal-grid');
    if (!mealView || !mealGrid || document.getElementById('productivity-onboarding')) return;

    applyStyles();

    const card = document.createElement('section');
    card.className = 'productivity-onboarding';
    card.id = 'productivity-onboarding';
    card.setAttribute('aria-label', 'First run setup');

    const header = document.createElement('header');
    header.className = 'productivity-onboarding__header';
    const headerText = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'productivity-onboarding__title';
    title.textContent = 'Set up your kitchen in under a minute';
    headerText.appendChild(title);
    const subtitle = document.createElement('p');
    subtitle.className = 'productivity-onboarding__subtitle';
    subtitle.textContent = 'Add a few household basics so recipe readiness and shopping lists work immediately.';
    headerText.appendChild(subtitle);
    header.appendChild(headerText);

    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.className = 'productivity-onboarding__dismiss';
    dismiss.textContent = 'Skip';
    dismiss.addEventListener('click', () => {
      try {
        global.localStorage?.setItem?.(DISMISSED_STORAGE_KEY, 'true');
      } catch (error) {
        // Ignore storage failures; removing the card is still useful for the current session.
      }
      card.remove();
    });
    header.appendChild(dismiss);
    card.appendChild(header);

    const form = document.createElement('form');
    form.className = 'productivity-onboarding__form';

    const fields = document.createElement('div');
    fields.className = 'productivity-onboarding__fields';

    const nameLabel = document.createElement('label');
    nameLabel.className = 'productivity-onboarding__field';
    nameLabel.textContent = 'Household name';
    const nameInput = document.createElement('input');
    nameInput.name = 'householdName';
    nameInput.placeholder = 'Household';
    nameInput.autocomplete = 'organization';
    nameLabel.appendChild(nameInput);
    fields.appendChild(nameLabel);

    const dietLabel = document.createElement('label');
    dietLabel.className = 'productivity-onboarding__field';
    dietLabel.textContent = 'Common diet';
    const dietSelect = document.createElement('select');
    dietSelect.name = 'diet';
    dietOptions.forEach((value) => dietSelect.appendChild(createOption(value, value || 'No default')));
    dietLabel.appendChild(dietSelect);
    fields.appendChild(dietLabel);

    const allergyLabel = document.createElement('label');
    allergyLabel.className = 'productivity-onboarding__field';
    allergyLabel.textContent = 'Allergy to avoid';
    const allergySelect = document.createElement('select');
    allergySelect.name = 'allergy';
    allergyOptions.forEach((value) => allergySelect.appendChild(createOption(value, value || 'No default')));
    allergyLabel.appendChild(allergySelect);
    fields.appendChild(allergyLabel);
    form.appendChild(fields);

    const pantry = document.createElement('section');
    pantry.className = 'productivity-onboarding__pantry';
    const pantryTitle = document.createElement('h3');
    pantryTitle.className = 'productivity-onboarding__pantry-title';
    pantryTitle.textContent = 'Starter pantry items';
    pantry.appendChild(pantryTitle);
    const chips = document.createElement('div');
    chips.className = 'productivity-onboarding__chips';
    starterPantrySlugs.forEach((slug) => {
      const label = document.createElement('label');
      label.className = 'productivity-onboarding__chip';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'pantry';
      input.value = slug;
      input.checked = true;
      label.appendChild(input);
      const text = document.createElement('span');
      text.textContent = getIngredientName(slug);
      label.appendChild(text);
      chips.appendChild(label);
    });
    pantry.appendChild(chips);
    form.appendChild(pantry);

    const actions = document.createElement('div');
    actions.className = 'productivity-onboarding__actions';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'productivity-onboarding__submit';
    submit.textContent = 'Save setup';
    actions.appendChild(submit);
    const note = document.createElement('p');
    note.className = 'productivity-onboarding__note';
    note.textContent = 'Setup saves locally in this browser and updates the planner immediately.';
    actions.appendChild(note);
    form.appendChild(actions);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submit.disabled = true;
      submit.textContent = 'Saving...';
      const starterState = saveStarterState(form);
      if (!starterState) {
        submit.disabled = false;
        submit.textContent = 'Save setup';
        note.textContent = 'Could not save setup in this browser. Check storage permissions.';
        return;
      }

      const app = global.BlissfulApp;
      if (app && typeof app.applyStarterState === 'function' && app.applyStarterState(starterState)) {
        card.remove();
        return;
      }

      // The normal app path applies state in place. Reload only if the app integration is unavailable.
      global.location.reload();
    });

    card.appendChild(form);
    mealView.insertBefore(card, mealGrid);
  };

  const start = () => renderOnboarding();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})(typeof window !== 'undefined' ? window : globalThis);
