import { useState } from 'react';
import { EyeIcon } from '../icons/EyeIcon';

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

  let containerClasses =
    'relative flex items-center h-[50px] rounded-[11px] border-[1.5px] ' +
    'px-[14px] pr-[6px] transition-all duration-150 ';

  if (disabled) {
    containerClasses += 'bg-[#F7F3EC] border-[#C9BCA9] cursor-not-allowed ';
  } else if (error) {
    containerClasses += 'bg-[#FFFCF8] border-[#9A3E3A] shadow-err ';
  } else {
    containerClasses +=
      'bg-[#FFFCF8] border-[#DFD6C6] ' +
      'focus-within:border-[#A85C40] focus-within:bg-white focus-within:shadow-focus ';
  }

  return (
    <div className="flex flex-col w-full">
      {(label || labelRight) && (
        <div className={['flex mb-[7px]', labelRight ? 'items-center justify-between' : 'items-center'].join(' ')}>
          {label && (
            <label htmlFor={id} className="text-[13px] font-semibold text-[#1E1A16] tracking-[0.005em]">
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
            'flex-1 min-w-0 bg-transparent',
            'border-0 border-none outline-none shadow-none',
            'focus:outline-none focus-visible:outline-none focus:ring-0 focus:shadow-none',
            'text-[15px] font-normal',
            disabled ? 'text-[#9E907C] cursor-not-allowed' : 'text-[#1E1A16]',
            'placeholder:text-[#9E907C]',
          ].join(' ')}
        />

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
              'text-[#9E907C] transition-colors duration-150',
              disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-[rgba(168,92,64,.06)] hover:text-[#1E1A16]',
            ].join(' ')}
          >
            <EyeIcon off={showPassword} size={18} />
          </button>
        ) : null}
      </div>

      {error && (
        <p className="mt-[7px] text-[12.5px] font-medium text-[#9A3E3A]">{error}</p>
      )}
    </div>
  );
}
