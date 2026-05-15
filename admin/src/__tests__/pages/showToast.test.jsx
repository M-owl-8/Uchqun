// refs #05-001 — useToast does not export showToast; three pages call undefined function
// Symptom: error feedback silently dropped when teacher/group/parent API calls fail.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

// ---- shared mocks ----
const mockToastError = vi.fn();
vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({
    error: mockToastError,
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}));

// ---- TeacherManagement ----
describe('#05-001 TeacherManagement', () => {
  beforeEach(() => {
    mockToastError.mockReset();
    vi.resetModules();
  });

  it('shows error toast when teacher fetch fails', async () => {
    const api = (await import('../../services/api')).default;
    api.get.mockRejectedValue(new Error('network error'));
    const { default: TeacherManagement } = await import('../../pages/TeacherManagement');
    render(React.createElement(TeacherManagement));
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });
});

// ---- GroupManagement ----
describe('#05-001 GroupManagement', () => {
  beforeEach(() => {
    mockToastError.mockReset();
    vi.resetModules();
  });

  it('shows error toast when group fetch fails', async () => {
    const api = (await import('../../services/api')).default;
    api.get.mockRejectedValue(new Error('network error'));
    const { default: GroupManagement } = await import('../../pages/GroupManagement');
    render(React.createElement(GroupManagement));
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });
});

// ---- ParentManagement ----
describe('#05-001 ParentManagement', () => {
  beforeEach(() => {
    mockToastError.mockReset();
    vi.resetModules();
  });

  it('shows error toast when parent fetch fails', async () => {
    const api = (await import('../../services/api')).default;
    api.get.mockRejectedValue(new Error('network error'));
    const { default: ParentManagement } = await import('../../pages/ParentManagement');
    render(React.createElement(ParentManagement));
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });
});
