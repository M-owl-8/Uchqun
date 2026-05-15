const Select = ({
  label,
  id,
  options = [],
  error,
  placeholder,
  className = '',
  ...props
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3 py-2.5 text-sm border rounded-lg transition-colors appearance-none bg-white
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          ${error
            ? 'border-red-400 text-red-900'
            : 'border-gray-300 text-gray-900'
          }
          disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-describedby={error ? `${selectId}-error` : undefined}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(({ value, label: optLabel }) => (
          <option key={value} value={value}>{optLabel}</option>
        ))}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Select;
