const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
  xl: 'h-16 w-16 border-4',
};

const LoadingSpinner = ({ size = 'md', className = '', label = 'Loading…' }) => (
  <div className={`flex items-center justify-center ${className}`} role="status" aria-label={label}>
    <div className={`${sizeClasses[size]} border-primary-200 border-t-primary-600 rounded-full animate-spin`} />
    <span className="sr-only">{label}</span>
  </div>
);

export default LoadingSpinner;
