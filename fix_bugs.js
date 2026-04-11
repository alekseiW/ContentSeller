const fs = require('fs');

const gs = 'C:/Users/webre/Desktop/ContentSeller/guidehub/src/stores/guideStore.ts';
let c1 = fs.readFileSync(gs, 'utf8');
c1 = c1.replace(
  /const updatedSections = Array.isArray(updated.sections)\s*\?\s*updated.sections\s*:\s*null/,
  'const updatedSections = Array.isArray(updated.sections) && updated.sections.length > 0\n          ? updated.sections\n          : state.sections'
);
c1 = c1.replace('sections: updatedSections ??? state.sections', 'sections: updatedSections');
fs.writeFileSync(gs, c1);
console.log('guideStore.ts fixed');

const rp = 'C:/Users/webre/Desktop/ContentSeller/guidehub/src/pages/RegisterPage.tsx';
let c2 = fs.readFileSync(rp, 'utf8');
c2 = c2.replace(
  "setErrors((prev) => ({ ...prev, form: err?.message ?? 'Something went wrong. Try again.' })",
  "setErrors((prev) => ({ ...prev, form: err?.message ?? 'Something went wrong. Try again.' }))"
);
fs.writeFileSync(rp, c2);
console.log('RegisterPage.tsx fixed');