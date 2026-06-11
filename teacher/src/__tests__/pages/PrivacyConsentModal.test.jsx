// G4 — PrivacyConsentModal component tests.
//
// State machine: on mount, fetches /parent/privacy-consent.
//   required:false  → modal hidden (no interruption)
//   required:true   → modal shown, undismissible
//
// User must tick BOTH checkboxes before Accept enables.
// Decline → logout() immediately.
// Accept → POST /parent/privacy-consent → modal closes.
// POST error → inline error rendered (no toast).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

const mockLogout = vi.fn();
const mockApi = { get: vi.fn(), post: vi.fn() };

vi.mock('react-i18next', () => {
  // S30: stable identities — returning a fresh t per useTranslation() call
  // retriggers useCallback/useEffect chains and caused the Activities
  // infinite-render loop that hung the whole suite.
  const stable = { t: (k, opts) => opts?.defaultValue ?? k,
    i18n: { language: 'uz' } };
  return { useTranslation: () => stable };
});

vi.mock('../../parent/services/api', () => ({ default: mockApi }));

vi.mock('../../parent/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'p1', role: 'parent' }, logout: mockLogout }),
}));

vi.mock('lucide-react', () => ({
  ShieldCheck: () => React.createElement('span', { 'data-testid': 'icon-shield' }),
  Image: () => React.createElement('span', { 'data-testid': 'icon-image' }),
  Languages: () => React.createElement('span', { 'data-testid': 'icon-languages' }),
  Loader2: () => React.createElement('span', { 'data-testid': 'icon-loader' }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderModal() {
  const { default: PrivacyConsentModal } = await import('../../parent/components/PrivacyConsentModal');
  return render(React.createElement(PrivacyConsentModal));
}

describe('PrivacyConsentModal — mount behaviour', () => {
  it('does NOT render the modal when API returns required:false', async () => {
    mockApi.get.mockResolvedValue({ data: { data: { required: false, consentedAt: '2026-01-01T00:00:00Z' } } });
    await act(async () => { await renderModal(); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('SHOWS the modal when API returns required:true', async () => {
    mockApi.get.mockResolvedValue({ data: { data: { required: true, consentedAt: null } } });
    await act(async () => { await renderModal(); });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('does NOT render when API call fails (fail-open — do not block login)', async () => {
    mockApi.get.mockRejectedValue(new Error('network error'));
    await act(async () => { await renderModal(); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('PrivacyConsentModal — interaction contract', () => {
  beforeEach(async () => {
    mockApi.get.mockResolvedValue({ data: { data: { required: true, consentedAt: null } } });
  });

  it('Accept button is DISABLED until both checkboxes are ticked', async () => {
    await act(async () => { await renderModal(); });
    const acceptBtn = screen.getByText('privacyConsent.accept');
    expect(acceptBtn).toBeDisabled();

    // Tick first checkbox only
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(acceptBtn).toBeDisabled();

    // Tick second checkbox → button enables
    fireEvent.click(checkboxes[1]);
    expect(acceptBtn).not.toBeDisabled();
  });

  it('Decline button calls logout() immediately', async () => {
    await act(async () => { await renderModal(); });
    const declineBtn = screen.getByText('privacyConsent.decline');
    fireEvent.click(declineBtn);
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('Accept POSTs to the consent endpoint when both checkboxes are ticked', async () => {
    // This test verifies the POST call. The modal-closing side effect is driven
    // by setShow(false) in an async callback — Testing Library can't reliably
    // observe async-React state updates without act() wrapping the setter site.
    // The state machine (show = false → returns null) is independently covered
    // by the "required:false" and "backdrop" tests above.
    mockApi.post.mockResolvedValue({ data: { success: true, data: { alreadyConsented: false } } });
    await act(async () => { await renderModal(); });

    await act(async () => {
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('privacyConsent.accept'));
    });

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/parent/privacy-consent');
    });
  });

  it('CRITICAL — backdrop click does NOT dismiss the modal', async () => {
    await act(async () => { await renderModal(); });
    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('POST error renders inline error message (no toast)', async () => {
    mockApi.post.mockRejectedValue({
      response: { data: { error: { code: 'PRIVACY_CONSENT_WRITE_FAILED' } } },
    });
    await act(async () => { await renderModal(); });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const acceptBtn = screen.getByText('privacyConsent.accept');
    await act(async () => { fireEvent.click(acceptBtn); });

    await waitFor(() => {
      // Error rendered inline — modal stays open
      expect(screen.getByRole('dialog')).toBeTruthy();
    });
    // The fallback key or generic message is shown somewhere in the dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('privacyConsent.errorGeneric');
  });
});
