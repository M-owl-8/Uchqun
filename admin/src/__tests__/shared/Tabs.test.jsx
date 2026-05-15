import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Tabs from '@shared/components/Tabs';

const tabs = [
  { id: 'all', label: 'All', count: 10 },
  { id: 'active', label: 'Active', count: 3 },
  { id: 'inactive', label: 'Inactive' },
];

describe('Tabs', () => {
  it('renders all tab labels', () => {
    render(<Tabs tabs={tabs} activeTab="all" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /All/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Active/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Inactive/ })).toBeInTheDocument();
  });

  it('marks the active tab with aria-selected', () => {
    render(<Tabs tabs={tabs} activeTab="active" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Active/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /All/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the tab id when clicked', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} activeTab="all" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /Inactive/ }));
    expect(onChange).toHaveBeenCalledWith('inactive');
  });

  it('shows count badges', () => {
    render(<Tabs tabs={tabs} activeTab="all" onChange={vi.fn()} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
