// Parent portal design system — component unit tests
// Tests: MobileTabBar, ChildSwitcher
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ── Router mock ──────────────────────────────────────────────────────
vi.mock('react-router-dom', () => ({
  Link: ({ to, children, className }) =>
    React.createElement('a', { href: to, className }, children),
  useLocation: () => ({ pathname: '/' }),
}));

// ── i18n mock ────────────────────────────────────────────────────────
vi.mock('react-i18next', () => {
  // S30: stable identities — returning a fresh t per useTranslation() call
  // retriggers useCallback/useEffect chains and caused the Activities
  // infinite-render loop that hung the whole suite.
  const stable = { t: (k, opts) => opts?.defaultValue ?? k,
    i18n: { language: 'uz' } };
  return { useTranslation: () => stable };
});

// ── ChildContext mock ─────────────────────────────────────────────────
const mockSelectChild = vi.fn();
let mockChildCtx = {
  children: [
    { id: 'c1', firstName: 'Bobur', lastName: 'Karimov' },
    { id: 'c2', firstName: 'Dilnoza', lastName: 'Yusupova' },
  ],
  selectedChildId: 'c1',
  selectChild: mockSelectChild,
};
vi.mock('../../parent/context/ChildContext', () => ({
  useChild: () => mockChildCtx,
}));

// ── NotificationContext mock ──────────────────────────────────────────
vi.mock('../../parent/context/NotificationContext', () => ({
  useNotification: () => ({ count: 3 }),
}));

// ─────────────────────────────────────────────────────────────────────
// MobileTabBar
// ─────────────────────────────────────────────────────────────────────
describe('MobileTabBar', () => {
  it('renders 5 navigation tabs', async () => {
    const { default: MobileTabBar } = await import('../../parent/components/MobileTabBar');
    const { container } = render(React.createElement(MobileTabBar));
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(5);
  });

  it('marks / as active at root path', async () => {
    const { default: MobileTabBar } = await import('../../parent/components/MobileTabBar');
    const { container } = render(React.createElement(MobileTabBar));
    const homeLink = container.querySelector('a[href="/"]');
    expect(homeLink).toBeTruthy();
    expect(homeLink.className).toContain('text-p-brand-600');
  });

  it('routes match the 5-tab IA: today / journal / media / chat / child', async () => {
    const { default: MobileTabBar } = await import('../../parent/components/MobileTabBar');
    const { container } = render(React.createElement(MobileTabBar));
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/', '/journal', '/media', '/chat', '/child']);
  });

  it('emits no badge — notifications moved to top-bar bell', async () => {
    const { default: MobileTabBar } = await import('../../parent/components/MobileTabBar');
    const { container } = render(React.createElement(MobileTabBar));
    const allSpans = Array.from(container.querySelectorAll('span'));
    const badge = allSpans.find((s) => s.textContent === '3');
    expect(badge).toBeFalsy();
  });

  it('renders the i18n label keys verbatim (mock returns the key)', async () => {
    const { default: MobileTabBar } = await import('../../parent/components/MobileTabBar');
    render(React.createElement(MobileTabBar));
    expect(screen.getByText('nav.today')).toBeTruthy();
    expect(screen.getByText('nav.diary')).toBeTruthy();
    expect(screen.getByText('nav.gallery')).toBeTruthy();
    expect(screen.getByText('nav.messages')).toBeTruthy();
    expect(screen.getByText('nav.child')).toBeTruthy();
  });
});


// ─────────────────────────────────────────────────────────────────────
// ChildSwitcher
// ─────────────────────────────────────────────────────────────────────
describe('ChildSwitcher', () => {
  beforeEach(() => {
    mockSelectChild.mockClear();
    mockChildCtx = {
      children: [
        { id: 'c1', firstName: 'Bobur', lastName: 'Karimov' },
        { id: 'c2', firstName: 'Dilnoza', lastName: 'Yusupova' },
      ],
      selectedChildId: 'c1',
      selectChild: mockSelectChild,
    };
  });

  it('renders a button for each child', async () => {
    const { default: ChildSwitcher } = await import('../../parent/components/ChildSwitcher');
    render(React.createElement(ChildSwitcher));
    expect(screen.getByText('Bobur')).toBeTruthy();
    expect(screen.getByText('Dilnoza')).toBeTruthy();
  });

  it('calls selectChild when a non-selected child is clicked', async () => {
    const { default: ChildSwitcher } = await import('../../parent/components/ChildSwitcher');
    render(React.createElement(ChildSwitcher));
    fireEvent.click(screen.getByText('Dilnoza'));
    expect(mockSelectChild).toHaveBeenCalledWith('c2');
  });

  it('renders nothing when children array is empty', async () => {
    mockChildCtx = { children: [], selectedChildId: null, selectChild: mockSelectChild };
    const { default: ChildSwitcher } = await import('../../parent/components/ChildSwitcher');
    const { container } = render(React.createElement(ChildSwitcher));
    expect(container.firstChild).toBeNull();
  });
});

