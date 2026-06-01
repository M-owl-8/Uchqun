/**
 * DNP InlineLink — renders as a button with link styling.
 *
 * Props:
 *   onClick   () => void
 *   children  ReactNode
 *   className string
 */
export function InlineLink({ onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'text-[12.5px] font-semibold text-[#4F7B4E]',
        'no-underline hover:underline hover:text-[#426B41]',
        'bg-transparent border-none p-0 cursor-pointer',
        'transition-colors duration-150',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
