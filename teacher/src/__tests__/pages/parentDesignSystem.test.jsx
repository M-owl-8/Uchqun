// Parent portal design system — component unit tests
// Tests: MobileTabBar, DayCard, DayStack, ChildSwitcher, SensitiveNotice, CallTeacherButton
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
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => opts?.defaultValue ?? k,
    i18n: { language: 'uz' },
  }),
}));

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
  it('renders 4 navigation tabs', async () => {
    const { default: MobileTabBar } = await import('../../parent/components/MobileTabBar');
    const { container } = render(React.createElement(MobileTabBar));
    const links = container.querySelectorAll('a');
    expect(links.length).toBe(4);
  });

  it('marks / as active at root path', async () => {
    const { default: MobileTabBar } = await import('../../parent/components/MobileTabBar');
    const { container } = render(React.createElement(MobileTabBar));
    const homeLink = container.querySelector('a[href="/"]');
    expect(homeLink).toBeTruthy();
    expect(homeLink.className).toContain('text-p-brand-600');
  });

  it('shows unread badge on Xabarlar tab when count > 0', async () => {
    const { default: MobileTabBar } = await import('../../parent/components/MobileTabBar');
    const { container } = render(React.createElement(MobileTabBar));
    // The badge span is positioned absolutely (absolute class) on the messages tab icon
    const allSpans = Array.from(container.querySelectorAll('span'));
    const badge = allSpans.find((s) => s.textContent === '3');
    expect(badge).toBeTruthy();
  });

  it('has tab labels', async () => {
    const { default: MobileTabBar } = await import('../../parent/components/MobileTabBar');
    render(React.createElement(MobileTabBar));
    expect(screen.getByText('Bugun')).toBeTruthy();
    expect(screen.getByText('Kundalik')).toBeTruthy();
    expect(screen.getByText('Xabarlar')).toBeTruthy();
    expect(screen.getByText('Profil')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────
// DayCard
// ─────────────────────────────────────────────────────────────────────
describe('DayCard', () => {
  it('renders stats row with activity/meal/media counts', async () => {
    const { default: DayCard } = await import('../../parent/components/DayCard');
    const { container } = render(
      React.createElement(DayCard, {
        date: '2026-05-27',
        activities: 4,
        meals: 3,
        media: 2,
      })
    );
    const text = container.textContent;
    expect(text).toContain('4');
    expect(text).toContain('3');
    expect(text).toContain('2');
  });

  it('shows "Bugun" label when isToday=true', async () => {
    const { default: DayCard } = await import('../../parent/components/DayCard');
    render(React.createElement(DayCard, { date: '2026-05-27', isToday: true }));
    expect(screen.getByText('Bugun')).toBeTruthy();
  });

  it('does not show "Bugun" label when isToday=false', async () => {
    const { default: DayCard } = await import('../../parent/components/DayCard');
    render(React.createElement(DayCard, { date: '2026-05-27', isToday: false }));
    expect(screen.queryByText('Bugun')).toBeNull();
  });

  it('renders milestone badge when milestone prop provided', async () => {
    const { default: DayCard } = await import('../../parent/components/DayCard');
    render(React.createElement(DayCard, { date: '2026-05-27', milestone: 'Birinchi qadam' }));
    expect(screen.getByText('Birinchi qadam')).toBeTruthy();
  });

  it('calls onClick when clicked (role=button)', async () => {
    const { default: DayCard } = await import('../../parent/components/DayCard');
    const onClick = vi.fn();
    const { container } = render(React.createElement(DayCard, { date: '2026-05-27', onClick }));
    fireEvent.click(container.firstChild);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has .page-card and .page-corner classes', async () => {
    const { default: DayCard } = await import('../../parent/components/DayCard');
    const { container } = render(React.createElement(DayCard, { date: '2026-05-27' }));
    expect(container.firstChild.className).toContain('page-card');
    expect(container.firstChild.className).toContain('page-corner');
  });
});

// ─────────────────────────────────────────────────────────────────────
// DayStack
// ─────────────────────────────────────────────────────────────────────
describe('DayStack', () => {
  it('renders empty state when days=[]', async () => {
    const { default: DayStack } = await import('../../parent/components/DayStack');
    render(React.createElement(DayStack, { days: [] }));
    expect(screen.getByText("Hali ma'lumot yo'q")).toBeTruthy();
  });

  it('renders one DayCard per day entry', async () => {
    const { default: DayStack } = await import('../../parent/components/DayStack');
    const days = [
      { date: '2026-05-27', activities: 2, meals: 1, media: 0 },
      { date: '2026-05-26', activities: 3, meals: 2, media: 1 },
    ];
    const { container } = render(React.createElement(DayStack, { days }));
    // Expect 2 page-card elements
    const cards = container.querySelectorAll('.page-card');
    expect(cards.length).toBe(2);
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

// ─────────────────────────────────────────────────────────────────────
// SensitiveNotice
// ─────────────────────────────────────────────────────────────────────
describe('SensitiveNotice', () => {
  it('renders children text', async () => {
    const { default: SensitiveNotice } = await import('../../parent/components/SensitiveNotice');
    render(React.createElement(SensitiveNotice, { intensity: 'low' }, 'Ma\'lumot maxfiy'));
    expect(screen.getByText("Ma'lumot maxfiy")).toBeTruthy();
  });

  it('applies low intensity classes by default', async () => {
    const { default: SensitiveNotice } = await import('../../parent/components/SensitiveNotice');
    const { container } = render(
      React.createElement(SensitiveNotice, null, 'Notice text')
    );
    expect(container.firstChild.className).toContain('bg-p-sepia-50');
  });

  it('applies medium intensity classes', async () => {
    const { default: SensitiveNotice } = await import('../../parent/components/SensitiveNotice');
    const { container } = render(
      React.createElement(SensitiveNotice, { intensity: 'medium' }, 'Notice text')
    );
    expect(container.firstChild.className).toContain('bg-p-brand-50');
  });

  it('applies high intensity classes', async () => {
    const { default: SensitiveNotice } = await import('../../parent/components/SensitiveNotice');
    const { container } = render(
      React.createElement(SensitiveNotice, { intensity: 'high' }, 'Notice text')
    );
    expect(container.firstChild.className).toContain('bg-amber-50');
  });
});

// ─────────────────────────────────────────────────────────────────────
// CallTeacherButton
// ─────────────────────────────────────────────────────────────────────
describe('CallTeacherButton', () => {
  it('renders a tel: link when phone is provided', async () => {
    const { default: CallTeacherButton } = await import('../../parent/components/CallTeacherButton');
    const { container } = render(
      React.createElement(CallTeacherButton, { phone: '+998901234567' })
    );
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link.href).toContain('tel:+998901234567');
  });

  it('renders nothing when phone is absent', async () => {
    const { default: CallTeacherButton } = await import('../../parent/components/CallTeacherButton');
    const { container } = render(React.createElement(CallTeacherButton));
    expect(container.firstChild).toBeNull();
  });

  it('uses custom label when provided', async () => {
    const { default: CallTeacherButton } = await import('../../parent/components/CallTeacherButton');
    render(
      React.createElement(CallTeacherButton, { phone: '+998901234567', label: 'Aloqa' })
    );
    expect(screen.getByText('Aloqa')).toBeTruthy();
  });
});
