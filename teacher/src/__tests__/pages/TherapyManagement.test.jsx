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

vi.mock('react-i18next', () => {
  // S30: stable identities — returning a fresh t per useTranslation() call
  // retriggers useCallback/useEffect chains and caused the Activities
  // infinite-render loop that hung the whole suite.
  const stable = { t: (k, opts) => opts?.defaultValue ?? k };
  return { useTranslation: () => stable };
});

vi.mock('../../shared/components/LoadingSpinner', () => ({
  default: () => React.createElement('div', { 'data-testid': 'spinner' }),
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

vi.mock('../../shared/components/Card', () => ({
  default: ({ children, className }) =>
    React.createElement('div', { className }, children),
}));

const mockApi = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
vi.mock('../../shared/services/api', () => ({ default: mockApi }));

const therapy1 = {
  id: 'th-1',
  title: 'Music Therapy',
  description: 'Relaxing music',
  therapyType: 'music',
  contentUrl: 'https://example.com/music.mp3',
  contentType: 'audio',
  duration: 30,
  rating: 4.5,
  usageCount: 10,
  tags: ['relax', 'calm'],
  ageGroup: 'all',
  difficultyLevel: 'all',
  isActive: true,
};

const parent1 = {
  id: 'par-1',
  firstName: 'Bobur',
  lastName: 'Xasanov',
  children: [{ id: 'child-1', firstName: 'Zafar', lastName: 'Yusupov' }],
};

function stubLoad(therapies = [], parents = []) {
  mockApi.get.mockImplementation((url) => {
    if (url === '/therapy') return Promise.resolve({ data: { data: { therapies } } });
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

describe('CL-014d TherapyManagement page', () => {
  it('shows loading spinner initially', async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    const { default: TherapyManagement } = await import('../../pages/TherapyManagement');
    const { container } = render(React.createElement(TherapyManagement));
    expect(container.querySelector('[data-testid="spinner"]')).toBeTruthy();
  });

  it('renders therapy cards after load', async () => {
    stubLoad([therapy1], [parent1]);
    const { default: TherapyManagement } = await import('../../pages/TherapyManagement');
    render(React.createElement(TherapyManagement));
    await waitFor(() => expect(screen.getByText('Music Therapy')).toBeTruthy());
    expect(screen.getByText('Relaxing music')).toBeTruthy();
  });

  it('shows empty state when no therapies match search', async () => {
    stubLoad([], []);
    const { default: TherapyManagement } = await import('../../pages/TherapyManagement');
    render(React.createElement(TherapyManagement));
    await waitFor(() => expect(screen.getByText('therapy.noTherapies')).toBeTruthy());
  });

  it('filters therapies by search query', async () => {
    const therapy2 = { ...therapy1, id: 'th-2', title: 'Video Therapy', therapyType: 'video', description: 'Educational video' };
    stubLoad([therapy1, therapy2], [parent1]);
    const { default: TherapyManagement } = await import('../../pages/TherapyManagement');
    render(React.createElement(TherapyManagement));
    await waitFor(() => screen.getByText('Music Therapy'));
    expect(screen.getByText('Video Therapy')).toBeTruthy();

    const searchInput = document.querySelector('input[type="text"]');
    fireEvent.change(searchInput, { target: { value: 'Video' } });
    expect(screen.queryByText('Music Therapy')).toBeFalsy();
    expect(screen.getByText('Video Therapy')).toBeTruthy();
  });

  it('opens create modal on add button click', async () => {
    stubLoad([], []);
    const { default: TherapyManagement } = await import('../../pages/TherapyManagement');
    render(React.createElement(TherapyManagement));
    await waitFor(() => screen.getByText('therapy.noTherapies'));
    fireEvent.click(screen.getByText('therapy.create'));
    // Modal cancel button only appears when modal is open
    expect(screen.getByText('therapy.cancel')).toBeTruthy();
  });

  it('submits create form via handleSave and reloads', async () => {
    stubLoad([], []);
    mockApi.post.mockResolvedValue({ data: { id: 'th-new' } });
    const { default: TherapyManagement } = await import('../../pages/TherapyManagement');
    render(React.createElement(TherapyManagement));
    await waitFor(() => screen.getByText('therapy.noTherapies'));
    fireEvent.click(screen.getByText('therapy.create'));

    // Fill title via placeholder (modal input, not the search bar)
    const titleInput = screen.getByPlaceholderText('therapy.titlePlaceholder');
    fireEvent.change(titleInput, { target: { value: 'New Music' } });

    stubLoad([{ ...therapy1, id: 'th-new', title: 'New Music' }], [parent1]);
    fireEvent.click(screen.getByText('therapy.save'));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/therapy', expect.any(Object)));
  });

  it('opens assign modal on Tayinlash button click', async () => {
    stubLoad([therapy1], [parent1]);
    const { default: TherapyManagement } = await import('../../pages/TherapyManagement');
    render(React.createElement(TherapyManagement));
    await waitFor(() => screen.getByText('Music Therapy'));
    fireEvent.click(screen.getByText('therapy.assign'));
    await waitFor(() => expect(screen.getByText('therapy.assignToChild')).toBeTruthy());
    expect(screen.getByText('Zafar Yusupov (Bobur Xasanov)')).toBeTruthy();
  });

  it('submits assign and calls POST /therapy/:id/start', async () => {
    stubLoad([therapy1], [parent1]);
    mockApi.post.mockResolvedValue({});
    const { default: TherapyManagement } = await import('../../pages/TherapyManagement');
    render(React.createElement(TherapyManagement));
    await waitFor(() => screen.getByText('therapy.assign'));
    fireEvent.click(screen.getByText('therapy.assign'));
    await waitFor(() => screen.getByText('therapy.assignToChild'));

    const childSelect = document.querySelector('select');
    fireEvent.change(childSelect, { target: { value: 'child-1' } });

    const assignBtns = screen.getAllByText('therapy.assign');
    fireEvent.click(assignBtns[assignBtns.length - 1]);
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/therapy/th-1/start', { childId: 'child-1' }));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });

  // The old pendingDeleteId double-click guard was replaced by the UX-01
  // ConfirmDialog pattern — assert the CURRENT contract: dialog gates delete.
  it('delete is gated by ConfirmDialog: cancel aborts, confirm calls DELETE', async () => {
    stubLoad([therapy1], [parent1]);
    mockApi.delete.mockResolvedValue({});
    const { default: TherapyManagement } = await import('../../pages/TherapyManagement');
    render(React.createElement(TherapyManagement));
    await waitFor(() => screen.getByText('Music Therapy'));

    const deleteBtns = document.querySelectorAll('button');
    const deleteBtn = Array.from(deleteBtns).find(b =>
      b.querySelector('svg') && b.className.includes('error')
    );
    // Click delete — confirm dialog appears, nothing deleted yet
    fireEvent.click(deleteBtn);
    await waitFor(() => screen.getByTestId('confirm-dialog'));
    expect(mockApi.delete).not.toHaveBeenCalled();

    // Cancel — dialog closes, still nothing deleted
    fireEvent.click(screen.getByTestId('confirm-cancel'));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeFalsy());
    expect(mockApi.delete).not.toHaveBeenCalled();

    // Re-open and confirm — DELETE fires and success toast shows
    stubLoad([], []);
    fireEvent.click(deleteBtn);
    await waitFor(() => screen.getByTestId('confirm-ok'));
    fireEvent.click(screen.getByTestId('confirm-ok'));
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith('/therapy/th-1'));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });
});
