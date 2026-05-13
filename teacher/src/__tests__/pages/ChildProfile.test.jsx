import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// --- stable mock handles ---
const mockSelectChild = vi.fn();
const mockLogout = vi.fn();
const mockNavigate = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();

let mockChildContext = {
  children: [],
  selectedChildId: null,
  selectChild: mockSelectChild,
  loading: false,
};

vi.mock('react-i18next', () => {
  const t = (k, opts) => opts?.defaultValue ?? k;
  return { useTranslation: () => ({ t, i18n: { language: 'en' } }) };
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children }) => React.createElement('a', { href: to }, children),
}));

vi.mock('../../parent/context/ChildContext', () => ({
  useChild: () => mockChildContext,
}));

vi.mock('../../parent/context/AuthContext', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

vi.mock('../../shared/context/SocketContext', () => ({
  useSocket: () => ({ on: mockOn, off: mockOff, connected: false }),
}));

vi.mock('../../shared/context/ToastContext', () => ({
  useToast: () => ({ success: mockToastSuccess, error: mockToastError }),
}));

vi.mock('../../parent/components/Card', () => ({
  default: ({ children, className, onClick }) =>
    React.createElement('div', { 'data-testid': 'card', className, onClick }, children),
}));

vi.mock('../../parent/components/LoadingSpinner', () => ({
  default: ({ size }) =>
    React.createElement('div', { 'data-testid': 'loading-spinner', 'data-size': size }),
}));

vi.mock('../../parent/components/LanguageSwitcher', () => ({
  default: () => React.createElement('div', { 'data-testid': 'language-switcher' }),
}));

vi.mock('../../parent/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

const child1 = {
  id: 'c1',
  firstName: 'Bobur',
  lastName: 'Karimov',
  dateOfBirth: '2018-05-01T00:00:00.000Z',
  gender: 'Male',
  disabilityType: 'Autism',
  specialNeeds: 'Needs extra support',
  photo: null,
  teacher: 'Sara Tosheva',
  childSchool: { name: 'Uchqun School' },
};

const child2 = {
  id: 'c2',
  firstName: 'Dilnoza',
  lastName: 'Yusupova',
  dateOfBirth: '2019-01-01T00:00:00.000Z',
  gender: 'Female',
  disabilityType: 'Dyslexia',
  specialNeeds: '',
};

const monitoringRecord = {
  id: 'm1',
  date: '2026-05-01T00:00:00.000Z',
  emotionalState: { stable: true, positiveEmotions: true, noAnxiety: false },
  notes: 'Good progress',
  teacher: { firstName: 'Sara', lastName: 'Tosheva' },
};

function stubLoad(api, opts = {}) {
  const { childData = child1, monitoring = [], messages = [] } = opts;

  api.get.mockImplementation((url) => {
    if (url.startsWith('/child/')) return Promise.resolve({ data: childData });
    if (url === '/parent/profile') return Promise.resolve({
      data: { data: { user: { assignedTeacher: { firstName: 'Sara', lastName: 'Tosheva' }, group: { name: 'Guruh A' } } } },
    });
    if (url.startsWith('/parent/emotional-monitoring/')) return Promise.resolve({ data: { data: monitoring } });
    if (url.startsWith('/activities')) return Promise.resolve({ data: [] });
    if (url.startsWith('/meals')) return Promise.resolve({ data: [] });
    if (url.startsWith('/media')) return Promise.resolve({ data: [] });
    if (url === '/parent/messages') return Promise.resolve({ data: { data: messages } });
    return Promise.reject(new Error('Unexpected URL: ' + url));
  });
}

describe('CL-013c ChildProfile integration', () => {
  beforeEach(() => {
    vi.resetModules();
    mockChildContext = {
      children: [child1],
      selectedChildId: 'c1',
      selectChild: mockSelectChild,
      loading: false,
    };
  });

  it('shows loading spinner while context is loading', async () => {
    mockChildContext = { children: [], selectedChildId: null, selectChild: mockSelectChild, loading: true };
    const api = (await import('../../parent/services/api')).default;
    api.get.mockResolvedValue({ data: {} });
    const { default: ChildProfile } = await import('../../parent/pages/ChildProfile');
    render(React.createElement(ChildProfile));
    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
  });

  it('renders child name after data loads', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubLoad(api);
    const { default: ChildProfile } = await import('../../parent/pages/ChildProfile');
    render(React.createElement(ChildProfile));
    await waitFor(() => expect(screen.getAllByText('Bobur Karimov').length).toBeGreaterThan(0));
  });

  it('renders child disability type in profile', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubLoad(api);
    const { default: ChildProfile } = await import('../../parent/pages/ChildProfile');
    render(React.createElement(ChildProfile));
    await waitFor(() => expect(screen.getByText('Autism')).toBeTruthy());
  });

  it('opens avatar upload modal when avatar overlay button is clicked', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubLoad(api);
    const { default: ChildProfile } = await import('../../parent/pages/ChildProfile');
    render(React.createElement(ChildProfile));
    await waitFor(() => expect(screen.getAllByText('Bobur Karimov').length).toBeGreaterThan(0));

    // The avatar area has a visually-hidden button (opacity-0) over the photo
    const avatarBtn = await waitFor(() => {
      const btn = screen.getAllByRole('button').find((b) => b.className && b.className.includes('opacity-0'));
      expect(btn).toBeTruthy();
      return btn;
    });
    fireEvent.click(avatarBtn);

    await waitFor(() => {
      expect(screen.getByText('Rasm yuklash')).toBeTruthy();
    });
  });

  it('opens logout modal when exit button is clicked', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubLoad(api);
    const { default: ChildProfile } = await import('../../parent/pages/ChildProfile');
    render(React.createElement(ChildProfile));
    await waitFor(() => expect(screen.getAllByText('Bobur Karimov').length).toBeGreaterThan(0));

    // Find button by text content (icon + text in same button)
    const logoutBtn = await waitFor(() => {
      const btn = screen.getAllByRole('button').find(
        (b) => b.textContent.includes('Exit') || b.textContent.includes('nav.exit')
      );
      expect(btn).toBeTruthy();
      return btn;
    });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Chiqishni xohlaysizmi?') ||
        screen.queryByText('profile.confirmLogout')
      ).toBeTruthy();
    });
  });

  it('opens compose message modal when contact government button is clicked', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubLoad(api);
    const { default: ChildProfile } = await import('../../parent/pages/ChildProfile');
    render(React.createElement(ChildProfile));
    await waitFor(() => expect(screen.getAllByText('Bobur Karimov').length).toBeGreaterThan(0));

    const contactBtn = await waitFor(() => {
      const btn = screen.getAllByRole('button').find(
        (b) => b.textContent.includes('Davlatga xabar yuborish') || b.textContent.includes('profile.contactGovernment')
      );
      expect(btn).toBeTruthy();
      return btn;
    });
    fireEvent.click(contactBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Xabar mavzusi...') ||
        screen.queryByPlaceholderText('profile.subjectPlaceholder')).toBeTruthy();
    });
  });

  it('calls POST /parent/message-to-government on send message', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubLoad(api);
    api.post.mockResolvedValue({ data: {} });
    const { default: ChildProfile } = await import('../../parent/pages/ChildProfile');
    render(React.createElement(ChildProfile));
    await waitFor(() => expect(screen.getAllByText('Bobur Karimov').length).toBeGreaterThan(0));

    const contactBtn = await waitFor(() => {
      const btn = screen.getAllByRole('button').find(
        (b) => b.textContent.includes('Davlatga xabar yuborish') || b.textContent.includes('profile.contactGovernment')
      );
      expect(btn).toBeTruthy();
      return btn;
    });
    fireEvent.click(contactBtn);
    await waitFor(() => document.querySelector('input[type="text"]'));

    const subjectInput = document.querySelector('input[type="text"]');
    const textarea = document.querySelector('textarea');
    fireEvent.change(subjectInput, { target: { value: 'Test subject' } });
    fireEvent.change(textarea, { target: { value: 'Test message body' } });

    const sendBtn = await waitFor(() => {
      const btn = screen.getAllByRole('button').find(
        (b) => b.textContent.includes('Yuborish') || b.textContent.includes('profile.send')
      );
      expect(btn).toBeTruthy();
      return btn;
    });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/parent/message-to-government', {
        subject: 'Test subject',
        message: 'Test message body',
      });
    });
  });

  it('shows my messages button and opens messages modal when clicked', async () => {
    const api = (await import('../../parent/services/api')).default;
    const msg = { id: 1, subject: 'Test xabar', message: 'Body', reply: null, createdAt: new Date().toISOString() };
    stubLoad(api, { messages: [msg] });
    const { default: ChildProfile } = await import('../../parent/pages/ChildProfile');
    render(React.createElement(ChildProfile));
    await waitFor(() => expect(screen.getAllByText('Bobur Karimov').length).toBeGreaterThan(0));

    const messagesBtn = await waitFor(() => {
      const btn = screen.getAllByRole('button').find(
        (b) => b.textContent.includes('Mening xabarlarim') || b.textContent.includes('profile.myMessages')
      );
      expect(btn).toBeTruthy();
      return btn;
    });
    fireEvent.click(messagesBtn);

    await waitFor(() => expect(screen.getByText('Test xabar')).toBeTruthy());
  });

  it('renders emotional monitoring section when records exist', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubLoad(api, { monitoring: [monitoringRecord] });
    const { default: ChildProfile } = await import('../../parent/pages/ChildProfile');
    render(React.createElement(ChildProfile));
    await waitFor(() => expect(screen.getByText('Good progress')).toBeTruthy());
  });

  it('shows inline child selector when multiple children are loaded', async () => {
    mockChildContext = {
      children: [child1, child2],
      selectedChildId: 'c1',
      selectChild: mockSelectChild,
      loading: false,
    };
    const api = (await import('../../parent/services/api')).default;
    stubLoad(api);
    const { default: ChildProfile } = await import('../../parent/pages/ChildProfile');
    render(React.createElement(ChildProfile));
    await waitFor(() => expect(screen.getAllByText('Bobur Karimov').length).toBeGreaterThan(0));

    // The inline banner select dropdown should list both children
    const select = await waitFor(() => {
      const el = document.querySelector('select');
      expect(el).toBeTruthy();
      return el;
    });
    const options = Array.from(select.options);
    expect(options.some((o) => o.textContent.includes('Dilnoza'))).toBeTruthy();
  });
});
