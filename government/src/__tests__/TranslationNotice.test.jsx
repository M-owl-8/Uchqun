import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key, opts) => opts?.defaultValue ?? _key,
  }),
}));

vi.mock('lucide-react', () => ({ X: () => <span>X</span> }));

let storedItems = {};
const localStorageMock = {
  getItem: (k) => storedItems[k] ?? null,
  setItem: (k, v) => { storedItems[k] = v; },
  removeItem: (k) => { delete storedItems[k]; },
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

import TranslationNotice from '../components/TranslationNotice';

describe('TranslationNotice (CP-019)', () => {
  beforeEach(() => { storedItems = {}; });

  it('renders the notice by default', () => {
    render(<TranslationNotice />);
    expect(screen.getByTestId('translation-notice')).toBeInTheDocument();
    expect(screen.getByText(/AI-generated/i)).toBeInTheDocument();
  });

  it('does not render when previously dismissed (localStorage)', () => {
    storedItems['gov_translation_notice_dismissed'] = '1';
    render(<TranslationNotice />);
    expect(screen.queryByTestId('translation-notice')).not.toBeInTheDocument();
  });

  it('dismiss button hides the notice and persists to localStorage', () => {
    render(<TranslationNotice />);
    const btn = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(btn);
    expect(screen.queryByTestId('translation-notice')).not.toBeInTheDocument();
    expect(localStorageMock.getItem('gov_translation_notice_dismissed')).toBe('1');
  });
});
