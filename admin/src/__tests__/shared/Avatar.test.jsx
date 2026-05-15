import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Avatar from '@shared/components/Avatar';

describe('Avatar', () => {
  it('renders initials when no src', () => {
    render(<Avatar initials="AB" alt="Ali Bakirov" />);
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('renders img when src is provided', () => {
    render(<Avatar src="/photo.jpg" alt="Profile photo" />);
    const img = screen.getByAltText('Profile photo');
    expect(img).toBeInTheDocument();
    expect(img.tagName).toBe('IMG');
  });
});
