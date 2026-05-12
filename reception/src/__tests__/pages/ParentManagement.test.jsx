import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => opts?.defaultValue ?? k,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

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

const parent1 = {
  id: 'p1',
  firstName: 'Aziz',
  lastName: 'Karimov',
  email: 'aziz@test.uz',
  phone: '+998901234567',
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
  teacherId: null,
  groupId: null,
  assignedTeacher: null,
  group: null,
  children: [],
};

const teacher1 = { id: 't1', firstName: 'Sara', lastName: 'Tosheva' };
const group1 = { id: 'g1', name: 'Guruh A', teacherId: 't1' };

function stubLoad(api, parents = [], teachers = [], groups = []) {
  api.get.mockImplementation((url) => {
    if (url === '/reception/parents')
      return Promise.resolve({ data: { data: parents } });
    if (url === '/reception/teachers')
      return Promise.resolve({ data: { data: teachers } });
    if (url === '/groups')
      return Promise.resolve({ data: { groups } });
    return Promise.reject(new Error('Unexpected URL: ' + url));
  });
}

describe('CL-012 ParentManagement integration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('shows skeleton list while loading', async () => {
    const api = (await import('../../services/api')).default;
    api.get.mockImplementation(() => new Promise(() => {})); // never resolves
    const { default: ParentManagement } = await import('../../pages/ParentManagement');
    const { container } = render(React.createElement(ParentManagement));
    // loading=true: only SkeletonList renders, no page heading
    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders parent cards after data loads', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api, [parent1, parent2], [teacher1], [group1]);
    const { default: ParentManagement } = await import('../../pages/ParentManagement');
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Aziz Karimov')).toBeTruthy());
    expect(screen.getByText('Malika Yusupova')).toBeTruthy();
    // email shown twice per card (header + contact row)
    expect(screen.getAllByText('aziz@test.uz').length).toBeGreaterThan(0);
  });

  it('filters parents by search query', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api, [parent1, parent2], [teacher1], [group1]);
    const { default: ParentManagement } = await import('../../pages/ParentManagement');
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Aziz Karimov')).toBeTruthy());

    const searchInput = screen.getByPlaceholderText('parentsPage.search');
    fireEvent.change(searchInput, { target: { value: 'Malika' } });

    await waitFor(() => expect(screen.queryByText('Aziz Karimov')).toBeNull());
    expect(screen.getByText('Malika Yusupova')).toBeTruthy();
  });

  it('opens create parent modal on add button click', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api, [], [teacher1], [group1]);
    const { default: ParentManagement } = await import('../../pages/ParentManagement');
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('parentsPage.add')).toBeTruthy());

    fireEvent.click(screen.getByText('parentsPage.add').closest('button'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
    expect(screen.getByText('parentsPage.form.firstName')).toBeTruthy();
  });

  it('submits create parent form via POST /reception/parents', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api, [], [teacher1], [group1]);
    api.post.mockResolvedValue({ data: {} });
    const { default: ParentManagement } = await import('../../pages/ParentManagement');
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('parentsPage.add')).toBeTruthy());

    fireEvent.click(screen.getByText('parentsPage.add').closest('button'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    const form = screen.getByRole('dialog').querySelector('form');
    // Use type-specific selectors — labels are not linked to inputs via htmlFor
    const textInputs = form.querySelectorAll('input[type="text"]');
    fireEvent.change(textInputs[0], { target: { value: 'Yangi' } });   // firstName
    fireEvent.change(textInputs[1], { target: { value: 'Ota' } });     // lastName
    fireEvent.change(form.querySelector('input[type="email"]'), { target: { value: 'yangi@test.uz' } });
    fireEvent.change(form.querySelector('input[type="password"]'), { target: { value: 'Pass1234!' } });

    // Group select is the second <select> (index 1); teacher is index 0
    const selects = form.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'g1' } });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/reception/parents', expect.any(FormData));
    });
  });

  it('opens edit modal prefilled with parent data', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api, [parent1], [teacher1], [group1]);
    const { default: ParentManagement } = await import('../../pages/ParentManagement');
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
    const api = (await import('../../services/api')).default;
    stubLoad(api, [parent1], [teacher1], [group1]);
    api.put.mockResolvedValue({ data: {} });
    const { default: ParentManagement } = await import('../../pages/ParentManagement');
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
    const api = (await import('../../services/api')).default;
    stubLoad(api, [parent1], [teacher1], [group1]);
    api.delete.mockResolvedValue({ data: {} });
    const { default: ParentManagement } = await import('../../pages/ParentManagement');
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
    const api = (await import('../../services/api')).default;
    stubLoad(api, [parent1], [teacher1], [group1]);
    const { default: ParentManagement } = await import('../../pages/ParentManagement');
    render(React.createElement(ParentManagement));
    await waitFor(() => expect(screen.getByText('Aziz Karimov')).toBeTruthy());

    const addChildBtn = screen.getByText('parentsPage.buttons.addChild').closest('button');
    fireEvent.click(addChildBtn);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
  });

  it('opens edit child modal when child edit button clicked', async () => {
    const api = (await import('../../services/api')).default;
    stubLoad(api, [parent1], [teacher1], [group1]);
    const { default: ParentManagement } = await import('../../pages/ParentManagement');
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
    const api = (await import('../../services/api')).default;
    stubLoad(api, [parent1], [teacher1], [group1]);
    api.delete.mockResolvedValue({ data: {} });
    const { default: ParentManagement } = await import('../../pages/ParentManagement');
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
});
