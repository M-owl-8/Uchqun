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

import TeacherManagement from '../../pages/TeacherManagement';

const teacher1 = {
  id: 't1',
  firstName: 'Zulfiya',
  lastName: 'Rahimova',
  email: 'zulfiya@test.uz',
  phone: '+998901111111',
  status: 'active',
};

const teacher2 = {
  id: 't2',
  firstName: 'Bobur',
  lastName: 'Toshmatov',
  email: 'bobur@test.uz',
  phone: null,
  status: 'active',
};

function stubTeachers(teachers = []) {
  api.get.mockImplementation((url) => {
    if (url === '/reception/teachers') return Promise.resolve({ data: { data: teachers } });
    if (url.includes('/ratings')) return Promise.resolve({
      data: { data: { summary: { average: 4.5, count: 3 }, ratings: [] } },
    });
    return Promise.reject(new Error('Unexpected URL: ' + url));
  });
}

describe('TeacherManagement', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('shows loading spinner while fetching (no teacher names visible)', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    render(React.createElement(TeacherManagement));
    expect(screen.queryByText('Zulfiya Rahimova')).toBeNull();
  });

  it('renders teacher cards after data loads', async () => {
    stubTeachers([teacher1, teacher2]);
    render(React.createElement(TeacherManagement));
    await waitFor(() => expect(screen.getByText('Zulfiya Rahimova')).toBeTruthy());
    expect(screen.getByText('Bobur Toshmatov')).toBeTruthy();
    // email appears in card header + contact row — use getAllByText
    expect(screen.getAllByText('zulfiya@test.uz').length).toBeGreaterThanOrEqual(1);
  });

  it('filters teachers by search query', async () => {
    stubTeachers([teacher1, teacher2]);
    render(React.createElement(TeacherManagement));
    await waitFor(() => expect(screen.getByText('Bobur Toshmatov')).toBeTruthy());

    fireEvent.change(screen.getByPlaceholderText('teachersPage.search'), {
      target: { value: 'Zulfiya' },
    });

    await waitFor(() => expect(screen.queryByText('Bobur Toshmatov')).toBeNull());
    expect(screen.getByText('Zulfiya Rahimova')).toBeTruthy();
  });

  it('opens create modal when Add button clicked', async () => {
    stubTeachers([]);
    render(React.createElement(TeacherManagement));
    await waitFor(() => expect(screen.getByText('teachersPage.add')).toBeTruthy());

    fireEvent.click(screen.getByText('teachersPage.add').closest('button'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
  });

  it('submits create form via POST /reception/teachers', async () => {
    stubTeachers([]);
    api.post.mockResolvedValue({ data: {} });
    render(React.createElement(TeacherManagement));
    await waitFor(() => expect(screen.getByText('teachersPage.add')).toBeTruthy());

    fireEvent.click(screen.getByText('teachersPage.add').closest('button'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    const form = screen.getByRole('dialog').querySelector('form');
    fireEvent.submit(form);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/reception/teachers', expect.any(Object))
    );
  });

  it('opens edit modal prefilled with teacher data', async () => {
    stubTeachers([teacher1]);
    render(React.createElement(TeacherManagement));
    await waitFor(() => expect(screen.getByText('Zulfiya Rahimova')).toBeTruthy());

    const editButtons = screen.getAllByText('teachersPage.buttons.edit');
    fireEvent.click(editButtons[0].closest('button'));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    const emailInput = screen.getAllByRole('textbox').find((el) => el.value === 'zulfiya@test.uz');
    expect(emailInput).toBeTruthy();
  });

  it('submits edit form via PUT /reception/teachers/:id', async () => {
    stubTeachers([teacher1]);
    api.put.mockResolvedValue({ data: {} });
    render(React.createElement(TeacherManagement));
    await waitFor(() => expect(screen.getByText('Zulfiya Rahimova')).toBeTruthy());

    fireEvent.click(screen.getAllByText('teachersPage.buttons.edit')[0].closest('button'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    fireEvent.submit(screen.getByRole('dialog').querySelector('form'));

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith(
        `/reception/teachers/${teacher1.id}`,
        expect.any(Object)
      )
    );
  });

  it('opens confirm dialog before deleting a teacher', async () => {
    stubTeachers([teacher1]);
    render(React.createElement(TeacherManagement));
    await waitFor(() => expect(screen.getByText('Zulfiya Rahimova')).toBeTruthy());

    fireEvent.click(screen.getAllByText('teachersPage.buttons.delete')[0].closest('button'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(screen.getByText('teachersPage.confirmDelete')).toBeTruthy();
  });

  it('calls DELETE /reception/teachers/:id after confirm', async () => {
    stubTeachers([teacher1]);
    api.delete.mockResolvedValue({ data: {} });
    render(React.createElement(TeacherManagement));
    await waitFor(() => expect(screen.getByText('Zulfiya Rahimova')).toBeTruthy());

    fireEvent.click(screen.getAllByText('teachersPage.buttons.delete')[0].closest('button'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    fireEvent.click(screen.getByText('common.confirm'));
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith(`/reception/teachers/${teacher1.id}`)
    );
  });

  it('triggers ratings fetch when teacher card is clicked', async () => {
    // Ratings are loaded when the Card with onClick={handleViewRatings} is clicked.
    // There is no separate ratings button — the entire card is the click target.
    stubTeachers([teacher1]);
    render(React.createElement(TeacherManagement));
    await waitFor(() => expect(screen.getByText('Zulfiya Rahimova')).toBeTruthy());

    // Click the teacher name (inside the clickable Card)
    fireEvent.click(screen.getByText('Zulfiya Rahimova'));

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(`/reception/teachers/${teacher1.id}/ratings`)
    );
  });

  it('shows error toast on fetch failure', async () => {
    const { useToast } = await import('@shared/context/ToastContext');
    const { error: showError } = useToast();
    api.get.mockRejectedValue(new Error('Network error'));
    render(React.createElement(TeacherManagement));
    await waitFor(() => expect(showError).toHaveBeenCalled());
  });
});
