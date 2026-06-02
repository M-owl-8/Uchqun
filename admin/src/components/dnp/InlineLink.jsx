export function InlineLink({ onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'text-[12.5px] font-semibold text-[#A85C40]',
        'no-underline hover:underline hover:text-[#8D4A33]',
        'bg-transparent border-none p-0 cursor-pointer',
        'transition-colors duration-150',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
