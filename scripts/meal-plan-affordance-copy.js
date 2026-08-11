;(function () {
  if (typeof document === 'undefined') {
    return;
  }

  const SCHEDULE_BUTTON_SELECTOR = '.meal-card__schedule-button';
  const MEAL_PLAN_EMPTY_SELECTOR = '.meal-plan-empty';
  const FEEDBACK_ID = 'meal-plan-affordance-feedback';
  const ENHANCED_BUTTON_ATTR = 'data-meal-plan-affordance-enhanced';
  const EMPTY_TEXT =
    'Add recipes from recipe cards to build this day. Planned recipes can feed the Smart shopping list.';
  const BUTTON_TEXT = 'Plan & shop';
  const HELPER_TEXT = 'Scheduled recipes can feed Smart shopping list.';
  const FEEDBACK_RESET_MS = 5000;
  let feedbackTimer = null;
  let observer = null;
  let enhanceQueued = false;

  const scheduleFrame = (callback) => {
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(callback);
      return;
    }
    window.setTimeout(callback, 0);
  };

  const getRecipeNameForButton = (button) => {
    const card = button && typeof button.closest === 'function' ? button.closest('.meal-card') : null;
    const title = card ? card.querySelector('.meal-card__header h3') : null;
    const name = title && typeof title.textContent === 'string' ? title.textContent.trim() : '';
    return name || 'this recipe';
  };

  const ensureFeedbackElement = () => {
    let feedback = document.getElementById(FEEDBACK_ID);
    if (feedback) {
      return feedback;
    }
    feedback = document.createElement('p');
    feedback.id = FEEDBACK_ID;
    feedback.className = 'meal-plan-affordance__feedback';
    feedback.hidden = true;
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    const mealView = document.getElementById('meal-view');
    if (mealView) {
      mealView.insertBefore(feedback, mealView.firstChild);
    } else if (document.body) {
      document.body.appendChild(feedback);
    }
    return feedback;
  };

  const showScheduleFeedback = (recipeName) => {
    const feedback = ensureFeedbackElement();
    const prefix = recipeName && recipeName !== 'Recipe' ? `${recipeName} added to meal plan` : 'Added to meal plan';
    feedback.textContent = `${prefix} — missing ingredients can appear in Smart shopping list.`;
    feedback.hidden = false;
    if (feedbackTimer) {
      window.clearTimeout(feedbackTimer);
    }
    feedbackTimer = window.setTimeout(() => {
      feedback.hidden = true;
      feedback.textContent = '';
    }, FEEDBACK_RESET_MS);
  };

  const enhanceScheduleButton = (button) => {
    if (!(button instanceof HTMLElement) || button.hasAttribute(ENHANCED_BUTTON_ATTR)) {
      return;
    }
    const recipeName = getRecipeNameForButton(button);
    button.setAttribute(ENHANCED_BUTTON_ATTR, 'true');
    button.classList.add('meal-plan-affordance__schedule-button');
    button.title = `Add ${recipeName} to your meal plan and Smart shopping list`;
    button.setAttribute(
      'aria-label',
      `Add ${recipeName} to your meal plan; planned recipes can feed the Smart shopping list`,
    );
    if (!button.querySelector('.meal-plan-affordance__schedule-text')) {
      const label = document.createElement('span');
      label.className = 'meal-plan-affordance__schedule-text';
      label.textContent = BUTTON_TEXT;
      button.appendChild(label);
    }
    const actions = button.closest('.meal-card__header-actions');
    if (actions instanceof HTMLElement) {
      actions.classList.add('meal-plan-affordance__actions');
      if (!actions.querySelector('.meal-plan-affordance__helper')) {
        const helper = document.createElement('span');
        helper.className = 'meal-plan-affordance__helper';
        helper.textContent = HELPER_TEXT;
        actions.appendChild(helper);
      }
    }
  };

  const enhanceScheduleButtons = () => {
    document.querySelectorAll(SCHEDULE_BUTTON_SELECTOR).forEach(enhanceScheduleButton);
  };

  const enhanceMealPlanEmptyStates = () => {
    document.querySelectorAll(MEAL_PLAN_EMPTY_SELECTOR).forEach((empty) => {
      if (!(empty instanceof HTMLElement) || empty.textContent === EMPTY_TEXT) {
        return;
      }
      empty.textContent = EMPTY_TEXT;
    });
  };

  const enhancePage = () => {
    enhanceQueued = false;
    enhanceScheduleButtons();
    enhanceMealPlanEmptyStates();
  };

  const queueEnhance = () => {
    if (enhanceQueued) {
      return;
    }
    enhanceQueued = true;
    scheduleFrame(enhancePage);
  };

  const bindScheduleConfirmation = () => {
    document.addEventListener('submit', (event) => {
      const form = event.target instanceof Element ? event.target.closest('.schedule-dialog__panel') : null;
      if (!form) {
        return;
      }
      const recipeLabel = document.getElementById('schedule-dialog-recipe');
      const recipeName = recipeLabel && typeof recipeLabel.textContent === 'string'
        ? recipeLabel.textContent.trim()
        : '';
      window.setTimeout(() => {
        const openDialog = document.querySelector('.schedule-dialog[data-open="true"]');
        if (!openDialog) {
          showScheduleFeedback(recipeName);
          queueEnhance();
        }
      }, 0);
    });
  };

  const startObserver = () => {
    if (observer || !document.body || typeof MutationObserver !== 'function') {
      return;
    }
    observer = new MutationObserver(() => queueEnhance());
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const init = () => {
    bindScheduleConfirmation();
    ensureFeedbackElement();
    enhancePage();
    startObserver();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
