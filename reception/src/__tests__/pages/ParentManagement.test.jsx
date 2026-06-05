import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import api from '../../services/api';
import ParentManagement from '../../pages/ParentManagement';

vi.mock('react-i18next', () => {
  const t = (k) => k;
  const i18n = { language: 'en' };
  return { useTranslation: () => ({ t, i18n }) };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children }) => React.createElement('a', { href: to }, children),
}));

vi.mock('@shared/context/ToastContext', () => {
  const success = vi.fn();
  const error = vi.fn();
  return { useToast: () => ({ success, error }) };
});

vi.mock('../../components/Card', () => ({
  default: ({ children, className }) =>
    React.createElement('div', { 'data-testid': 'card', className }, children),
}));

// SkeletonList not mocked — real component renders animate-pulse elements

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

const parent1 = {
  id: 'p1',
  firstName: 'Aziz',
  lastName: 'Karimov',
  email: 'aziz@test.uz',
  phone: '+998901234567',
  status: 'active',
  isActive: true,
  teacherId: 't1',
  groupId: 'g1',
  assignedTeacher: { firstName: 'Sara', lastName: 'Tosheva' },
  group: { name: 'Guruh A' },
  children: [
    {
      id: 'c1',
      firstName: 'Bobur',
      lastName: 'Karimov',
      dateOfBirth: '2018-05-01',
      gender: 'Male',
      disabilityType: 'Autism',
    },
  ],
};

const parent2 = {
  id: 'p2',
  firstName: 'Malika',
  lastName: 'Yusupova',
  email: 'malika@test.uz',
  phone: null,
  status: 'active',
  isActive: true,
  teacherId: null,
  groupId: null,
  assignedTeacher: null,
  group: null,
  children: [],
};

const parentSuspended = {
  id: 'p3',
  firstName: 'Sarvar',
  lastName: 'Umarov',
  email: 'sarvar@test.uz',
  phone: null,
  status: 'suspended',
  isActive: true,
  teacherId: null,
  groupId: null,
  children: [],
};

const teacher1 = { id: 't1', firstName: 'Sara', lastName: 'Tosheva' };
const group1 = { id: 'g1', name: 'Guruh A', teacherId: 't1' };

function stubLoad(parents = [], teachers = [], groups = []) {
  api.get.mockImplementation((url) => {
    if (url === '/reception/parents')
      return Promise.resolve({ data: { data: parents } });
    if (url === '/reception/teachers')
      return Promise.resolve({ data: { data: teachers } });
    if (url === '/groups')
      return Promise.resolve({ data: { success: true, data: groups } });
    return Promise.reject(new Error('Unexpected URL: ' + url));
  });
}

describe('CL-012 ParentManagement integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows skeleton list while loading', async () => {
    api.get.mockImplementation(() => new Promise(() => {})); // never resolves
    const { container } = render(React.createElement(ParentManagement));
    // loading=true: only SkeletonList renders, no page heading
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders parent cards after data loads', async () => {
    stubLoad([parent1, parent2], [teacher1], [group1]);
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Aziz Karimov')).toBeTruthy());
    expect(screen.getByText('Malika Yusupova')).toBeTruthy();
    // email shown twice per card (header + contact row)
    expect(screen.getAllByText('aziz@test.uz').length).toBeGreaterThan(0);
  });

  it('filters parents by search query', async () => {
    stubLoad([parent1, parent2], [teacher1], [group1]);
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Aziz Karimov')).toBeTruthy());

    const searchInput = screen.getByPlaceholderText('parentsPage.search');
    fireEvent.change(searchInput, { target: { value: 'Malika' } });

    await waitFor(() => expect(screen.queryByText('Aziz Karimov')).toBeNull());
    expect(screen.getByText('Malika Yusupova')).toBeTruthy();
  });

  it('clicking add button navigates to new parent wizard', async () => {
    stubLoad([], [teacher1], [group1]);
    render(React.createElement(ParentManagement));
    // With empty parents both the toolbar Add and the empty-state Add render the
    // same key text, so we use getAllByText and click the first (toolbar) button.
    await waitFor(() => expect(screen.getAllByText('parentsPage.add').length).toBeGreaterThan(0));

    fireEvent.click(screen.getAllByText('parentsPage.add')[0].closest('button'));

    expect(mockNavigate).toHaveBeenCalledWith('/reception/parents/new');
  });

  it('edit modal shows all form fields and submits via PUT', async () => {
    stubLoad([parent1], [teacher1], [group1]);
    api.put.mockResolvedValue({ data: {} });
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Aziz Karimov')).toBeTruthy());

    const editButtons = screen.getAllByText('parentsPage.buttons.edit');
    fireEvent.click(editButtons[0].closest('button'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    expect(screen.getByText('parentsPage.form.firstName')).toBeTruthy();
    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        `/reception/parents/${parent1.id}`,
        expect.objectContaining({ firstName: 'Aziz' })
      );
    });
  });

  it('opens edit modal prefilled with parent data', async () => {
    stubLoad([parent1], [teacher1], [group1]);
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Aziz Karimov')).toBeTruthy());

    // Click the edit button in the action row
    const editButtons = screen.getAllByText('parentsPage.buttons.edit');
    fireEvent.click(editButtons[0].closest('button'));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    const firstNameInput = screen.getAllByRole('textbox').find(
      (el) => el.value === 'Aziz'
    );
    expect(firstNameInput).toBeTruthy();
  });

  it('submits edit parent form via PUT /reception/parents/:id', async () => {
    stubLoad([parent1], [teacher1], [group1]);
    api.put.mockResolvedValue({ data: {} });
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Aziz Karimov')).toBeTruthy());

    const editButtons = screen.getAllByText('parentsPage.buttons.edit');
    fireEvent.click(editButtons[0].closest('button'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        `/reception/parents/${parent1.id}`,
        expect.objectContaining({ firstName: 'Aziz' })
      );
    });
  });

  it('shows confirm dialog and calls DELETE on parent delete confirm', async () => {
    stubLoad([parent1], [teacher1], [group1]);
    api.delete.mockResolvedValue({ data: {} });
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Aziz Karimov')).toBeTruthy());

    const deleteButtons = screen.getAllByText('parentsPage.buttons.delete');
    fireEvent.click(deleteButtons[0].closest('button'));

    // confirm dialog should appear
    await waitFor(() => expect(screen.getByText('parentsPage.confirmDelete')).toBeTruthy());

    // The inline confirm dialog has two buttons; find the one that is not cancel
    const dialogButtons = screen.getByText('parentsPage.confirmDelete').closest('div').querySelectorAll('button');
    fireEvent.click(dialogButtons[1]); // second button = confirm

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/reception/parents/${parent1.id}`);
    });
  });

  it('opens add child modal when add child button clicked', async () => {
    stubLoad([parent1], [teacher1], [group1]);
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Aziz Karimov')).toBeTruthy());

    const addChildBtn = screen.getByText('parentsPage.buttons.addChild').closest('button');
    fireEvent.click(addChildBtn);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
  });

  it('opens edit child modal when child edit button clicked', async () => {
    stubLoad([parent1], [teacher1], [group1]);
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Bobur Karimov')).toBeTruthy());

    const editChildBtn = screen.getByTitle('parentsPage.editChildTitle');
    fireEvent.click(editChildBtn);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    // Should be prefilled with child's name
    const boburInput = screen.getAllByRole('textbox').find((el) => el.value === 'Bobur');
    expect(boburInput).toBeTruthy();
  });

  it('shows confirm dialog and calls DELETE on child delete confirm', async () => {
    stubLoad([parent1], [teacher1], [group1]);
    api.delete.mockResolvedValue({ data: {} });
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Bobur Karimov')).toBeTruthy());

    const deleteChildBtn = screen.getByTitle('parentsPage.buttons.delete');
    fireEvent.click(deleteChildBtn);

    await waitFor(() => expect(screen.getByText('parentsPage.confirmDeleteChild')).toBeTruthy());

    const dialogButtons = screen.getByText('parentsPage.confirmDeleteChild').closest('div').querySelectorAll('button');
    fireEvent.click(dialogButtons[1]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(`/reception/children/${parent1.children[0].id}`);
    });
  });

  it('calls PUT /reception/parents/:id/activate for a suspended parent', async () => {
    stubLoad([parentSuspended], [teacher1], [group1]);
    api.put.mockResolvedValue({ data: {} });
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Sarvar Umarov')).toBeTruthy());

    // suspended parent shows Faollashtirish in the dropdown menu
    fireEvent.click(screen.getByText('parentsPage.buttons.activate').closest('button'));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(`/reception/parents/${parentSuspended.id}/activate`)
    );
  });

  it('opens confirm dialog then calls PUT /reception/parents/:id/suspend', async () => {
    stubLoad([parent1], [teacher1], [group1]);
    api.put.mockResolvedValue({ data: {} });
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Aziz Karimov')).toBeTruthy());

    fireEvent.click(screen.getByText('parentsPage.buttons.suspend').closest('button'));
    await waitFor(() => expect(screen.getByText('parentsPage.confirmSuspend')).toBeTruthy());

    const dialogButtons = screen.getByText('parentsPage.confirmSuspend').closest('div').querySelectorAll('button');
    fireEvent.click(dialogButtons[1]);

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(`/reception/parents/${parent1.id}/suspend`)
    );
  });

  it('shows temp password modal after credential reset', async () => {
    stubLoad([parent1], [teacher1], [group1]);
    api.post.mockResolvedValue({ data: { data: { tempPassword: 'Abc123XyZ9', mustChangePassword: true } } });
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Aziz Karimov')).toBeTruthy());

    fireEvent.click(screen.getByText('parentsPage.buttons.resetCredentials').closest('button'));
    await waitFor(() => expect(screen.getByText('parentsPage.confirmResetCredentials')).toBeTruthy());

    const dialogButtons = screen.getByText('parentsPage.confirmResetCredentials').closest('div').querySelectorAll('button');
    fireEvent.click(dialogButtons[1]);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(`/reception/parents/${parent1.id}/reset-credentials`)
    );
    await waitFor(() => expect(screen.getByText('Abc123XyZ9')).toBeTruthy());
  });
});
