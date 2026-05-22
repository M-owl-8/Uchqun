import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('react-i18next', () => {
  const t = (k, opts) => opts?.defaultValue ?? k;
  return { useTranslation: () => ({ t }) };
});

vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
  }),
}));

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('../../../shared/utils/cache', () => ({
  get: vi.fn(() => null),
  set: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock('@shared/components/LoadingSpinner', () => ({
  default: ({ size }) => <div data-testid={`spinner-${size ?? 'default'}`} />,
}));

import api from '../../services/api';
import BulkImport from '../../pages/BulkImport';

const JOB_RESULT_VALID = {
  importJobId: 'job-1',
  totalRows: 10,
  validRows: 8,
  invalidRows: 2,
  errors: [
    { row: 3, code: 'IMPORT_ROW_FIRST_NAME_REQUIRED', field: 'firstName' },
    { row: 7, code: 'IMPORT_ROW_PARENT_NOT_FOUND', field: 'parentEmail' },
  ],
};

const JOB_RESULT_ALL_INVALID = {
  importJobId: 'job-2',
  totalRows: 5,
  validRows: 0,
  invalidRows: 5,
  errors: [{ row: 1, code: 'IMPORT_ROW_LAST_NAME_REQUIRED', field: 'lastName' }],
};

function makeFile(name = 'children.csv') {
  return new File(['firstName,lastName\nAziz,Karimov'], name, { type: 'text/csv' });
}

describe('BulkImport wizard (FE-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders file picker in step 1', () => {
    render(<BulkImport />);
    expect(screen.getByTestId('file-input')).toBeTruthy();
    expect(screen.getByText('Upload CSV')).toBeTruthy();
  });

  it('Validate button disabled when no file selected', () => {
    render(<BulkImport />);
    const btn = screen.getByTestId('validate-btn');
    expect(btn.disabled).toBe(true);
  });

  it('shows validation results (valid/invalid counts) in step 2', async () => {
    api.post.mockResolvedValueOnce({ data: { data: JOB_RESULT_VALID } });

    render(<BulkImport />);

    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [makeFile()] } });

    fireEvent.click(screen.getByTestId('validate-btn'));

    await waitFor(() => screen.getByText('Validation Results'));
    expect(screen.getByText('Valid rows: 8')).toBeTruthy();
    expect(screen.getByText('Invalid rows: 2')).toBeTruthy();
  });

  it('Continue button disabled when validRows === 0', async () => {
    api.post.mockResolvedValueOnce({ data: { data: JOB_RESULT_ALL_INVALID } });

    render(<BulkImport />);

    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [makeFile()] } });
    fireEvent.click(screen.getByTestId('validate-btn'));

    await waitFor(() => screen.getByText('Validation Results'));
    const continueBtn = screen.getByTestId('continue-btn');
    expect(continueBtn.disabled).toBe(true);
  });

  it('Start button triggers POST start', async () => {
    api.post
      .mockResolvedValueOnce({ data: { data: JOB_RESULT_VALID } })
      .mockResolvedValueOnce({ data: { success: true } });
    api.get.mockResolvedValue({ data: { data: { status: 'importing' } } });

    render(<BulkImport />);

    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [makeFile()] } });
    fireEvent.click(screen.getByTestId('validate-btn'));

    await waitFor(() => screen.getByTestId('continue-btn'));
    fireEvent.click(screen.getByTestId('continue-btn'));

    await waitFor(() => screen.getByTestId('start-btn'));
    fireEvent.click(screen.getByTestId('start-btn'));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/admin/import/job-1/start'));
  });

  it('shows polling spinner in step 4', async () => {
    api.post
      .mockResolvedValueOnce({ data: { data: JOB_RESULT_VALID } })
      .mockResolvedValueOnce({ data: { success: true } });
    api.get.mockResolvedValue({ data: { data: { status: 'importing' } } });

    render(<BulkImport />);

    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [makeFile()] } });
    fireEvent.click(screen.getByTestId('validate-btn'));
    await waitFor(() => screen.getByTestId('continue-btn'));
    fireEvent.click(screen.getByTestId('continue-btn'));
    await waitFor(() => screen.getByTestId('start-btn'));
    fireEvent.click(screen.getByTestId('start-btn'));

    await waitFor(() => screen.getByTestId('polling-status'));
    expect(screen.getByText('Import in progress…')).toBeTruthy();
  });

  it('shows success result in step 5', async () => {
    let intervalCallback = null;
    const originalSetInterval = global.setInterval;
    vi.spyOn(global, 'setInterval').mockImplementation((cb) => {
      intervalCallback = cb;
      return 999;
    });
    vi.spyOn(global, 'clearInterval').mockImplementation(() => {});

    api.post
      .mockResolvedValueOnce({ data: { data: JOB_RESULT_VALID } })
      .mockResolvedValueOnce({ data: { success: true } });
    api.get.mockResolvedValue({ data: { data: { status: 'completed', validRows: 8 } } });

    render(<BulkImport />);

    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [makeFile()] } });
    fireEvent.click(screen.getByTestId('validate-btn'));
    await waitFor(() => screen.getByTestId('continue-btn'));
    fireEvent.click(screen.getByTestId('continue-btn'));
    await waitFor(() => screen.getByTestId('start-btn'));
    fireEvent.click(screen.getByTestId('start-btn'));

    await waitFor(() => screen.getByTestId('polling-status'));

    // Trigger the interval callback (simulates 3s poll)
    await act(async () => {
      if (intervalCallback) await intervalCallback();
    });

    await waitFor(() => screen.getByTestId('result-success'));
    expect(screen.getByTestId('new-import-btn')).toBeTruthy();

    vi.restoreAllMocks();
  });
});
