const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = ({ children, className = '', onClick, padding = 'md', header, footer }) => {
  const interactiveProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e),
      }
    : {};

  return (
    <div
      className={`bg-white rounded-card shadow-sm border border-gray-200 ${className} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-primary-500 outline-none' : ''
      }`}
      onClick={onClick}
      {...interactiveProps}
    >
      {header && (
        <div className="px-6 py-4 border-b border-gray-100 font-semibold text-gray-900">
          {header}
        </div>
      )}
      <div className={header || footer ? paddingClasses[padding] : paddingClasses[padding]}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-card">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
