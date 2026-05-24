/**
 * U-7: GroupStep surfaces API error instead of silently failing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}));

vi.mock('../../../../shared/utils/cache', () => ({
  get: vi.fn(() => null),
  set: vi.fn(),
}));

import api from '../../services/api';
import GroupStep from '../../pages/ParentWizard/steps/GroupStep';

const defaultProps = {
  data: { groupId: '' },
  onChange: vi.fn(),
  parentData: { firstName: 'Ali', lastName: 'Valiyev' },
  childData: { firstName: 'Bobur', lastName: 'Valiyev' },
};

beforeEach(() => vi.clearAllMocks());

describe('GroupStep (U-7 RE-7 sweep)', () => {
  it('shows groups when API succeeds', async () => {
    api.get.mockResolvedValue({ data: { data:[{ id: 'g1', name: 'Guruh A', capacity: 10 }] } });
    render(<GroupStep {...defaultProps} />);
    await waitFor(() => expect(screen.getByText(/"Guruh A"/)).toBeDefined());
  });

  it('shows error banner when API fails instead of silently hiding it', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    render(<GroupStep {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/xatolik/i)).toBeDefined();
    });
  });

  it('shows "no groups" when API returns empty array', async () => {
    api.get.mockResolvedValue({ data: { data:[] } });
    render(<GroupStep {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Guruhlar topilmadi')).toBeDefined();
    });
  });
});
