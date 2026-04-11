const fs = require('fs');
const path = 'C:/Users/webre/Desktop/ContentSeller/guidehub/src/stores/guideStore.ts';
let c = fs.readFileSync(path, 'utf8');

const oldStr = 'sections: updatedSections ??? state.sections';
const newStr = 'sections: updatedSections';
c = c.replace(oldStr, newStr);

const oldLogic = 'const updatedSections = Array.isArray(updated.sections)\n        ? updated.sections\n        : null';
const newLogic = 'const updatedSections = Array.isArray(updated.sections) && updated.sections.length > 0\n        ? updated.sections\n        : state.sections';
c = c.replace(oldLogic, newLogic);

fs.writeFileSync(path, c);
console.log('guideStore.ts fixed');