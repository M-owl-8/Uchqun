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
    isTeacher: true,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k) => k,
    i18n: { language: 'en' },
  }),
}));

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

const mockApi = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
vi.mock('../../shared/services/api', () => ({ default: mockApi }));

const photo1 = {
  id: 'media-1',
  type: 'photo',
  title: 'Class Photo',
  description: 'A photo from class',
  url: 'https://example.com/photo.jpg',
  date: '2026-01-15T00:00:00.000Z',
  childId: 'child-1',
};

const video1 = {
  id: 'media-2',
  type: 'video',
  title: 'Class Video',
  description: 'A video from class',
  url: 'https://example.com/video.mp4',
  date: '2026-01-16T00:00:00.000Z',
  childId: 'child-1',
};

const parent1 = {
  id: 'par-1',
  firstName: 'Bobur',
  lastName: 'Xasanov',
  children: [{ id: 'child-1', firstName: 'Zafar', lastName: 'Yusupov' }],
};

function stubLoad(mediaItems = [], parents = []) {
  mockApi.get.mockImplementation((url) => {
    if (url === '/media') return Promise.resolve({ data: mediaItems });
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

describe('CL-013b Media page', () => {
  it('shows loading spinner initially', async () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    const { default: Media } = await import('../../pages/Media');
    const { container } = render(React.createElement(Media));
    expect(container.querySelector('[data-testid="spinner"]')).toBeTruthy();
  });

  it('renders media cards after load', async () => {
    stubLoad([photo1, video1], [parent1]);
    const { default: Media } = await import('../../pages/Media');
    render(React.createElement(Media));
    await waitFor(() => expect(screen.getByText('Class Photo')).toBeTruthy());
    expect(screen.getByText('Class Video')).toBeTruthy();
  });

  it('shows empty state when no media', async () => {
    stubLoad([], []);
    const { default: Media } = await import('../../pages/Media');
    render(React.createElement(Media));
    await waitFor(() => expect(screen.getByText('mediaPage.empty')).toBeTruthy());
  });

  it('filters media by type', async () => {
    stubLoad([photo1, video1], [parent1]);
    const { default: Media } = await import('../../pages/Media');
    render(React.createElement(Media));
    await waitFor(() => screen.getByText('Class Photo'));

    // Click video filter button
    fireEvent.click(screen.getByText('mediaPage.filters.video'));
    await waitFor(() => expect(screen.queryByText('Class Photo')).toBeFalsy());
    expect(screen.getByText('Class Video')).toBeTruthy();
  });

  it('opens create modal on add button click', async () => {
    stubLoad([], [parent1]);
    const { default: Media } = await import('../../pages/Media');
    render(React.createElement(Media));
    await waitFor(() => screen.getByText('mediaPage.empty'));
    fireEvent.click(screen.getByText('mediaPage.add'));
    expect(screen.getByText('mediaPage.modal.addTitle')).toBeTruthy();
  });

  it('opens edit modal when edit button clicked', async () => {
    stubLoad([photo1], [parent1]);
    const { default: Media } = await import('../../pages/Media');
    render(React.createElement(Media));
    await waitFor(() => screen.getByText('Class Photo'));

    const editBtn = document.querySelector('button[title="Edit"]');
    fireEvent.click(editBtn);
    await waitFor(() => expect(screen.getByText('mediaPage.modal.editTitle')).toBeTruthy());
    expect(document.querySelector('input[value="Class Photo"]')).toBeTruthy();
  });

  it('shows confirm dialog then deletes on confirm', async () => {
    stubLoad([photo1], [parent1]);
    mockApi.delete.mockResolvedValue({});
    const { default: Media } = await import('../../pages/Media');
    render(React.createElement(Media));
    await waitFor(() => screen.getByText('Class Photo'));

    const deleteBtn = document.querySelector('button[title="Delete"]');
    fireEvent.click(deleteBtn);
    expect(screen.getByTestId('confirm-dialog')).toBeTruthy();

    stubLoad([], []);
    fireEvent.click(screen.getByTestId('confirm-ok'));
    await waitFor(() => expect(mockApi.delete).toHaveBeenCalledWith('/media/media-1'));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });

  it('submits edit form via PUT /media/:id', async () => {
    stubLoad([photo1], [parent1]);
    mockApi.put.mockResolvedValue({ data: {} });
    const { default: Media } = await import('../../pages/Media');
    render(React.createElement(Media));
    await waitFor(() => screen.getByText('Class Photo'));

    const editBtn = document.querySelector('button[title="Edit"]');
    fireEvent.click(editBtn);
    await waitFor(() => screen.getByText('mediaPage.modal.editTitle'));

    const titleInput = document.querySelector('input[value="Class Photo"]');
    fireEvent.change(titleInput, { target: { value: 'Updated Photo' } });

    stubLoad([{ ...photo1, title: 'Updated Photo' }], [parent1]);
    const form = document.querySelector('form');
    fireEvent.submit(form);

    await waitFor(() => expect(mockApi.put).toHaveBeenCalledWith('/media/media-1', expect.any(Object)));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  });

  it('opens view modal when card is clicked', async () => {
    stubLoad([photo1], [parent1]);
    const { default: Media } = await import('../../pages/Media');
    render(React.createElement(Media));
    await waitFor(() => screen.getByText('Class Photo'));

    // Click on the card (not the edit/delete buttons)
    const cards = document.querySelectorAll('[class*="cursor-pointer"]');
    fireEvent.click(cards[0]);

    await waitFor(() => {
      const titles = screen.getAllByText('Class Photo');
      expect(titles.length).toBeGreaterThan(1);
    });
    expect(screen.getByText('A photo from class')).toBeTruthy();
  });
});
