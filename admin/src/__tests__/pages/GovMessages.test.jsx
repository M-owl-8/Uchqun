import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('react-i18next', () => {
  const t = (k, o) => o?.defaultValue ?? k;
  return { useTranslation: () => ({ t }) };
});
vi.mock('@shared/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

import api from '../../services/api';
import GovMessages from '../../pages/GovMessages';

const MSG_WITH_REPLY = {
  id: 'm-1',
  subject: 'Roof repairs needed',
  message: 'Our school roof needs urgent repair.',
  reply: 'We have assigned a contractor.',
  repliedAt: '2026-05-15T09:00:00Z',
  createdAt: '2026-05-10T08:00:00Z',
};

const MSG_PENDING = {
  id: 'm-2',
  subject: 'Budget request',
  message: 'We need additional funding.',
  reply: null,
  repliedAt: null,
  createdAt: '2026-05-20T10:00:00Z',
};

describe('GovMessages (AG-008)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sent messages list from GET /admin/messages', async () => {
    api.get.mockResolvedValue({ data: { data: [MSG_WITH_REPLY, MSG_PENDING] } });

    render(<MemoryRouter><GovMessages /></MemoryRouter>);
    await waitFor(() => screen.getByText('Roof repairs needed'));
    expect(screen.getByText('Roof repairs needed')).toBeTruthy();
    expect(screen.getByText('Budget request')).toBeTruthy();
  });

  it('shows Replied badge when reply field is non-null', async () => {
    api.get.mockResolvedValue({ data: { data: [MSG_WITH_REPLY] } });

    render(<MemoryRouter><GovMessages /></MemoryRouter>);
    await waitFor(() => screen.getAllByText('Javob berildi'));
    expect(screen.getAllByText('Javob berildi').length).toBeGreaterThan(0);
  });

  it('shows Pending badge when reply field is null', async () => {
    api.get.mockResolvedValue({ data: { data: [MSG_PENDING] } });

    render(<MemoryRouter><GovMessages /></MemoryRouter>);
    await waitFor(() => screen.getAllByText('Kutilmoqda'));
    expect(screen.getAllByText('Kutilmoqda').length).toBeGreaterThan(0);
  });

  it('thread view shows original message and government reply', async () => {
    api.get.mockResolvedValue({ data: { data: [MSG_WITH_REPLY] } });

    render(<MemoryRouter><GovMessages /></MemoryRouter>);
    await waitFor(() => screen.getByText('Roof repairs needed'));

    const msgBtn = screen.getByText('Roof repairs needed').closest('button');
    fireEvent.click(msgBtn);

    expect(screen.getByText('Our school roof needs urgent repair.')).toBeTruthy();
    expect(screen.getByText('We have assigned a contractor.')).toBeTruthy();
  });

  it('compose form submits POST /admin/message-to-government with subject and message', async () => {
    api.get.mockResolvedValue({ data: { data: [] } });
    api.post.mockResolvedValue({ data: { data: { id: 'm-new', subject: 'New issue', message: 'Details here', reply: null, createdAt: new Date().toISOString() } } });

    render(<MemoryRouter><GovMessages /></MemoryRouter>);
    await waitFor(() => screen.getByText('Hali xabar yuborilmagan'));

    fireEvent.click(screen.getByText('Yangi xabar'));

    const subjectInput = screen.getByPlaceholderText('Mavzuni kiriting');
    const bodyInput = screen.getByPlaceholderText('Xabaringizni kiriting');

    fireEvent.change(subjectInput, { target: { value: 'New issue' } });
    fireEvent.change(bodyInput, { target: { value: 'Details here' } });

    fireEvent.click(screen.getByText('Yuborish'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/admin/message-to-government', {
        subject: 'New issue',
        message: 'Details here',
      });
    });
  });
});
