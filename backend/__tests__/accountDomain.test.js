/**
 * GOV-ACCOUNT-DOMAINS: Behavioral test matrix for resolveEmailDomain.
 *
 * Every valid creation path must succeed with the correct domain.
 * Every invalid path must throw the specific error code.
 *
 * Uses jest.unstable_mockModule to mock School and Region lookups
 * so tests run without a real DB connection.
 */
import { jest } from '@jest/globals';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const REGION_TOSHKENT_ID = '00000000-0000-0000-0000-000000000001';
const REGION_SAMARQAND_ID = '00000000-0000-0000-0000-000000000002';
const SCHOOL_TMM1_ID = 'eec19bb5-36ae-4006-a330-031d07654c40';
const SCHOOL_SMM1_ID = '2dac6af4-96c9-4c4f-8430-aac62440f4e5';

const REGIONS = {
  [REGION_TOSHKENT_ID]: { id: REGION_TOSHKENT_ID, slug: 'toshkent' },
  [REGION_SAMARQAND_ID]: { id: REGION_SAMARQAND_ID, slug: 'samarqand' },
};
const SCHOOLS_BY_ID = {
  [SCHOOL_TMM1_ID]: { id: SCHOOL_TMM1_ID, slug: 'tmm1', regionId: REGION_TOSHKENT_ID },
  [SCHOOL_SMM1_ID]: { id: SCHOOL_SMM1_ID, slug: 'smm1', regionId: REGION_SAMARQAND_ID },
};

// mock School.findByPk and School.findOne; mock Region.findByPk
const mockRegionFindByPk = jest.fn(async (id) => REGIONS[id] ?? null);
const mockSchoolFindByPk = jest.fn(async (id) => SCHOOLS_BY_ID[id] ?? null);
const mockSchoolFindOne  = jest.fn(async ({ where }) => {
  const { id, regionId } = where;
  const school = SCHOOLS_BY_ID[id];
  if (!school) return null;
  if (regionId && school.regionId !== regionId) return null;
  return school;
});

jest.unstable_mockModule('../models/Region.js', () => ({
  default: { findByPk: mockRegionFindByPk },
}));
jest.unstable_mockModule('../models/School.js', () => ({
  default: { findByPk: mockSchoolFindByPk, findOne: mockSchoolFindOne },
}));

const { resolveEmailDomain, isValidLocalPart, REPUBLIC_DOMAIN } = await import('../utils/accountDomain.js');

// ── Creator factories ─────────────────────────────────────────────────────────

const republicMain  = () => ({ role: 'government', govLevel: 'republic',  govType: 'main',      govRegionId: null, schoolId: null });
const regionToshkent = () => ({ role: 'government', govLevel: 'region',   govType: 'main',      govRegionId: REGION_TOSHKENT_ID,  schoolId: null });
const regionSamarqand = () => ({ role: 'government', govLevel: 'region',  govType: 'main',      govRegionId: REGION_SAMARQAND_ID, schoolId: null });
const adminTmm1     = () => ({ role: 'admin',      govLevel: null,        govType: null,         govRegionId: null, schoolId: SCHOOL_TMM1_ID });
const receptionTmm1 = () => ({ role: 'reception',  govLevel: null,        govType: null,         govRegionId: null, schoolId: SCHOOL_TMM1_ID });

beforeEach(() => jest.clearAllMocks());

// ── isValidLocalPart ──────────────────────────────────────────────────────────

describe('isValidLocalPart', () => {
  it('accepts simple alpha', () => expect(isValidLocalPart('dilnoza')).toBe(true));
  it('accepts with dot', () => expect(isValidLocalPart('d.ergashev')).toBe(true));
  it('accepts with hyphen', () => expect(isValidLocalPart('first-last')).toBe(true));
  it('accepts single char', () => expect(isValidLocalPart('a')).toBe(true));
  it('rejects empty string', () => expect(isValidLocalPart('')).toBe(false));
  it('rejects null', () => expect(isValidLocalPart(null)).toBe(false));
  it('rejects @ in local part', () => expect(isValidLocalPart('a@b')).toBe(false));
  it('rejects leading dot', () => expect(isValidLocalPart('.abc')).toBe(false));
  it('rejects spaces', () => expect(isValidLocalPart('a b')).toBe(false));
  it('rejects uppercase', () => expect(isValidLocalPart('Abc')).toBe(false));
  it('rejects > 32 chars', () => expect(isValidLocalPart('a'.repeat(33))).toBe(false));
});

// ── REPUBLIC_DOMAIN ───────────────────────────────────────────────────────────

describe('REPUBLIC_DOMAIN constant', () => {
  it('equals davlat.uz', () => expect(REPUBLIC_DOMAIN).toBe('davlat.uz'));
});

// ── Valid paths ───────────────────────────────────────────────────────────────

describe('resolveEmailDomain — valid paths', () => {
  it('republic creates republic-level gov → davlat.uz', async () => {
    const domain = await resolveEmailDomain(republicMain(), 'government', { govLevel: 'republic' });
    expect(domain).toBe('davlat.uz');
  });

  it('republic creates region-level gov for Toshkent → toshkent.uz', async () => {
    const domain = await resolveEmailDomain(
      republicMain(), 'government',
      { govLevel: 'region', govRegionId: REGION_TOSHKENT_ID }
    );
    expect(domain).toBe('toshkent.uz');
  });

  it('republic creates region-level gov for Samarqand → samarqand.uz', async () => {
    const domain = await resolveEmailDomain(
      republicMain(), 'government',
      { govLevel: 'region', govRegionId: REGION_SAMARQAND_ID }
    );
    expect(domain).toBe('samarqand.uz');
  });

  it('republic creates admin for TMM1 → tmm1.uz', async () => {
    const domain = await resolveEmailDomain(republicMain(), 'admin', { schoolId: SCHOOL_TMM1_ID });
    expect(domain).toBe('tmm1.uz');
  });

  it('region-Toshkent creates region peer (same region) → toshkent.uz', async () => {
    const domain = await resolveEmailDomain(
      regionToshkent(), 'government',
      { govLevel: 'region', govRegionId: REGION_TOSHKENT_ID }
    );
    expect(domain).toBe('toshkent.uz');
  });

  it('region-Toshkent creates admin for TMM1 (in own region) → tmm1.uz', async () => {
    const domain = await resolveEmailDomain(
      regionToshkent(), 'admin',
      { schoolId: SCHOOL_TMM1_ID }
    );
    expect(domain).toBe('tmm1.uz');
  });

  it('admin creates reception → tmm1.uz', async () => {
    const domain = await resolveEmailDomain(adminTmm1(), 'reception');
    expect(domain).toBe('tmm1.uz');
  });

  it('admin creates teacher → tmm1.uz', async () => {
    const domain = await resolveEmailDomain(adminTmm1(), 'teacher');
    expect(domain).toBe('tmm1.uz');
  });

  it('admin creates parent → tmm1.uz', async () => {
    const domain = await resolveEmailDomain(adminTmm1(), 'parent');
    expect(domain).toBe('tmm1.uz');
  });

  it('reception creates parent → tmm1.uz', async () => {
    const domain = await resolveEmailDomain(receptionTmm1(), 'parent');
    expect(domain).toBe('tmm1.uz');
  });
});

// ── Rejected paths ────────────────────────────────────────────────────────────

async function expectError(fn, code) {
  try {
    await fn();
    throw new Error('Expected rejection but got success');
  } catch (err) {
    if (err.message === 'Expected rejection but got success') throw err;
    expect(err).toHaveProperty('code', code);
  }
}

describe('resolveEmailDomain — rejected paths', () => {
  it('region-Toshkent cannot create region peer in Samarqand → ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE', async () => {
    await expectError(
      () => resolveEmailDomain(
        regionToshkent(), 'government',
        { govLevel: 'region', govRegionId: REGION_SAMARQAND_ID }
      ),
      'ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE'
    );
  });

  it('region-Toshkent cannot create admin for school in Samarqand → ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE', async () => {
    await expectError(
      () => resolveEmailDomain(regionToshkent(), 'admin', { schoolId: SCHOOL_SMM1_ID }),
      'ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE'
    );
  });

  it('admin cannot create another admin → ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', async () => {
    await expectError(
      () => resolveEmailDomain(adminTmm1(), 'admin', { schoolId: SCHOOL_TMM1_ID }),
      'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY'
    );
  });

  it('admin cannot create government account → ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', async () => {
    await expectError(
      () => resolveEmailDomain(adminTmm1(), 'government', { govLevel: 'republic' }),
      'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY'
    );
  });

  it('reception cannot create teacher → ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', async () => {
    await expectError(
      () => resolveEmailDomain(receptionTmm1(), 'teacher'),
      'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY'
    );
  });

  it('reception cannot create admin → ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', async () => {
    await expectError(
      () => resolveEmailDomain(receptionTmm1(), 'admin', { schoolId: SCHOOL_TMM1_ID }),
      'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY'
    );
  });

  it('region-Toshkent cannot create republic-level account → ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', async () => {
    await expectError(
      () => resolveEmailDomain(regionToshkent(), 'government', { govLevel: 'republic' }),
      'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY'
    );
  });

  it('non-government cannot create government account → ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', async () => {
    await expectError(
      () => resolveEmailDomain(adminTmm1(), 'government', { govLevel: 'region', govRegionId: REGION_TOSHKENT_ID }),
      'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY'
    );
  });

  it('creating government without govRegionId for region level → ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', async () => {
    await expectError(
      () => resolveEmailDomain(republicMain(), 'government', { govLevel: 'region', govRegionId: null }),
      'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY'
    );
  });

  it('creating admin without schoolId → ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', async () => {
    await expectError(
      () => resolveEmailDomain(republicMain(), 'admin', {}),
      'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY'
    );
  });

  it('admin with no schoolId cannot create reception → ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', async () => {
    const adminNoSchool = { role: 'admin', schoolId: null, govLevel: null, govType: null };
    await expectError(
      () => resolveEmailDomain(adminNoSchool, 'reception'),
      'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY'
    );
  });
});
