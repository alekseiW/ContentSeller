const fs = require('fs');
const p = 'C:/Users/webre/Desktop/ContentSeller/guidehub/src/stores/guideStore.ts';
let c = fs.readFileSync(p, 'utf8');

const old = `const updatedSections = Array.isArray(updated.sections) && updated.sections.length > 0
        ? updated.sections
        : state.sections
      const { sections: _unused, ...guideWithoutSections } = updated as Guide & { sections?: GuideSection[] }

      set((state) => ({
        guides: state.guides.map((g) => (g.id === id ? guideWithoutSections : g)),
        currentGuide: state.currentGuide?.id === id ? (guideWithoutSections) : state.currentGuide,
        sections: updatedSections,
        loading: false,
      }))`;

const nw = `const { sections: _unused, ...guideWithoutSections } = updated as Guide & { sections?: GuideSection[] }

      set((state) => ({
        guides: state.guides.map((g) => (g.id === id ? guideWithoutSections : g)),
        currentGuide: state.currentGuide?.id === id ? (guideWithoutSections) : state.currentGuide,
        sections: Array.isArray(updated.sections) && updated.sections.length > 0 ? updated.sections : state.sections,
        loading: false,
      }))` ;

if (c.includes(old)) {
  c = c.replace(old, nw);
  fs.writeFileSync(p, c);
  console.log('fixed successfully');
} else {
  console.log('old string not found');
  // Fallback: replace line by line
  c = c.replace(
    'const updatedSections = Array.isArray(updated.sections) && updated.sections.length > 0\n        ? updated.sections\n        : state.sections\n      const { sections: _unused',
    'const { sections: _unused'
  );
  c = c.replace('sections: updatedSections,', 'sections: Array.isArray(updated.sections) && updated.sections.length > 0 ? updated.sections : state.sections,');
  fs.writeFileSync(p, c);
  console.log('fixed with fallback');
}