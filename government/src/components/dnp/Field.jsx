import { useState } from 'react';
import { EyeIcon } from '../icons/EyeIcon';

/**
 * DNP Field — input wrapper with all states wired.
 *
 * Props:
 *   id          string
 *   label       string
 *   type        string  (default 'text')
 *   value       string
 *   onChange    (e) => void
 *   placeholder string
 *   error       string | null
 *   autoFocus   bool
 *   trailing    ReactNode  (custom trailing element; overrides eye button)
 *   disabled    bool
 *   onKeyDown   (e) => void
 */
export function Field({
  id,
  label,
  labelRight,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  autoFocus,
  trailing,
  disabled,
  onKeyDown,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  // Container border/bg/shadow
  let containerClasses =
    'relative flex items-center h-[50px] rounded-[11px] border-[1.5px] ' +
    'px-[14px] pr-[6px] transition-all duration-150 ';

  if (disabled) {
    containerClasses += 'bg-[#F1EFE8] border-[#D9D7CC] cursor-not-allowed ';
  } else if (error) {
    containerClasses += 'bg-[#FAFAF7] border-[#B5462F] shadow-dnp-err ';
  } else {
    containerClasses +=
      'bg-[#FAFAF7] border-[#D9D7CC] ' +
      'focus-within:border-[#4F7B4E] focus-within:bg-white focus-within:shadow-dnp-focus ';
  }

  return (
    <div className="flex flex-col w-full">
      {(label || labelRight) && (
        <div className={['flex mb-[7px]', labelRight ? 'items-center justify-between' : 'items-center'].join(' ')}>
          {label && (
            <label
              htmlFor={id}
              className="text-[13px] font-semibold text-[#1C2A1E] tracking-[0.005em]"
            >
              {label}
            </label>
          )}
          {labelRight && <div>{labelRight}</div>}
        </div>
      )}

      <div className={containerClasses}>
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          {...rest}
          className={[
            'flex-1 min-w-0 bg-transparent border-none outline-none',
            'text-[15px] font-normal',
            disabled ? 'text-[#93A293] cursor-not-allowed' : 'text-[#1C2A1E]',
            'placeholder:text-[#93A293]',
          ].join(' ')}
        />

        {/* Trailing: custom prop overrides eye button */}
        {trailing ? (
          <div className="flex-shrink-0 ml-1">{trailing}</div>
        ) : isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            disabled={disabled}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className={[
              'flex-shrink-0 flex items-center justify-center',
              'w-[38px] h-[38px] rounded-[9px]',
              'text-[#6A7A6B] transition-colors duration-150',
              disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-[rgba(28,42,30,.06)] hover:text-[#1C2A1E]',
            ].join(' ')}
          >
            <EyeIcon off={showPassword} size={18} />
          </button>
        ) : null}
      </div>

      {error && (
        <p className="mt-[7px] text-[12.5px] font-medium text-[#B5462F]">
          {error}
        </p>
      )}
    </div>
  );
}
