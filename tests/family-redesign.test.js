const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
const family = require('../scripts/family-redesign.js');
const avatarPicker = require('../scripts/family-avatar-picker.js');
const pantryTags = require('../scripts/pantry-tag-refine.js');

assert.equal(family.getInitials('Alex Morgan'), 'AM');
assert.equal(family.getInitials('Riley'), 'R');
assert.equal(family.getInitials(''), '?');

assert.equal(family.getSelectableDaysInMonth(2), 29);
assert.equal(family.getSelectableDaysInMonth(4), 30);
assert.equal(family.getSelectableDaysInMonth(1), 31);
assert.equal(family.getActualDaysInMonth(2, 2026), 28);
assert.equal(family.getActualDaysInMonth(2, 2028), 29);
assert.equal(family.clampDayForMonth(2, 31, 2026), 28);
assert.equal(family.clampDayForMonth(2, 29, 2026), 29);
assert.equal(family.clampDayForMonth(4, 31, 2026), 30);
assert.equal(family.encodeBirthday(2, 29), '2000-02-29');
assert.equal(family.encodeBirthday(2, 30), '');
assert.deepEqual(family.parseBirthday('2000-02-29'), { month: 2, day: 29 });
assert.deepEqual(family.parseBirthday('2000-02-30'), { month: 0, day: 0 });
assert.equal(family.getNextAvatarIndex(0, 4), 1);
assert.equal(family.getNextAvatarIndex(3, 4), 0);

assert.deepEqual(
  avatarPicker.normalizeAvatarOptions([
    { value: '', label: 'Initials' },
    { value: '🐯', label: 'Tiger' },
    { value: '🐻', label: 'Bear' },
  ], 'Russ Baker'),
  [
    { index: 0, value: '', kind: 'initials', glyph: 'RB', label: 'Initials (RB)' },
    { index: 1, value: '🐯', kind: 'icon', glyph: '🐯', label: 'Tiger' },
    { index: 2, value: '🐻', kind: 'icon', glyph: '🐻', label: 'Bear' },
  ],
);
assert.equal(
  avatarPicker.normalizeAvatarOptions([{ value: '', label: '' }], 'Ariella')[0].glyph,
  'A',
);

assert.equal(pantryTags.normalizeTagMode('expanded'), 'expanded');
assert.equal(pantryTags.normalizeTagMode('collapsed'), 'hidden');
assert.equal(pantryTags.toggleTagMode('hidden'), 'expanded');
assert.equal(pantryTags.toggleTagMode('expanded'), 'hidden');

const loader = read('scripts/productivity-settings.js');
assert(loader.includes('styles/family-redesign.css'));
assert(loader.includes('scripts/family-redesign.js'));
assert(loader.includes('styles/family-avatar-picker.css'));
assert(loader.includes('scripts/family-avatar-picker.js'));
assert(loader.indexOf('scripts/family-avatar-picker.js') > loader.indexOf('scripts/family-redesign.js'));
assert(loader.includes('styles/pantry-tag-refine.css'));
assert(loader.includes('scripts/pantry-tag-refine.js'));

const familyScript = read('scripts/family-redesign.js');
assert(familyScript.includes("button.textContent = 'Manage Family'"));
assert(familyScript.includes('All member data will be permanently lost'));
assert(familyScript.includes("label.textContent = 'Birthday'"));
assert(familyScript.includes("label.textContent = 'Dislikes'"));
assert(familyScript.includes("iconSelect.hidden = true"));
assert(familyScript.includes("remove.hidden = true"));

const avatarPickerScript = read('scripts/family-avatar-picker.js');
assert(avatarPickerScript.includes("event.target.closest('.family-member-card__avatar-button')"));
assert(avatarPickerScript.includes('event.stopPropagation()'));
assert(avatarPickerScript.includes('openPicker(button)'));
assert(avatarPickerScript.includes("role=\"listbox\""));
assert(avatarPickerScript.includes("role=\"dialog\""));
assert(avatarPickerScript.includes("currentSelect.selectedIndex = option.index"));
assert(!avatarPickerScript.includes('getNextAvatarIndex'));

const familyCss = read('styles/family-redesign.css');
assert(familyCss.includes('.family-member-card__primary-row'));
assert(familyCss.includes('grid-template-columns: repeat(3'));
assert(familyCss.includes('.family-manage-dialog__trash'));

const avatarPickerCss = read('styles/family-avatar-picker.css');
assert(avatarPickerCss.includes('.family-avatar-picker__grid'));
assert(avatarPickerCss.includes('grid-template-columns: repeat(auto-fill'));
assert(avatarPickerCss.includes('.family-avatar-picker__option--selected'));
assert(avatarPickerCss.includes("[data-avatar-kind='initials']"));

const appCss = read('styles/app.css');
const familyShellCss = read('styles/family-shell-cleanup.css');
assert(appCss.includes("@import url('./family-shell-cleanup.css');"));
assert(familyShellCss.includes('.family-view--refined'));
assert(familyShellCss.includes('background: transparent !important'));
assert(familyShellCss.includes('border: 0 !important'));
assert(familyShellCss.includes('box-shadow: none !important'));
assert(familyShellCss.includes('.family-panel__list'));

const pantryScript = read('scripts/pantry-tag-refine.js');
assert(pantryScript.includes("row.tagName === 'DETAILS'"));
assert(pantryScript.includes("document.createElement('div')"));
assert(pantryScript.includes('row.replaceWith(replacement)'));
assert(pantryScript.includes('header.insertBefore(favorite, title)'));
assert(pantryScript.includes("event.stopImmediatePropagation()"));
assert(!pantryScript.includes("row.querySelector('.pantry-row-tags__summary')?.remove()"));

const pantryCss = read('styles/pantry-tag-refine.css');
assert(pantryCss.includes('padding: 2px 3px'));
assert(pantryCss.includes('grid-template-columns: 26px minmax(150px, 1fr) auto auto'));
assert(pantryCss.includes('#page-action-bar #pantry-tags-action'));
assert(pantryCss.includes('grid-column: 2 / -1'));

console.log('Family and Pantry refinement tests passed.');