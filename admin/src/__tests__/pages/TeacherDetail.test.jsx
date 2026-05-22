import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ id: 'teacher-1' }), useNavigate: () => vi.fn() };
});
vi.mock('../../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../../../shared/utils/cache', () => ({ get: vi.fn(() => null), set: vi.fn() }));
vi.mock('react-i18next', () => {
  const t = (k, o) => o?.defaultValue ?? k;
  return { useTranslation: () => ({ t }) };
});
vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({ error: vi.fn() }),
}));

import { MemoryRouter } from 'react-router-dom';
import api from '../../services/api';
import TeacherDetail from '../../pages/TeacherDetail';

const TEACHER = {
  id: 'teacher-1',
  firstName: 'Nodira',
  lastName: 'Karimova',
  email: 'nodira@school.uz',
  phone: '+998901234567',
  schoolId: 'school-1',
  groups: [
    { id: 'g-1', name: 'Group A', ageRange: '5-7', capacity: 15 },
    { id: 'g-2', name: 'Group B', ageRange: '7-9', capacity: 12 },
  ],
};

describe('TeacherDetail (FE-8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders teacher name and email from API response', async () => {
    api.get.mockResolvedValue({ data: { data: TEACHER } });
    render(<MemoryRouter><TeacherDetail /></MemoryRouter>);
    await waitFor(() => screen.getByText('Nodira Karimova'));
    expect(screen.getByText('nodira@school.uz')).toBeTruthy();
  });

  it('lists groups with name and ageRange', async () => {
    api.get.mockResolvedValue({ data: { data: TEACHER } });
    render(<MemoryRouter><TeacherDetail /></MemoryRouter>);
    await waitFor(() => screen.getByText('Group A'));
    expect(screen.getByText('5-7')).toBeTruthy();
    expect(screen.getByText('Group B')).toBeTruthy();
    expect(screen.getByText('7-9')).toBeTruthy();
  });

  it('has no suspend or activate buttons', async () => {
    api.get.mockResolvedValue({ data: { data: TEACHER } });
    render(<MemoryRouter><TeacherDetail /></MemoryRouter>);
    await waitFor(() => screen.getByText('Nodira Karimova'));
    expect(screen.queryByRole('button', { name: /suspend|activate/i })).toBeNull();
  });

  it('shows Back to teachers link/button', async () => {
    api.get.mockResolvedValue({ data: { data: TEACHER } });
    render(<MemoryRouter><TeacherDetail /></MemoryRouter>);
    await waitFor(() => screen.getByText('Back to teachers'));
    expect(screen.getByText('Back to teachers')).toBeTruthy();
  });
});
