/**
 * CP-019 TranslationNotice — REMOVED per ADMIN-PORTAL-FOUNDATION.
 * Banner was AI-generated-translation notice. Eliminated for pre-launch.
 * This test confirms the component no longer renders anything.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k, opts) => opts?.defaultValue ?? _k }),
}));

import TranslationNotice from '../components/TranslationNotice';

describe('TranslationNotice (CP-019 — banner removed)', () => {
  it('renders nothing — banner eliminated per ADMIN-PORTAL-FOUNDATION', () => {
    render(<TranslationNotice />);
    expect(screen.queryByTestId('translation-notice')).not.toBeInTheDocument();
  });
});
