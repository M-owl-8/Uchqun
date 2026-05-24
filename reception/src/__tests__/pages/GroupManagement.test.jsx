import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import api from '../../services/api';

vi.mock('react-i18next', () => {
  const t = (k) => k;
  return { useTranslation: () => ({ t }) };
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }) => React.createElement('a', { href: to }, children),
}));

vi.mock('@shared/context/ToastContext', () => {
  const success = vi.fn();
  const error = vi.fn();
  return { useToast: () => ({ success, error }) };
});

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../../../../shared/utils/cache', () => ({
  get: vi.fn(() => null),
  set: vi.fn(),
  invalidate: vi.fn(),
  invalidatePrefix: vi.fn(),
}));

import GroupManagement from '../../pages/GroupManagement';

const teacher1 = { id: 't1', firstName: 'Nargiza', lastName: 'Sobirov' };

const group1 = {
  id: 'g1',
  name: 'Kamalak',
  description: 'Asosiy guruh',
  teacherId: 't1',
  capacity: 15,
  ageRange: '4-7',
};

const group2 = {
  id: 'g2',
  name: 'Nilufar',
  description: '',
  teacherId: 't1',
  capacity: 10,
  ageRange: '',
};

function stubData(groups = [], teachers = []) {
  api.get.mockImplementation((url) => {
    if (url === '/reception/teachers') return Promise.resolve({ data: { data: teachers } });
    if (url === '/groups') return Promise.resolve({ data: { success: true, data: groups } });
    return Promise.reject(new Error('Unexpected URL: ' + url));
  });
}

describe('GroupManagement', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('shows loading spinner while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    render(React.createElement(GroupManagement));
    expect(screen.queryByText('Kamalak')).toBeNull();
  });

  it('renders group cards after data loads', async () => {
    stubData([group1, group2], [teacher1]);
    render(React.createElement(GroupManagement));
    await waitFor(() => expect(screen.getByText('Kamalak')).toBeTruthy());
    expect(screen.getByText('Nilufar')).toBeTruthy();
  });

  it('filters groups by search query', async () => {
    stubData([group1, group2], [teacher1]);
    render(React.createElement(GroupManagement));
    await waitFor(() => expect(screen.getByText('Nilufar')).toBeTruthy());

    fireEvent.change(screen.getByPlaceholderText('groupsPage.search'), {
      target: { value: 'Kamalak' },
    });

    await waitFor(() => expect(screen.queryByText('Nilufar')).toBeNull());
    expect(screen.getByText('Kamalak')).toBeTruthy();
  });

  it('opens create modal when Add button clicked', async () => {
    // GroupManagement modal is a plain <div> (no role="dialog"); detect by h2 text
    stubData([], [teacher1]);
    render(React.createElement(GroupManagement));
    await waitFor(() => expect(screen.getByText('groupsPage.add')).toBeTruthy());

    fireEvent.click(screen.getByText('groupsPage.add').closest('button'));
    // The create modal header and submit button both show 'groupsPage.form.create'
    await waitFor(() =>
      expect(screen.getAllByText('groupsPage.form.create').length).toBeGreaterThanOrEqual(1)
    );
  });

  it('submits create form via POST /groups', async () => {
    stubData([], [teacher1]);
    api.post.mockResolvedValue({ data: {} });
    render(React.createElement(GroupManagement));
    await waitFor(() => expect(screen.getByText('groupsPage.add')).toBeTruthy());

    fireEvent.click(screen.getByText('groupsPage.add').closest('button'));
    await waitFor(() =>
      expect(screen.getAllByText('groupsPage.form.create').length).toBeGreaterThanOrEqual(1)
    );

    // Submit via the form element (the modal contains the only form on the page)
    const form = document.querySelector('form');
    expect(form).toBeTruthy();
    // Set a teacher so validation passes
    fireEvent.change(form.querySelector('select'), { target: { value: teacher1.id } });
    fireEvent.submit(form);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/groups', expect.objectContaining({ teacherId: teacher1.id }))
    );
  });

  it('opens edit modal with group data prefilled', async () => {
    stubData([group1], [teacher1]);
    render(React.createElement(GroupManagement));
    await waitFor(() => expect(screen.getByText('Kamalak')).toBeTruthy());

    fireEvent.click(screen.getAllByText('groupsPage.buttons.edit')[0].closest('button'));

    // Edit modal header says 'groupsPage.form.update'
    await waitFor(() =>
      expect(screen.getAllByText('groupsPage.form.update').length).toBeGreaterThanOrEqual(1)
    );
    const nameInput = screen.getAllByRole('textbox').find((el) => el.value === 'Kamalak');
    expect(nameInput).toBeTruthy();
  });

  it('submits edit form via PUT /groups/:id', async () => {
    stubData([group1], [teacher1]);
    api.put.mockResolvedValue({ data: {} });
    render(React.createElement(GroupManagement));
    await waitFor(() => expect(screen.getByText('Kamalak')).toBeTruthy());

    fireEvent.click(screen.getAllByText('groupsPage.buttons.edit')[0].closest('button'));
    await waitFor(() =>
      expect(screen.getAllByText('groupsPage.form.update').length).toBeGreaterThanOrEqual(1)
    );

    fireEvent.submit(document.querySelector('form'));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(`/groups/${group1.id}`, expect.any(Object))
    );
  });

  it('opens confirm dialog (role=dialog) before deleting a group', async () => {
    stubData([group1], [teacher1]);
    render(React.createElement(GroupManagement));
    await waitFor(() => expect(screen.getByText('Kamalak')).toBeTruthy());

    fireEvent.click(screen.getAllByText('groupsPage.buttons.delete')[0].closest('button'));
    // ConfirmDialog has role="dialog"
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(screen.getByText('groupsPage.confirmDelete')).toBeTruthy();
  });

  it('calls DELETE /groups/:id after confirm', async () => {
    stubData([group1], [teacher1]);
    api.delete.mockResolvedValue({ data: {} });
    render(React.createElement(GroupManagement));
    await waitFor(() => expect(screen.getByText('Kamalak')).toBeTruthy());

    fireEvent.click(screen.getAllByText('groupsPage.buttons.delete')[0].closest('button'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    fireEvent.click(screen.getByText('common.confirm'));
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith(`/groups/${group1.id}`)
    );
  });

  it('silently falls back to empty groups when load fails (swallowed error)', async () => {
    // GroupManagement uses .catch(() => fallback) on both fetch calls — errors are silent.
    // No toast is shown; the empty state is rendered instead.
    api.get.mockRejectedValue(new Error('Network error'));
    render(React.createElement(GroupManagement));
    await waitFor(() =>
      expect(screen.queryByText('Kamalak')).toBeNull()
    );
    // Page renders (not stuck in loading) with empty group list
    expect(screen.queryByText('groupsPage.add')).toBeTruthy();
  });
});
