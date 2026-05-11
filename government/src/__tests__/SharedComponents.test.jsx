import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import Card from '../../../shared/components/Card';
import ErrorBoundary from '../../../shared/components/ErrorBoundary';

describe('LoadingSpinner', () => {
  it('renders with role=status and default label', () => {
    render(<LoadingSpinner />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading…');
  });

  it('renders custom label', () => {
    render(<LoadingSpinner label="Fetching schools" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Fetching schools');
    expect(screen.getByText('Fetching schools')).toBeInTheDocument();
  });

  it('applies size classes (sm)', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    expect(container.querySelector('.h-4.w-4')).toBeInTheDocument();
  });

  it('applies size classes (xl)', () => {
    const { container } = render(<LoadingSpinner size="xl" />);
    expect(container.querySelector('.h-16.w-16')).toBeInTheDocument();
  });
});

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies onClick + cursor-pointer when onClick provided', () => {
    const onClick = vi.fn();
    const { container } = render(<Card onClick={onClick}>Click me</Card>);
    expect(container.firstChild).toHaveClass('cursor-pointer');
    fireEvent.click(container.firstChild);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('no cursor-pointer when onClick missing', () => {
    const { container } = render(<Card>Static</Card>);
    expect(container.firstChild).not.toHaveClass('cursor-pointer');
  });

  it('forwards extra className', () => {
    const { container } = render(<Card className="custom">x</Card>);
    expect(container.firstChild).toHaveClass('custom');
  });
});

describe('ErrorBoundary', () => {
  // Suppress React's expected error logs during these tests
  const originalError = console.error;
  beforeAll(() => { console.error = vi.fn(); });
  afterAll(() => { console.error = originalError; });

  it('renders children when no error', () => {
    render(<ErrorBoundary><div>safe</div></ErrorBoundary>);
    expect(screen.getByText('safe')).toBeInTheDocument();
  });

  it('renders fallback UI on child error', () => {
    const Boom = () => { throw new Error('boom'); };
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const Boom = () => { throw new Error('boom'); };
    render(<ErrorBoundary fallback={<div>custom fallback</div>}><Boom /></ErrorBoundary>);
    expect(screen.getByText('custom fallback')).toBeInTheDocument();
  });

  it('reset button clears error state and re-attempts render', () => {
    let shouldThrow = true;
    const Maybe = () => {
      if (shouldThrow) throw new Error('first time');
      return <div>recovered</div>;
    };
    const { rerender } = render(<ErrorBoundary><Maybe /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    rerender(<ErrorBoundary><Maybe /></ErrorBoundary>);
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });

  it('forwards captureException to window.Sentry when defined', () => {
    const captureSpy = vi.fn();
    window.Sentry = { captureException: captureSpy };
    const Boom = () => { throw new Error('captured'); };
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(captureSpy).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
      extra: expect.any(Object),
    }));
    delete window.Sentry;
  });

  it('does not throw when window.Sentry is missing', () => {
    delete window.Sentry;
    const Boom = () => { throw new Error('uncaught'); };
    expect(() => render(<ErrorBoundary><Boom /></ErrorBoundary>)).not.toThrow();
  });
});
