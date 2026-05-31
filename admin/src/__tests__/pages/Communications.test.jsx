import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('react-i18next', () => {
  const t = (k, o) => o?.defaultValue ?? k;
  return { useTranslation: () => ({ t }) };
});
vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({ error: vi.fn() }),
}));

import api from '../../services/api';
import Communications from '../../pages/Communications';

const PARENTS = [
  { id: 'p-1', firstName: 'Barno', lastName: 'Umarova', email: 'barno@test.com', status: 'active' },
];

const CONVERSATIONS = [
  {
    conversationId: 'parent:p-1',
    lastMessage: { content: 'Hello', senderRole: 'parent', createdAt: new Date().toISOString() },
    unreadCount: 2,
    updatedAt: new Date().toISOString(),
  },
];

const MESSAGES = [
  {
    id: 'm-1',
    conversationId: 'parent:p-1',
    senderId: 'p-1',
    senderRole: 'parent',
    content: 'Hello teacher!',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'm-2',
    conversationId: 'parent:p-1',
    senderId: 't-1',
    senderRole: 'teacher',
    content: 'Hello parent!',
    createdAt: new Date().toISOString(),
  },
];

describe('Communications (FE-7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('conversation list renders from API with enriched parent name', async () => {
    api.get
      .mockResolvedValueOnce({ data: CONVERSATIONS })
      .mockResolvedValueOnce({ data: { data: PARENTS } });

    render(<MemoryRouter><Communications /></MemoryRouter>);
    await waitFor(() => screen.getByText('Barno Umarova'));
    expect(screen.getByText('Barno Umarova')).toBeTruthy();
  });

  it('clicking a conversation loads message thread', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/messages')) return Promise.resolve({ data: MESSAGES });
      if (url.includes('/conversations')) return Promise.resolve({ data: CONVERSATIONS });
      return Promise.resolve({ data: { data: PARENTS } });
    });

    render(<MemoryRouter><Communications /></MemoryRouter>);
    await waitFor(() => screen.getByText('Barno Umarova'));

    const btn = screen.getByText('Barno Umarova').closest('button');
    fireEvent.click(btn);
    await waitFor(() => expect(screen.queryByText('Hello teacher!')).not.toBeNull(), { timeout: 4000 });
    expect(screen.getByText('Hello parent!')).toBeTruthy();
  });

  it('distinguishes parent vs teacher role badges', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/messages')) return Promise.resolve({ data: MESSAGES });
      if (url.includes('/conversations')) return Promise.resolve({ data: CONVERSATIONS });
      return Promise.resolve({ data: { data: PARENTS } });
    });

    render(<MemoryRouter><Communications /></MemoryRouter>);
    await waitFor(() => screen.getByText('Barno Umarova'));

    const btn = screen.getByText('Barno Umarova').closest('button');
    fireEvent.click(btn);
    await waitFor(() => expect(screen.queryByText('Hello teacher!')).not.toBeNull(), { timeout: 4000 });
    expect(screen.getAllByText('Parent').length).toBeGreaterThan(0);
    expect(screen.getByText('Teacher / Staff')).toBeTruthy();
  });

  it('shows empty state when conversations=[]', async () => {
    api.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { data: [] } });

    render(<MemoryRouter><Communications /></MemoryRouter>);
    await waitFor(() => screen.getByText('No active conversations'));
    expect(screen.getByText('No active conversations')).toBeTruthy();
  });

  it('has no message send input — read-only (search input is not a compose box)', async () => {
    api.get
      .mockResolvedValueOnce({ data: CONVERSATIONS })
      .mockResolvedValueOnce({ data: { data: PARENTS } });

    render(<MemoryRouter><Communications /></MemoryRouter>);
    await waitFor(() => screen.getByText('Barno Umarova'));

    // No message-compose textarea (read-only admin)
    expect(screen.queryByRole('textbox', { name: /yuborish|send|xabar/i })).toBeNull();
    // Search input exists (A-BRK-01 fix)
    expect(screen.getByPlaceholderText('Ota-onani qidirish…')).toBeTruthy();
  });

  it('search filters conversations by parent name', async () => {
    const CONV2 = [
      ...CONVERSATIONS,
      {
        conversationId: 'parent:p-2',
        lastMessage: { content: 'Hi', senderRole: 'parent', createdAt: new Date().toISOString() },
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
      },
    ];
    const PARENTS2 = [
      ...PARENTS,
      { id: 'p-2', firstName: 'Zulayho', lastName: 'Karimova', email: 'z@test.com', status: 'active' },
    ];
    api.get
      .mockResolvedValueOnce({ data: CONV2 })
      .mockResolvedValueOnce({ data: { data: PARENTS2 } });

    render(<MemoryRouter><Communications /></MemoryRouter>);
    await waitFor(() => screen.getByText('Barno Umarova'));
    expect(screen.getByText('Zulayho Karimova')).toBeTruthy();

    // Search for 'Barno' — Zulayho should disappear
    const searchInput = screen.getByPlaceholderText('Ota-onani qidirish…');
    fireEvent.change(searchInput, { target: { value: 'Barno' } });
    expect(screen.getByText('Barno Umarova')).toBeTruthy();
    expect(screen.queryByText('Zulayho Karimova')).toBeNull();
  });

  it('uses correct API URLs without /v1/ prefix (A-BRK-02)', async () => {
    const getCalls = [];
    api.get.mockImplementation((url) => {
      getCalls.push(url);
      if (url.includes('/messages')) return Promise.resolve({ data: MESSAGES });
      if (url.includes('/conversations')) return Promise.resolve({ data: CONVERSATIONS });
      return Promise.resolve({ data: { data: PARENTS } });
    });

    render(<MemoryRouter><Communications /></MemoryRouter>);
    await waitFor(() => screen.getByText('Barno Umarova'));

    // Conversations URL must NOT include /v1/ (API_BASE already includes it)
    const convCall = getCalls.find(u => u.includes('conversations'));
    expect(convCall).toBe('/chat/conversations');
    expect(convCall).not.toContain('/v1/chat');
  });
});
