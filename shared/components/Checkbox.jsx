const Checkbox = ({ label, id, error, className = '', ...props }) => {
  const fieldId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <input
        type="checkbox"
        id={fieldId}
        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        aria-describedby={error ? `${fieldId}-error` : undefined}
        {...props}
      />
      {label && (
        <label htmlFor={fieldId} className="text-sm text-gray-700 cursor-pointer select-none">
          {label}
        </label>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Checkbox;
