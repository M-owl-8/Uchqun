import { Spinner } from './Spinner';

/**
 * DNP PrimaryButton — full-width, 52px tall, green.
 *
 * Props:
 *   children   ReactNode
 *   onClick    () => void
 *   loading    bool
 *   done       bool        — success state, shows check icon
 *   disabled   bool
 *   className  string      — additional classes
 *   type       string      — button type (default 'button')
 */
export function PrimaryButton({
  children,
  onClick,
  loading = false,
  done = false,
  disabled = false,
  className = '',
  type = 'button',
}) {
  const isDisabled = disabled || loading;

  let bgClass = 'bg-[#4F7B4E] hover:bg-[#426B41]';
  if (loading) bgClass = 'bg-[#426B41]';
  if (done) bgClass = 'bg-[#4F7B4E]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        'relative flex items-center justify-center gap-[8px]',
        'w-full h-[52px] rounded-[12px]',
        'text-[15.5px] font-bold tracking-[0.01em] text-white',
        'transition-all duration-150',
        bgClass,
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[.992] active:bg-[#385B37]',
        className,
      ].join(' ')}
    >
      {loading && (
        <span className="flex items-center">
          <Spinner size={17} color="white" />
        </span>
      )}
      {done && !loading && (
        <svg
          width="17"
          height="17"
          viewBox="0 0 17 17"
          fill="none"
          aria-hidden="true"
          className="flex-shrink-0"
        >
          <path
            d="M3.5 8.5l3.5 3.5 6.5-7"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span>{children}</span>
    </button>
  );
}
