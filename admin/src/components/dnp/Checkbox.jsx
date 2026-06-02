export function Checkbox({ checked, onChange, children, id }) {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-[10px] cursor-pointer select-none">
      <input type="checkbox" id={id} checked={checked} onChange={onChange} className="sr-only" />

      <span
        className={[
          'flex-shrink-0 flex items-center justify-center',
          'w-[19px] h-[19px] rounded-[6px]',
          'border-[1.5px] transition-colors duration-150',
          checked ? 'bg-[#A85C40] border-[#A85C40]' : 'bg-[#FFFCF8] border-[#DFD6C6]',
        ].join(' ')}
      >
        {checked && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none" aria-hidden="true">
            <path d="M1 4.5 4 7.5 10 1" stroke="#F2E9DF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>

      {children && <span className="text-[13.5px] text-[#756959]">{children}</span>}
    </label>
  );
}
