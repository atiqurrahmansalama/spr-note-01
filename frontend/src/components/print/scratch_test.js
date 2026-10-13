import { resolveTokenValue, mergeTemplateWithData } from './docxTemplateEngine.js';

const record = {
  'date': '13/10/2026',
  'juz-number': '29',
  'juz-page': '29: 8–23',
  'total-mis': '3',
  'detail-mis': 'Page 8 Ayah 42\nPage 22 Ayah 19\nPage 23 Ayah 5',
  'remarks': 'Masha Allah, Passed.',
  'section': 'MI Taufiq ',
  'is_multi_juz': 'false'
};

const lookup = new Map(Object.entries(record));
const resolved = resolveTokenValue('juz-page | indent: 11', lookup, 'html');
console.log('Resolved juz-page:', JSON.stringify(resolved));
