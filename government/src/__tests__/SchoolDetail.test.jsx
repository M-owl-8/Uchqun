import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockApi = { get: vi.fn(), put: vi.fn() };
vi.mock('../services/api', () => ({ default: mockApi }));

const mockSuccess = vi.fn();
const mockError = vi.fn();
vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({ success: mockSuccess, error: mockError }),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'school-uuid-1' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key, opts) => opts?.defaultValue ?? _key,
  }),
}));

vi.mock('@shared/components/LoadingSpinner', () => ({
  default: () => <div data-testid="spinner" />,
}));

vi.mock('@shared/hooks/useFetch', () => ({
  useFetch: vi.fn(),
}));

vi.mock('@shared/components/ConfirmDialog', () => ({
  default: ({ dialog, onCancel }) => {
    if (!dialog) return null;
    return (
      <div data-testid="confirm-dialog">
        <span>{dialog.message}</span>
        <button data-testid="confirm-ok" onClick={dialog.onConfirm}>Confirm</button>
        <button data-testid="confirm-cancel" onClick={onCancel}>Cancel</button>
      </div>
    );
  },
}));

import { useFetch } from '@shared/hooks/useFetch';

const activeSchool = {
  id: 'school-uuid-1', name: 'Test School', isActive: true,
  region: 'Toshkent', studentsCount: 30, teachersCount: 5, ratingsCount: 2, averageRating: 4.2,
};
const archivedSchool = { ...activeSchool, isActive: false };

const SchoolDetail = (await import('../pages/SchoolDetail.jsx')).default;

describe('SchoolDetail — S1-F01 archive/reactivate UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.put.mockResolvedValue({ data: { success: true } });
  });

  it('shows Archive button for active school', async () => {
    useFetch.mockReturnValue({ data: activeSchool, loading: false, error: null });
    render(<SchoolDetail />);
    expect(screen.getByText('Arxivlash')).toBeInTheDocument();
    expect(screen.queryByText('Qayta faollashtirish')).not.toBeInTheDocument();
  });

  it('shows Reactivate button and inactive badge for archived school', async () => {
    useFetch.mockReturnValue({ data: archivedSchool, loading: false, error: null });
    render(<SchoolDetail />);
    expect(screen.getByText('Qayta faollashtirish')).toBeInTheDocument();
    expect(screen.getByText('Nofaol')).toBeInTheDocument();
    expect(screen.queryByText('Arxivlash')).not.toBeInTheDocument();
  });

  it('clicking Archive opens ConfirmDialog with archive message', () => {
    useFetch.mockReturnValue({ data: activeSchool, loading: false, error: null });
    render(<SchoolDetail />);
    fireEvent.click(screen.getByText('Arxivlash'));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Ushbu maktabni arxivlashni tasdiqlaysizmi?')).toBeInTheDocument();
  });

  it('confirming archive calls PUT /government/schools/:id/archive and shows success toast', async () => {
    useFetch.mockReturnValue({ data: activeSchool, loading: false, error: null });
    render(<SchoolDetail />);
    fireEvent.click(screen.getByText('Arxivlash'));
    fireEvent.click(screen.getByTestId('confirm-ok'));

    await waitFor(() => {
      expect(mockApi.put).toHaveBeenCalledWith('/government/schools/school-uuid-1/archive');
      expect(mockSuccess).toHaveBeenCalledWith('Maktab arxivlandi');
    });
  });

  it('409 SCHOOL_ALREADY_ARCHIVED shows specific error toast', async () => {
    mockApi.put.mockRejectedValue({
      response: { data: { error: { code: 'SCHOOL_ALREADY_ARCHIVED' } } },
    });
    useFetch.mockReturnValue({ data: activeSchool, loading: false, error: null });
    render(<SchoolDetail />);
    fireEvent.click(screen.getByText('Arxivlash'));
    fireEvent.click(screen.getByTestId('confirm-ok'));

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith('Maktab allaqachon arxivlangan');
    });
  });

  it('reactivate calls PUT /government/schools/:id/reactivate and shows success toast', async () => {
    useFetch.mockReturnValue({ data: archivedSchool, loading: false, error: null });
    render(<SchoolDetail />);
    fireEvent.click(screen.getByText('Qayta faollashtirish'));
    fireEvent.click(screen.getByTestId('confirm-ok'));

    await waitFor(() => {
      expect(mockApi.put).toHaveBeenCalledWith('/government/schools/school-uuid-1/reactivate');
      expect(mockSuccess).toHaveBeenCalledWith('Maktab qayta faollashtirildi');
    });
  });

  it('cancel closes ConfirmDialog without calling API', () => {
    useFetch.mockReturnValue({ data: activeSchool, loading: false, error: null });
    render(<SchoolDetail />);
    fireEvent.click(screen.getByText('Arxivlash'));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-cancel'));
    expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    expect(mockApi.put).not.toHaveBeenCalled();
  });
});
