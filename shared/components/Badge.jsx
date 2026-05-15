const variantClasses = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-sky-100 text-sky-700',
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
};

const Badge = ({ children, variant = 'default', size = 'md', className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 font-semibold rounded-badge
      ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
  >
    {children}
  </span>
);

export default Badge;
