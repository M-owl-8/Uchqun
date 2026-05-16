import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock api before component imports
const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};
vi.mock('../services/api', () => ({ default: mockApi }));

// Mock Toast and Auth contexts
vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'g1', firstName: 'A', lastName: 'B' } }),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => options?.defaultValue || key,
  }),
}));

// Mock the tab subcomponents to keep this test focused on Platform.jsx wiring
vi.mock('../components/tabs/AdminsTab', () => ({
  default: ({ admins, loadingAdmins }) =>
    loadingAdmins ? <div>loading admins</div> : <div data-testid="admins-tab">admins:{admins.length}</div>,
}));
vi.mock('../components/tabs/SchoolsTab', () => ({
  default: ({ schools, loadingSchools }) =>
    loadingSchools ? <div>loading schools</div> : <div data-testid="schools-tab">schools:{schools.length}</div>,
}));
vi.mock('../components/tabs/MessagesTab', () => ({
  default: ({ messages }) => <div data-testid="messages-tab">messages:{messages.length}</div>,
}));
vi.mock('../components/tabs/GovernmentTab', () => ({
  default: ({ governments }) => <div data-testid="government-tab">govs:{governments.length}</div>,
}));
vi.mock('../components/tabs/RegistrationsTab', () => ({
  default: ({ registrationRequests }) => <div data-testid="registrations-tab">requests:{registrationRequests.length}</div>,
}));

const Platform = (await import('../pages/Platform.jsx')).default;

describe('Platform page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: every initial fetch returns empty data
    mockApi.get.mockImplementation(async (url) => {
      if (url === '/government/admins') return { data: { data: [{ id: 'a1' }, { id: 'a2' }] } };
      if (url === '/government/users') return { data: { data: [] } };
      if (url === '/government/schools-list') return { data: { data: [] } };
      if (url === '/government/messages') return { data: { data: [] } };
      if (url.startsWith('/government/admin-registrations')) return { data: { data: [] } };
      return { data: { data: [] } };
    });
  });

  it('hits /government/admins, /users, /schools-list, /messages on mount', async () => {
    render(<Platform />);
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith('/government/admins');
      expect(mockApi.get).toHaveBeenCalledWith('/government/users');
      expect(mockApi.get).toHaveBeenCalledWith('/government/schools-list');
      expect(mockApi.get).toHaveBeenCalledWith('/government/messages');
    });
  });

  it('shows admins tab by default with loaded data', async () => {
    render(<Platform />);
    await waitFor(() => {
      expect(screen.getByTestId('admins-tab')).toHaveTextContent('admins:2');
    });
  });

  it('does NOT call any legacy routes or /payments endpoint', async () => {
    render(<Platform />);
    await waitFor(() => expect(mockApi.get).toHaveBeenCalled());
    const calls = mockApi.get.mock.calls.map(c => c[0]);
    expect(calls.every(url => !url.includes('/super-admin/'))).toBe(true);
    expect(calls.every(url => !url.includes('payments'))).toBe(true);
  });

  it('switches to messages tab when message tab clicked', async () => {
    render(<Platform />);
    await waitFor(() => screen.getByTestId('admins-tab'));
    const messagesBtn = screen.getByText(/Messages/i);
    fireEvent.click(messagesBtn);
    await waitFor(() => expect(screen.getByTestId('messages-tab')).toBeInTheDocument());
  });

  it('lazy-loads registrations only on tab switch', async () => {
    render(<Platform />);
    await waitFor(() => screen.getByTestId('admins-tab'));
    expect(mockApi.get.mock.calls.find(c => c[0].includes('/admin-registrations'))).toBeUndefined();
    fireEvent.click(screen.getByText(/Registrations/i));
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/government/admin-registrations'));
    });
  });
});
