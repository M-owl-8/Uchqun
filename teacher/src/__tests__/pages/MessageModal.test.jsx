/**
 * CP-022 frontend tests — MessageModal (parent compose) + MessagesModal (history)
 *
 * Tests:
 *   MessageModal:
 *     1. Renders 3 level buttons (owner, region, republic)
 *     2. 'republic' is selected by default
 *     3. Clicking a level button selects it
 *     4. Send button POSTs with recipientLevel in body
 *     5. Send button POSTs with escalatedFromId when in escalation mode
 *     6. Escalation notice rendered when escalatedFromSubject provided
 *     7. toastError shown when POST fails with MESSAGE_SUBJECT_REQUIRED code
 *     8. When escalatedFromLevel='owner', selector defaults to 'region' (next level)
 *
 *   MessagesModal:
 *     9. Level badge renders for message with recipientLevel='region'
 *    10. Escalation chain indicator renders when escalatedFrom present
 *    11. Escalate button is present for non-republic messages; fires onEscalate
 *    12. Escalate button is NOT present for republic-level messages
 *    13. messagesError banner renders when error prop set
 *    14. Cold-load error: no messages + no error → empty state (not error banner)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('react-i18next', () => {
  const t = (k, opts) => opts?.defaultValue ?? k;
  return { useTranslation: () => ({ t, i18n: { language: 'en' } }) };
});

vi.mock('../../shared/context/ToastContext', () => ({
  useToast: () => ({ success: mockToastSuccess, error: mockToastError }),
}));

vi.mock('../../parent/services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('../../parent/components/LoadingSpinner', () => ({
  default: ({ size }) => React.createElement('div', { 'data-testid': 'loading-spinner', 'data-size': size }),
}));

// ── MessageModal tests ──────────────────────────────────────────────────────

describe('MessageModal — CP-022 level selector', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  async function renderMessageModal(props = {}) {
    const api = (await import('../../parent/services/api')).default;
    const { default: MessageModal } = await import('../../parent/pages/childProfile/MessageModal');
    const defaults = {
      show: true,
      onClose: vi.fn(),
      onSent: vi.fn(),
      ...props,
    };
    render(React.createElement(MessageModal, defaults));
    return { api, ...defaults };
  }

  it('renders 3 level buttons', async () => {
    await renderMessageModal();
    expect(screen.getByTestId('level-owner')).toBeTruthy();
    expect(screen.getByTestId('level-region')).toBeTruthy();
    expect(screen.getByTestId('level-republic')).toBeTruthy();
  });

  it('republic is selected by default', async () => {
    await renderMessageModal();
    const republicBtn = screen.getByTestId('level-republic');
    // selected class includes 'bg-indigo-100'
    expect(republicBtn.className).toContain('bg-indigo-100');
  });

  it('clicking owner level selects it', async () => {
    await renderMessageModal();
    const ownerBtn = screen.getByTestId('level-owner');
    fireEvent.click(ownerBtn);
    await waitFor(() => expect(ownerBtn.className).toContain('bg-amber-100'));
  });

  it('send POSTs with recipientLevel=region when region is selected', async () => {
    const { api, onSent } = await renderMessageModal();
    api.post.mockResolvedValue({ data: {} });
    api.get.mockResolvedValue({ data: { data: [] } });

    fireEvent.click(screen.getByTestId('level-region'));

    const subjectInput = document.querySelector('input[type="text"]');
    const textarea = document.querySelector('textarea');
    fireEvent.change(subjectInput, { target: { value: 'My subject' } });
    fireEvent.change(textarea, { target: { value: 'My body text' } });

    fireEvent.click(screen.getByTestId('send-button'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/parent/message-to-government', {
        subject: 'My subject',
        message: 'My body text',
        recipientLevel: 'region',
      });
    });
  });

  it('send POSTs with escalatedFromId when in escalation mode', async () => {
    const { api } = await renderMessageModal({
      escalatedFromId: 'msg-uuid-prior',
      escalatedFromSubject: 'Prior subject',
      escalatedFromLevel: 'owner',
    });
    api.post.mockResolvedValue({ data: {} });
    api.get.mockResolvedValue({ data: { data: [] } });

    const subjectInput = document.querySelector('input[type="text"]');
    const textarea = document.querySelector('textarea');
    fireEvent.change(subjectInput, { target: { value: 'Escalation subject' } });
    fireEvent.change(textarea, { target: { value: 'Escalation body' } });

    fireEvent.click(screen.getByTestId('send-button'));

    await waitFor(() => {
      const call = api.post.mock.calls[0];
      expect(call[1]).toMatchObject({
        escalatedFromId: 'msg-uuid-prior',
        recipientLevel: 'region', // owner→region auto-advance
      });
    });
  });

  it('shows escalation notice when escalatedFromSubject provided', async () => {
    await renderMessageModal({
      escalatedFromId: 'msg-001',
      escalatedFromSubject: 'Prior message subject',
    });
    expect(screen.getByText('Prior message subject')).toBeTruthy();
  });

  it('toastError shown on POST failure with MESSAGE_SUBJECT_REQUIRED code', async () => {
    const { api } = await renderMessageModal();
    api.post.mockRejectedValue({
      response: { data: { error: { code: 'MESSAGE_SUBJECT_REQUIRED' } } },
    });

    const subjectInput = document.querySelector('input[type="text"]');
    const textarea = document.querySelector('textarea');
    fireEvent.change(subjectInput, { target: { value: 'S' } });
    fireEvent.change(textarea, { target: { value: 'B' } });
    fireEvent.click(screen.getByTestId('send-button'));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });

  it('when escalatedFromLevel=owner, defaults recipientLevel to region', async () => {
    await renderMessageModal({ escalatedFromLevel: 'owner', escalatedFromId: 'x' });
    const regionBtn = screen.getByTestId('level-region');
    await waitFor(() => expect(regionBtn.className).toContain('bg-blue-100'));
  });
});

// ── MessagesModal tests ─────────────────────────────────────────────────────

describe('MessagesModal — CP-022 level badge + escalation', () => {
  beforeEach(() => vi.resetAllMocks());

  async function renderMessagesModal(props = {}) {
    const { default: MessagesModal } = await import('../../parent/pages/childProfile/MessagesModal');
    const defaults = {
      show: true,
      onClose: vi.fn(),
      messages: [],
      loadingMessages: false,
      messagesError: null,
      onEscalate: vi.fn(),
      ...props,
    };
    render(React.createElement(MessagesModal, defaults));
    return defaults;
  }

  const makeMsg = (overrides = {}) => ({
    id: 'msg-1',
    subject: 'Test subject',
    message: 'Test body',
    recipientLevel: 'region',
    reply: null,
    repliedAt: null,
    escalatedFrom: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  it('level badge renders for recipientLevel=region', async () => {
    await renderMessagesModal({ messages: [makeMsg({ recipientLevel: 'region' })] });
    expect(screen.getByTestId('level-badge-region')).toBeTruthy();
  });

  it('level badge renders for recipientLevel=owner', async () => {
    await renderMessagesModal({ messages: [makeMsg({ recipientLevel: 'owner' })] });
    expect(screen.getByTestId('level-badge-owner')).toBeTruthy();
  });

  it('escalation chain indicator renders when escalatedFrom present', async () => {
    const msg = makeMsg({
      escalatedFrom: { id: 'prior-id', subject: 'Prior message', recipientLevel: 'owner', createdAt: new Date().toISOString() },
    });
    await renderMessagesModal({ messages: [msg] });
    expect(screen.getByTestId('escalation-chain-msg-1')).toBeTruthy();
    expect(screen.getByText('Prior message')).toBeTruthy();
  });

  it('escalate button fires onEscalate for owner-level message', async () => {
    const onEscalate = vi.fn();
    const msg = makeMsg({ id: 'msg-x', recipientLevel: 'owner' });
    await renderMessagesModal({ messages: [msg], onEscalate });
    const btn = screen.getByTestId('escalate-btn-msg-x');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onEscalate).toHaveBeenCalledWith({
      messageId: 'msg-x',
      subject: 'Test subject',
      currentLevel: 'owner',
    });
  });

  it('escalate button absent for republic-level messages (already at top)', async () => {
    const msg = makeMsg({ recipientLevel: 'republic' });
    await renderMessagesModal({ messages: [msg] });
    expect(screen.queryByTestId('escalate-btn-msg-1')).toBeNull();
  });

  it('messagesError banner renders when error prop set', async () => {
    await renderMessagesModal({ messagesError: 'Xabarlarni yuklab bo\'lmadi' });
    expect(screen.getByTestId('messages-error')).toBeTruthy();
  });

  it('empty state shown when no messages and no error', async () => {
    await renderMessagesModal({ messages: [] });
    expect(screen.queryByTestId('messages-error')).toBeNull();
  });
});
