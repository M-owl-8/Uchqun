import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ---- stable mock handles ----
const mockSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('../../shared/context/ToastContext', () => ({
  useToast: () => ({
    success: mockSuccess,
    error: mockToastError,
  }),
}));

vi.mock('../../shared/context/AuthContext', () => ({
  useAuth: () => ({
    user: { firstName: 'Ali', lastName: 'Valiyev' },
    isTeacher: true,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => opts?.defaultValue ?? k,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../shared/components/ConfirmDialog', () => ({
  default: ({ dialog, onCancel }) =>
    dialog
      ? React.createElement('div', { 'data-testid': 'confirm-dialog' },
          React.createElement('button', { onClick: dialog.onConfirm, 'data-testid': 'confirm-ok' }, 'OK'),
          React.createElement('button', { onClick: onCancel, 'data-testid': 'confirm-cancel' }, 'Cancel'),
        )
      : null,
}));

vi.mock('../../shared/components/LoadingSpinner', () => ({
  default: () => React.createElement('div', { 'data-testid': 'spinner' }),
}));

const mockApi = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
vi.mock('../../shared/services/api', () => ({ default: mockApi }));

const activity1 = {
  id: 'act-1',
  skill: 'Reading',
  goal: 'Learn to read words',
  startDate: '2026-01-01T00:00:00.000Z',
  endDate: '2026-04-01T00:00:00.000Z',
  teacher: 'Ali Valiyev',
  tasks: ['Task A', 'Task B'],
  methods: 'Direct instruction',
  progress: 'Good',
  observation: 'Improving',
  services: ['Logoped'],
  childId: 'child-1',
  child: { id: 'child-1', firstName: 'Zafar', lastName: 'Yusupov' },
};

const parent1 = {
  id: 'parent-1',
  firstName: 'Bobur',
  lastName: 'Xasanov',
  children: [{ id: 'child-1', firstName: 'Zafar', lastName: 'Yusupov' }],
};

function stubLoad(activities = [], parents = []) {
  mockApi.get.mockImplementation((url) => {
    if (url === '/activities') return Promise.resolve({ data: activities });
    if (url === '/teacher/parents') return Promise.resolve({ data: { parents } });
    return Promise.resolve({ data: {} });
  });
}

beforeEach(() => {
  vi.resetModules();
  mockSuccess.mockClear();
  mockToastError.mockClear();
  mockApi.get.mockReset();
  mockApi.post.mockReset();
  mockApi.put.mockReset();
  mockApi.delete.mockReset();
});

describe('CL-013 Activities page', () => {
  it('shows loading spinner initially', async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    const { default: Activities } = await import('../../pages/Activities');
    const { container } = render(React.createElement(Activities));
    expect(container.querySelector('[data-testid="spinner"]')).toBeTruthy();
  });

  it('renders activity cards after load', async () => {
    stubLoad([activity1], [parent1]);
    const { default: Activities } = await import('../../pages/Activities');
    render(React.createElement(Activities));
    await waitFor(() => expect(screen.getByText('Reading')).toBeTruthy());
    expect(screen.getByText('Ali Valiyev')).toBeTruthy();
  });

  it('shows empty state when no activities', async () => {
    stubLoad([], []);
    const { default: Activities } = await import('../../pages/Activities');
    render(React.createElement(Activities));
    await waitFor(() => expect(screen.getByText('activitiesPage.empty')).toBeTruthy());
  });

  it('opens details modal when details button clicked', async () => {
    stubLoad([activity1], [parent1]);
    const { default: Activities } = await import('../../pages/Activities');
    render(React.createElement(Activities));
    await waitFor(() => expect(screen.getByText('Reading')).toBeTruthy());
    fireEvent.click(screen.getByText('activitiesPage.showDetails'));
    expect(screen.getAllByText('Learn to read words').length).toBeGreaterThan(0);
    expect(screen.getByText('Task A')).toBeTruthy();
  });

  it('closes details modal with close button', async () => {
    stubLoad([activity1], [parent1]);
    const { default: Activities } = await import('../../pages/Activities');
    render(React.createElement(Activities));
    await waitFor(() => screen.getByText('activitiesPage.showDetails'));
    fireEvent.click(screen.getByText('activitiesPage.showDetails'));
    await waitFor(() => screen.getByText('activitiesPage.close'));
    fireEvent.click(screen.getByText('activitiesPage.close'));
    await waitFor(() => expect(screen.queryByText('activitiesPage.close')).toBeFalsy());
  });

  it('opens create modal when add button clicked', async () => {
    stubLoad([], [parent1]);
    const { default: Activities } = await import('../../pages/Activities');
    render(React.createElement(Activities));
    await waitFor(() => screen.getByText('activitiesPage.empty'));
    fireEvent.click(screen.getByText('activitiesPage.add'));
    await waitFor(() => expect(screen.getByText('activitiesPage.createTitle')).toBeTruthy());
  });

  it('submits create form and reloads activities', async () => {
    stubLoad([], [parent1]);
    mockApi.post.mockResolvedValue({ data: { id: 'act-new' } });
    const { default: Activities } = await import('../../pages/Activities');
    render(React.createElement(Activities));
    await waitFor(() => screen.getByText('activitiesPage.empty'));
    fireEvent.click(screen.getByText('activitiesPage.add'));
    await waitFor(() => screen.getByText('activitiesPage.createTitle'));

    // Fill required fields
    const inputs = document.querySelectorAll('input[type="text"]');
    fireEvent.change(inputs[0], { target: { value: 'New Skill' } });
    const textareas = document.querySelectorAll('textarea');
    fireEvent.change(textareas[0], { target: { value: 'New Goal' } });

    stubLoad([{ ...activity1, id: 'act-new', skill: 'New Skill' }], [parent1]);
    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });

  it('shows confirm dialog and calls DELETE on confirm', async () => {
    stubLoad([activity1], [parent1]);
    mockApi.delete.mockResolvedValue({});
    const { default: Activities } = await import('../../pages/Activities');
    render(React.createElement(Activities));
    await waitFor(() => screen.getByText('Reading'));

    // Click delete button inside the card
    const deleteBtns = document.querySelectorAll('button[title]');
    const deleteBtn = Array.from(deleteBtns).find(b =>
      b.title === 'activitiesPage.delete' || b.title === "O'chirish"
    );
    fireEvent.click(deleteBtn);
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy();

    stubLoad([], []);
    fireEvent.click(screen.getByTestId('confirm-ok'));
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith('/activities/act-1'));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });

  it('opens edit modal with prefilled data', async () => {
    stubLoad([activity1], [parent1]);
    const { default: Activities } = await import('../../pages/Activities');
    render(React.createElement(Activities));
    await waitFor(() => screen.getByText('Reading'));

    const editBtns = document.querySelectorAll('button[title]');
    const editBtn = Array.from(editBtns).find(b =>
      b.title === 'activitiesPage.edit' || b.title === 'Tahrirlash'
    );
    fireEvent.click(editBtn);
    await waitFor(() => screen.getByText('activitiesPage.editTitle'));
    // Skill field should be pre-filled
    expect(document.querySelector('input[value="Reading"]')).toBeTruthy();
  });
});
