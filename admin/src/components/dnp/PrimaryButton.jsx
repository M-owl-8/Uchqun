import { Spinner } from './Spinner';

export function PrimaryButton({
  children,
  loadingLabel,
  onClick,
  loading = false,
  done = false,
  disabled = false,
  className = '',
  type = 'button',
}) {
  const isDisabled = disabled || loading;

  let bgClass = 'bg-[#A85C40] hover:bg-[#8D4A33]';
  if (loading) bgClass = 'bg-[#8D4A33]';
  if (done) bgClass = 'bg-[#A85C40]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        'relative flex items-center justify-center gap-[8px]',
        'w-full h-[52px] rounded-[12px]',
        'text-[15.5px] font-bold tracking-[0.01em] text-[#F2E9DF]',
        'transition-all duration-150',
        bgClass,
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[.992] active:bg-[#6E3A2A]',
        className,
      ].join(' ')}
    >
      {loading ? (
        <span className="flex items-center gap-[8px]">
          <Spinner size={17} color="white" />
          <span>{loadingLabel || children}</span>
        </span>
      ) : done ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="flex-shrink-0">
          <path d="M4 12.5 9.5 18 20 6.5" stroke="#F2E9DF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span>{children}</span>
      )}
    </button>
  );
}
