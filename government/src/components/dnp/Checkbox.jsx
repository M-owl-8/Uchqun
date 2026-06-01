/**
 * DNP Checkbox — 19×19px custom styled box.
 *
 * Props:
 *   checked   bool
 *   onChange  (e) => void
 *   children  ReactNode   — label text
 *   id        string
 */
export function Checkbox({ checked, onChange, children, id }) {
  return (
    <label
      htmlFor={id}
      className="inline-flex items-center gap-[10px] cursor-pointer select-none"
    >
      {/* Hidden native input for accessibility */}
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />

      {/* Custom box */}
      <span
        className={[
          'flex-shrink-0 flex items-center justify-center',
          'w-[19px] h-[19px] rounded-[6px]',
          'border-[1.5px] transition-colors duration-150',
          checked
            ? 'bg-[#4F7B4E] border-[#4F7B4E]'
            : 'bg-[#FAFAF7] border-[#D9D7CC]',
        ].join(' ')}
      >
        {checked && (
          <svg
            width="11"
            height="9"
            viewBox="0 0 11 9"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 4.5 4 7.5 10 1"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      {children && (
        <span className="text-[13.5px] text-[#6A7A6B]">{children}</span>
      )}
    </label>
  );
}
