import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from '@shared/components/Badge';

describe('Badge', () => {
  it('renders text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Badge className="extra">Text</Badge>);
    expect(container.firstChild).toHaveClass('extra');
  });
});
