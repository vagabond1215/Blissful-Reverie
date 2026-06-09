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
