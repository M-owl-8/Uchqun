import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('../../../shared/utils/cache', () => ({ get: vi.fn(() => null), set: vi.fn() }));
vi.mock('react-i18next', () => {
  const t = (k, o) => o?.defaultValue ?? k;
  return { useTranslation: () => ({ t }) };
});
vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

import api from '../../services/api';
import SchoolProfile from '../../pages/SchoolProfile';

const SCHOOL = {
  id: 'school-1',
  name: 'Test Maktab',
  type: 'general',
  isActive: true,
  phone: '+998901234567',
  email: 'school@test.com',
  address: '123 Street',
  description: 'Great school',
  director: 'John Doe',
  regionId: 'r-1',
  categoryId: 'c-1',
  region: { id: 'r-1', name: 'Toshkent', code: 'TAS' },
  category: { id: 'c-1', name: 'Special', code: 'SP' },
};

describe('SchoolProfile (FE-6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders school name and contact info from GET response', async () => {
    api.get.mockResolvedValue({ data: { data: SCHOOL } });
    render(<SchoolProfile />);
    await waitFor(() => screen.getByText('Test Maktab'));
    expect(screen.getByDisplayValue('+998901234567')).toBeTruthy();
    expect(screen.getByDisplayValue('school@test.com')).toBeTruthy();
  });

  it('shows Active badge when isActive=true', async () => {
    api.get.mockResolvedValue({ data: { data: { ...SCHOOL, isActive: true } } });
    render(<SchoolProfile />);
    await waitFor(() => screen.getByText('Active'));
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('shows Archived badge when isActive=false', async () => {
    api.get.mockResolvedValue({ data: { data: { ...SCHOOL, isActive: false } } });
    render(<SchoolProfile />);
    await waitFor(() => screen.getByText('Archived'));
    expect(screen.getByText('Archived')).toBeTruthy();
  });

  it('displays region and category names when present', async () => {
    api.get.mockResolvedValue({ data: { data: SCHOOL } });
    render(<SchoolProfile />);
    await waitFor(() => screen.getByText('Toshkent'));
    expect(screen.getByText('Special')).toBeTruthy();
  });

  it('PATCH called with only the 5 whitelisted fields, not name or type', async () => {
    api.get.mockResolvedValue({ data: { data: SCHOOL } });
    api.patch.mockResolvedValue({ data: { data: SCHOOL } });
    render(<SchoolProfile />);
    await waitFor(() => screen.getByText('Test Maktab'));

    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(api.patch).toHaveBeenCalled());

    const [, body] = api.patch.mock.calls[0];
    expect(body).toHaveProperty('phone');
    expect(body).toHaveProperty('email');
    expect(body).toHaveProperty('address');
    expect(body).toHaveProperty('description');
    expect(body).toHaveProperty('director');
    expect(body).not.toHaveProperty('name');
    expect(body).not.toHaveProperty('type');
    expect(body).not.toHaveProperty('regionId');
  });

  it('save button disabled while saving and re-enables after', async () => {
    let resolvePatch;
    api.get.mockResolvedValue({ data: { data: SCHOOL } });
    api.patch.mockReturnValue(new Promise((res) => { resolvePatch = () => res({ data: { data: SCHOOL } }); }));

    render(<SchoolProfile />);
    await waitFor(() => screen.getByText('Save Changes'));

    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => screen.getByText('Saving…'));
    expect(screen.getByText('Saving…').closest('button').disabled).toBe(true);

    resolvePatch();
    await waitFor(() => screen.getByText('Save Changes'));
    expect(screen.getByText('Save Changes').closest('button').disabled).toBe(false);
  });
});
