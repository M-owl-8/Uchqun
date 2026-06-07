/**
 * CP-020 frontend tests — TeacherRating school-rating section
 *
 * Tests:
 *   1. 5 sliders render from PARENT_INDICATORS config (data-driven, not hardcoded)
 *   2. Prior rating loads for edit: indicator sliders pre-filled from saved rating
 *   3. Mandatory comment enforced: empty comment → toast.error, api.post NOT called
 *   4. Submit POSTs 5 indicators + comment — NOT stars — to /parent/school-rating
 *   5. Backend RATING_COMMENT_REQUIRED error surfaced via toast
 *   6. School section renders when school is present (TP-05 happy path own school)
 *   7. No school — school section shows "no school" placeholder
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

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }) => React.createElement('a', { href: to }, children),
}));

vi.mock('../../parent/context/ChildContext', () => ({
  useChild: () => ({ selectedChild: { id: 'child-1' }, children: [] }),
}));

vi.mock('../../shared/context/ToastContext', () => ({
  useToast: () => ({ success: mockToastSuccess, error: mockToastError }),
}));

vi.mock('../../parent/components/Card', () => ({
  default: ({ children, className }) =>
    React.createElement('div', { 'data-testid': 'card', className }, children),
}));

vi.mock('../../parent/components/LoadingSpinner', () => ({
  default: ({ size }) =>
    React.createElement('div', { 'data-testid': 'loading-spinner', 'data-size': size }),
}));

vi.mock('@shared/config/ratingIndicators.js', () => ({
  PARENT_INDICATORS: [
    { key: 'parent_indicator_1', en: 'Indicator 1', uz: "Ko'rsatkich 1", ru: 'Показатель 1' },
    { key: 'parent_indicator_2', en: 'Indicator 2', uz: "Ko'rsatkich 2", ru: 'Показатель 2' },
    { key: 'parent_indicator_3', en: 'Indicator 3', uz: "Ko'rsatkich 3", ru: 'Показатель 3' },
    { key: 'parent_indicator_4', en: 'Indicator 4', uz: "Ko'rsatkich 4", ru: 'Показатель 4' },
    { key: 'parent_indicator_5', en: 'Indicator 5', uz: "Ko'rsatkich 5", ru: 'Показатель 5' },
  ],
}));

vi.mock('../../parent/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const SCHOOL = { id: 'school-1', name: 'Uchqun School' };

function stubApiLoad(api, opts = {}) {
  const { school = SCHOOL, rating = null, summary = { average: 0, count: 0 } } = opts;
  api.get.mockImplementation((url) => {
    if (url === '/parent/profile')
      return Promise.resolve({ data: { data: { user: { assignedTeacher: null } } } });
    if (url === '/parent/ratings')
      return Promise.resolve({ data: { data: { rating: null, summary: { average: 0, count: 0 } } } });
    if (url.startsWith('/parent/school-rating'))
      return Promise.resolve({ data: { data: { rating, school, summary } } });
    return Promise.reject(new Error('Unexpected URL: ' + url));
  });
}

describe('CP-020 TeacherRating — school rating section', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders 5 star rows from PARENT_INDICATORS config (data-driven)', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubApiLoad(api);
    const { default: TeacherRating } = await import('../../parent/pages/TeacherRating');
    render(React.createElement(TeacherRating));

    // The row wrapper still uses indicator-row-{key}; the slider/stars are
    // inside. Verify all 5 indicator rows are present.
    await waitFor(() => expect(screen.getByTestId('indicator-row-parent_indicator_1')).toBeTruthy());
    expect(screen.getByTestId('indicator-row-parent_indicator_2')).toBeTruthy();
    expect(screen.getByTestId('indicator-row-parent_indicator_3')).toBeTruthy();
    expect(screen.getByTestId('indicator-row-parent_indicator_4')).toBeTruthy();
    expect(screen.getByTestId('indicator-row-parent_indicator_5')).toBeTruthy();
  });

  it('pre-fills star score from saved rating indicators on load (edit mode)', async () => {
    const api = (await import('../../parent/services/api')).default;
    const savedRating = {
      id: 'r1',
      comment: 'Good',
      indicators: {
        parent_indicator_1: 4,
        parent_indicator_2: 3,
        parent_indicator_3: 5,
        parent_indicator_4: 2,
        parent_indicator_5: 4,
      },
      updatedAt: new Date().toISOString(),
    };
    stubApiLoad(api, { rating: savedRating });
    const { default: TeacherRating } = await import('../../parent/pages/TeacherRating');
    render(React.createElement(TeacherRating));

    // The new score display lives in `score-{key}` and reads "<n> / 5".
    await waitFor(() => {
      expect(screen.getByTestId('score-parent_indicator_1').textContent).toContain('4 / 5');
    });
    expect(screen.getByTestId('score-parent_indicator_3').textContent).toContain('5 / 5');
    expect(screen.getByTestId('score-parent_indicator_4').textContent).toContain('2 / 5');
  });

  it('blocks submit and calls toast.error when comment is empty', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubApiLoad(api);
    api.post.mockResolvedValue({ data: {} });
    const { default: TeacherRating } = await import('../../parent/pages/TeacherRating');
    render(React.createElement(TeacherRating));

    await waitFor(() => expect(screen.getByTestId('school-submit')).toBeTruthy());
    fireEvent.click(screen.getByTestId('school-submit'));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(api.post).not.toHaveBeenCalled();
  });

  it('POSTs indicators + comment (not stars) to /parent/school-rating on submit', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubApiLoad(api);
    api.post.mockResolvedValue({ data: {} });
    const { default: TeacherRating } = await import('../../parent/pages/TeacherRating');
    render(React.createElement(TeacherRating));

    await waitFor(() => expect(screen.getByTestId('indicator-row-parent_indicator_1')).toBeTruthy());

    // Set all 5 indicators to 4 by clicking the 4th star (role=radio, aria-label="4")
    // inside each row.
    ['parent_indicator_1', 'parent_indicator_2', 'parent_indicator_3', 'parent_indicator_4', 'parent_indicator_5'].forEach((key) => {
      const row = screen.getByTestId(`indicator-row-${key}`);
      const fourthStar = row.querySelectorAll('[role="radio"]')[3];
      fireEvent.click(fourthStar);
    });

    const textarea = screen.getByTestId('school-comment');
    fireEvent.change(textarea, { target: { value: 'Maktab yaxshi ishlaydi' } });

    fireEvent.click(screen.getByTestId('school-submit'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/parent/school-rating',
        expect.objectContaining({
          schoolId: 'school-1',
          comment: 'Maktab yaxshi ishlaydi',
          indicators: expect.objectContaining({
            parent_indicator_1: 4,
            parent_indicator_2: 4,
          }),
        })
      );
      // No 'stars' key in the payload — backend derives stars
      const callPayload = api.post.mock.calls[0][1];
      expect(callPayload).not.toHaveProperty('stars');
    });
  });

  it('surfaces RATING_COMMENT_REQUIRED backend error via toast', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubApiLoad(api);
    api.post.mockRejectedValue({
      response: { data: { error: { code: 'RATING_COMMENT_REQUIRED' } } },
    });
    const { default: TeacherRating } = await import('../../parent/pages/TeacherRating');
    render(React.createElement(TeacherRating));

    await waitFor(() => expect(screen.getByTestId('school-comment')).toBeTruthy());

    // Give a non-empty comment to pass client-side check but let backend reject
    fireEvent.change(screen.getByTestId('school-comment'), { target: { value: 'x' } });
    fireEvent.click(screen.getByTestId('school-submit'));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
  });

  it('school section renders when school is present (happy path)', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubApiLoad(api, { school: { id: 'school-1', name: 'Uchqun School' } });
    const { default: TeacherRating } = await import('../../parent/pages/TeacherRating');
    render(React.createElement(TeacherRating));

    await waitFor(() => expect(screen.getByText('Uchqun School')).toBeTruthy());
    expect(screen.getByTestId('school-submit')).toBeTruthy();
  });

  it('school section absent when no school returned', async () => {
    const api = (await import('../../parent/services/api')).default;
    stubApiLoad(api, { school: null });
    const { default: TeacherRating } = await import('../../parent/pages/TeacherRating');
    render(React.createElement(TeacherRating));

    await waitFor(() => expect(screen.queryByTestId('school-submit')).toBeNull());
    // "no school" text shown
    expect(screen.getByText('schoolRatingPage.noSchool')).toBeTruthy();
  });
});
