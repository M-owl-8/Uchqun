const Card = ({ children, className = '', onClick }) => {
  const interactiveProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e),
      }
    : {};

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-primary-500 outline-none' : ''
      }`}
      onClick={onClick}
      {...interactiveProps}
    >
      {children}
    </div>
  );
};

export default Card;
