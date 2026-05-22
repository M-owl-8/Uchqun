import { readFileSync } from 'fs';
import { join } from 'path';

const I18N_DIR = join(process.cwd(), 'i18n');
const LANG_FILES = ['ru.json', 'uz-latn.json', 'uz-cyrl.json'];
const EXPECTED_CODE_COUNT = 132;

function loadFile(filename) {
  return JSON.parse(readFileSync(join(I18N_DIR, filename), 'utf-8'));
}

function extractCatalogCodes() {
  const catalogPath = join(process.cwd(), '../audits/backend/i18n-error-codes.md');
  const content = readFileSync(catalogPath, 'utf-8');
  const codes = new Set();
  const re = /`([A-Z][A-Z0-9_]{2,})`/g;
  let match;
  while ((match = re.exec(content)) !== null) {
    codes.add(match[1]);
  }
  return codes;
}

describe('i18n translation files', () => {
  for (const filename of LANG_FILES) {
    describe(filename, () => {
      let data;

      beforeAll(() => {
        data = loadFile(filename);
      });

      it('is valid JSON with a _metadata block', () => {
        expect(data).toHaveProperty('_metadata');
        expect(typeof data._metadata).toBe('object');
      });

      it('_metadata.verification_status is UNVERIFIED', () => {
        expect(data._metadata.verification_status).toBe('UNVERIFIED');
      });

      it('_metadata.warning is present', () => {
        expect(typeof data._metadata.warning).toBe('string');
        expect(data._metadata.warning.length).toBeGreaterThan(0);
      });

      it(`has exactly ${EXPECTED_CODE_COUNT} translation entries (excluding _metadata)`, () => {
        const translationKeys = Object.keys(data).filter((k) => k !== '_metadata');
        expect(translationKeys).toHaveLength(EXPECTED_CODE_COUNT);
      });

      it('all translations are non-empty strings', () => {
        const translationEntries = Object.entries(data).filter(([k]) => k !== '_metadata');
        for (const [code, value] of translationEntries) {
          expect(typeof value).toBe('string');
          expect(value.trim().length).toBeGreaterThan(0);
        }
      });

      it('translation keys match the catalog exactly', () => {
        const catalogCodes = extractCatalogCodes();
        const fileKeys = new Set(Object.keys(data).filter((k) => k !== '_metadata'));

        const missing = [...catalogCodes].filter((c) => !fileKeys.has(c));
        const extra = [...fileKeys].filter((c) => !catalogCodes.has(c));

        expect(missing).toHaveLength(0);
        expect(extra).toHaveLength(0);
      });
    });
  }

  it('all three files cover the same 123 keys', () => {
    const allKeys = LANG_FILES.map((f) => {
      const data = loadFile(f);
      return new Set(Object.keys(data).filter((k) => k !== '_metadata'));
    });
    const [ruKeys, latnKeys, cyrlKeys] = allKeys;
    for (const code of ruKeys) {
      expect(latnKeys.has(code)).toBe(true);
      expect(cyrlKeys.has(code)).toBe(true);
    }
  });
});
