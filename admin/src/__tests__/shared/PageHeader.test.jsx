import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageHeader from '@shared/components/PageHeader';

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Dashboard" subtitle="Overview of all schools" />);
    expect(screen.getByText('Overview of all schools')).toBeInTheDocument();
  });

  it('renders actions slot', () => {
    render(<PageHeader title="Users" actions={<button>Add user</button>} />);
    expect(screen.getByRole('button', { name: 'Add user' })).toBeInTheDocument();
  });
});
