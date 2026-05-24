/**
 * Dashboard tests (RG-001 + RG-002 regression + core renders)
 *
 * RG-001: Dashboard must call /reception/documents (not the old /reception/my-documents) and
 *   use the .data accessor (not .documents) for the response payload.
 * RG-002: No dead "Faollashtirish" button should appear for suspended parents.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import api from '../../services/api';

vi.mock('react-i18next', () => {
  const t = (k, opts) => opts?.defaultValue ?? k;
  return { useTranslation: () => ({ t }) };
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }) => React.createElement('a', { href: to }, children),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { firstName: 'Dilnoza', id: 'r1' } }),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../shared/utils/cache', () => ({
  get: vi.fn(() => null),
  set: vi.fn(),
}));

import Dashboard from '../../pages/Dashboard';

function stubAll({ parents = [], teachers = [], groups = [], docs = [] } = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/reception/parents') return Promise.resolve({ data: { data: parents } });
    if (url === '/reception/teachers') return Promise.resolve({ data: { data: teachers } });
    if (url === '/groups') return Promise.resolve({ data: { success: true, data: groups } });
    if (url === '/reception/documents') return Promise.resolve({ data: { data: docs } });
    return Promise.reject(new Error('Unexpected URL: ' + url));
  });
}

describe('Dashboard', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('[RG-001] calls /reception/documents (NOT /reception/my-documents)', async () => {
    stubAll();
    render(React.createElement(Dashboard));
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const urls = api.get.mock.calls.map((c) => c[0]);
    expect(urls).toContain('/reception/documents');
    expect(urls).not.toContain('/reception/my-documents');
  });

  it('[RG-001] shows pending docs count when docs with status=pending are returned', async () => {
    const pendingDoc = { id: 'd1', name: 'Diplom.pdf', status: 'pending', fileName: 'Diplom.pdf' };
    stubAll({ docs: [pendingDoc] });
    render(React.createElement(Dashboard));
    await waitFor(() => expect(screen.getByText('Diplom.pdf')).toBeTruthy());
  });

  it('[RG-002] no dead Activate button for suspended parents (button removed)', async () => {
    const suspendedParent = {
      id: 'p1', firstName: 'Test', lastName: 'Parent',
      status: 'suspended', isActive: false,
    };
    stubAll({ parents: [suspendedParent] });
    render(React.createElement(Dashboard));
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    // The dead onClick-less button "Faollashtirish" must be gone (RG-002)
    expect(screen.queryByText('Faollashtirish')).toBeNull();
  });

  it('renders stats counts from API response', async () => {
    stubAll({
      parents: [{ id: 'p1', status: 'active' }, { id: 'p2', status: 'active' }],
      teachers: [{ id: 't1' }],
    });
    render(React.createElement(Dashboard));
    await waitFor(() => {
      // Stats cards show counts as numbers
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders "Boshqaruv paneli" page heading', async () => {
    stubAll();
    render(React.createElement(Dashboard));
    await waitFor(() => expect(screen.getByText('Boshqaruv paneli')).toBeTruthy());
  });

  it('shows empty state for pending docs when no docs pending', async () => {
    const approvedDoc = { id: 'd1', name: 'Doc.pdf', status: 'approved' };
    stubAll({ docs: [approvedDoc] });
    render(React.createElement(Dashboard));
    await waitFor(() =>
      expect(screen.getByText("Tasdiq kutayotgan hujjat yo'q")).toBeTruthy()
    );
  });
});
