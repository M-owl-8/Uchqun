const Textarea = ({
  label,
  id,
  error,
  hint,
  rows = 4,
  className = '',
  ...props
}) => {
  const fieldId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        rows={rows}
        className={`w-full px-3 py-2.5 text-sm border rounded-lg transition-colors resize-y
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          ${error
            ? 'border-red-400 bg-red-50 text-red-900 placeholder-red-300'
            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
          }
          disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {error && (
        <p id={`${fieldId}-error`} className="mt-1 text-xs text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
};

export default Textarea;
