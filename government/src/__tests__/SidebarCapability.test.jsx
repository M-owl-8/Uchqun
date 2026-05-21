/**
 * Binding test: Sidebar filters nav items by hasCapability.
 * Proves the JSX wiring (NAV_ITEMS.filter → canSee → hasCapability) is correct —
 * NOT just the hasCapability logic (that's in GovAuthContext.test.js).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  useLocation: () => ({ pathname: '/government' }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key, opts) => opts?.defaultValue ?? _key }),
}));

vi.mock('@shared/assets/ihma-logo.png', () => ({ default: 'logo.png' }));

const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

const Sidebar = (await import('../components/Sidebar.jsx')).default;

// Hrefs for the 11 nav items defined in NAV_ITEMS
const HREF = {
  dashboard:  '/government',
  schools:    '/government/schools',
  students:   '/government/students',
  teachers:   '/government/teachers',
  parents:    '/government/parents',
  ratings:    '/government/ratings',
  warnings:   '/government/warnings',
  auditLog:   '/government/audit-log',
  platform:   '/government/platform',
  profile:    '/government/profile',
  settings:   '/government/settings',
};
const ALL_NAV_HREFS = Object.values(HREF);

const makeCtx = ({ govType, isRepublic, isRegionAccount, hasCapability }) => ({
  user: { firstName: 'A', lastName: 'B', email: 'a@b.uz' },
  logout: vi.fn(),
  govType,
  isRepublic,
  isRegionAccount,
  hasCapability,
});

const getNavHrefs = () =>
  screen.getAllByRole('link').map((l) => l.getAttribute('href'));

describe('Sidebar — capability binding', () => {
  beforeEach(() => vi.clearAllMocks());

  it('republic-main: all 11 nav links rendered', () => {
    mockUseAuth.mockReturnValue(
      makeCtx({ govType: 'main', isRepublic: true, isRegionAccount: false, hasCapability: () => true })
    );
    render(<Sidebar />);
    const hrefs = getNavHrefs();
    ALL_NAV_HREFS.forEach((h) => expect(hrefs).toContain(h));
    expect(hrefs.filter((h) => h.startsWith('/government')).length).toBe(11);
  });

  it('region-main: all 11 nav links rendered', () => {
    mockUseAuth.mockReturnValue(
      makeCtx({ govType: 'main', isRepublic: false, isRegionAccount: true, hasCapability: () => true })
    );
    render(<Sidebar />);
    const hrefs = getNavHrefs();
    ALL_NAV_HREFS.forEach((h) => expect(hrefs).toContain(h));
    expect(hrefs.filter((h) => h.startsWith('/government')).length).toBe(11);
  });

  it('secondary {canViewSchools}: only dashboard + schools + profile + settings', () => {
    const grants = { canViewSchools: true };
    mockUseAuth.mockReturnValue(
      makeCtx({ govType: 'secondary', isRepublic: false, isRegionAccount: true, hasCapability: (k) => grants[k] === true })
    );
    render(<Sidebar />);
    const hrefs = getNavHrefs();

    // Gated-in items
    expect(hrefs).toContain(HREF.dashboard);
    expect(hrefs).toContain(HREF.schools);
    expect(hrefs).toContain(HREF.profile);
    expect(hrefs).toContain(HREF.settings);

    // Gated-out items
    expect(hrefs).not.toContain(HREF.students);
    expect(hrefs).not.toContain(HREF.teachers);
    expect(hrefs).not.toContain(HREF.parents);
    expect(hrefs).not.toContain(HREF.ratings);
    expect(hrefs).not.toContain(HREF.warnings);
    expect(hrefs).not.toContain(HREF.auditLog);
    expect(hrefs).not.toContain(HREF.platform);

    expect(hrefs.filter((h) => h.startsWith('/government')).length).toBe(4);
  });

  it('secondary {canViewSchools, canViewAuditLog}: schools + warnings + auditLog visible; directory/ratings/platform absent', () => {
    const grants = { canViewSchools: true, canViewAuditLog: true };
    mockUseAuth.mockReturnValue(
      makeCtx({ govType: 'secondary', isRepublic: false, isRegionAccount: true, hasCapability: (k) => grants[k] === true })
    );
    render(<Sidebar />);
    const hrefs = getNavHrefs();

    expect(hrefs).toContain(HREF.schools);
    expect(hrefs).toContain(HREF.warnings);   // canViewAuditLog gates this
    expect(hrefs).toContain(HREF.auditLog);   // canViewAuditLog gates this

    expect(hrefs).not.toContain(HREF.students);
    expect(hrefs).not.toContain(HREF.teachers);
    expect(hrefs).not.toContain(HREF.parents);
    expect(hrefs).not.toContain(HREF.ratings);
    expect(hrefs).not.toContain(HREF.platform);

    expect(hrefs.filter((h) => h.startsWith('/government')).length).toBe(6);
  });

  it('secondary {canViewStudents, canViewTeachers, canViewParents}: directory items visible', () => {
    const grants = { canViewStudents: true, canViewTeachers: true, canViewParents: true };
    mockUseAuth.mockReturnValue(
      makeCtx({ govType: 'secondary', isRepublic: false, isRegionAccount: true, hasCapability: (k) => grants[k] === true })
    );
    render(<Sidebar />);
    const hrefs = getNavHrefs();

    expect(hrefs).toContain(HREF.students);
    expect(hrefs).toContain(HREF.teachers);
    expect(hrefs).toContain(HREF.parents);

    expect(hrefs).not.toContain(HREF.schools);
    expect(hrefs).not.toContain(HREF.ratings);
    expect(hrefs).not.toContain(HREF.platform);

    // dashboard + students + teachers + parents + profile + settings = 6
    expect(hrefs.filter((h) => h.startsWith('/government')).length).toBe(6);
  });

  it('[array-gate] secondary {canManageAdmins}: platform visible via OR; schools/ratings/warnings/auditLog absent', () => {
    // Platform uses an array gate: any of [canManageAdmins, canManageGovernmentUsers, canViewMessages, canManageRegistrations]
    const grants = { canManageAdmins: true };
    mockUseAuth.mockReturnValue(
      makeCtx({ govType: 'secondary', isRepublic: false, isRegionAccount: true, hasCapability: (k) => grants[k] === true })
    );
    render(<Sidebar />);
    const hrefs = getNavHrefs();

    expect(hrefs).toContain(HREF.platform);   // visible via canManageAdmins matching the OR array

    expect(hrefs).not.toContain(HREF.schools);
    expect(hrefs).not.toContain(HREF.ratings);
    expect(hrefs).not.toContain(HREF.warnings);
    expect(hrefs).not.toContain(HREF.auditLog);

    expect(hrefs.filter((h) => h.startsWith('/government')).length).toBe(4);
  });
});
