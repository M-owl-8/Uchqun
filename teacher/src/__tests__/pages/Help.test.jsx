// refs #04-005 #09-003 — Help page was 100% hardcoded English with fake US phone number
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }) => React.createElement('a', { href: to }, children),
}));

vi.mock('../../parent/components/Card', () => ({
  default: ({ children }) => React.createElement('div', null, children),
}));

describe('#04-005 #09-003 Help page i18n and contact info', () => {
  it('does not show fake US phone number', async () => {
    vi.mock('react-i18next', () => ({
      useTranslation: () => ({
        t: (k) => {
          const keys = {
            'help.title': 'Yordam va qo\'llab-quvvatlash',
            'help.subtitle': 'Tez-tez beriladigan savollarga javob toping',
            'help.contactUs': 'Biz bilan bog\'laning',
            'help.email': 'Email',
            'help.emailValue': 'support@uchqun.uz',
            'help.phone': 'Telefon',
            'help.phoneValue': '+998 71 200 00 00',
            'help.faq': 'Ko\'p beriladigan savollar',
            'help.quickLinks': 'Tezkor havolalar',
            'help.q1': 'q1', 'help.a1': 'a1',
            'help.q2': 'q2', 'help.a2': 'a2',
            'help.q3': 'q3', 'help.a3': 'a3',
            'help.q4': 'q4', 'help.a4': 'a4',
            'help.linkActivities': 'Faoliyatlar →',
            'help.linkMedia': 'Media →',
            'help.linkMeals': 'Ovqatlanish →',
            'help.linkSettings': 'Sozlamalar →',
          };
          return keys[k] ?? k;
        },
      }),
    }));
    const { default: Help } = await import('../../parent/pages/Help');
    const { container } = render(React.createElement(Help));

    // Real Uzbekistan phone, not fake US number
    expect(container.textContent).toContain('+998');
    expect(container.textContent).not.toContain('+1 (555)');
    expect(container.textContent).not.toContain('123-4567');

    // Real Uzbekistan email domain
    expect(container.textContent).toContain('uchqun.uz');
    expect(container.textContent).not.toContain('uchqunplatform.com');
  });
});
