const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
const family = require('../scripts/family-redesign.js');
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

assert.equal(pantryTags.normalizeTagMode('expanded'), 'expanded');
assert.equal(pantryTags.normalizeTagMode('collapsed'), 'hidden');
assert.equal(pantryTags.toggleTagMode('hidden'), 'expanded');
assert.equal(pantryTags.toggleTagMode('expanded'), 'hidden');

const loader = read('scripts/productivity-settings.js');
assert(loader.includes('styles/family-redesign.css'));
assert(loader.includes('scripts/family-redesign.js'));
assert(loader.includes('styles/pantry-tag-refine.css'));
assert(loader.includes('scripts/pantry-tag-refine.js'));

const familyScript = read('scripts/family-redesign.js');
assert(familyScript.includes("button.textContent = 'Manage Family'"));
assert(familyScript.includes('All member data will be permanently lost'));
assert(familyScript.includes("label.textContent = 'Birthday'"));
assert(familyScript.includes("label.textContent = 'Dislikes'"));
assert(familyScript.includes("iconSelect.hidden = true"));
assert(familyScript.includes("remove.hidden = true"));

const familyCss = read('styles/family-redesign.css');
assert(familyCss.includes('.family-member-card__primary-row'));
assert(familyCss.includes('grid-template-columns: repeat(3'));
assert(familyCss.includes('.family-manage-dialog__trash'));

const pantryScript = read('scripts/pantry-tag-refine.js');
assert(pantryScript.includes("row.querySelector('.pantry-row-tags__summary')?.remove()"));
assert(pantryScript.includes("event.stopImmediatePropagation()"));

const pantryCss = read('styles/pantry-tag-refine.css');
assert(pantryCss.includes('padding: 3px 3px'));
assert(pantryCss.includes('.pantry-row-tags__summary'));

console.log('Family and Pantry refinement tests passed.');
