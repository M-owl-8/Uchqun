const Radio = ({ label, id, name, value, checked, onChange, disabled, className = '' }) => {
  const fieldId = id || `${name}-${value}`;

  return (
    <label htmlFor={fieldId} className={`inline-flex items-center gap-2 cursor-pointer ${className}`}>
      <input
        type="radio"
        id={fieldId}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="w-4 h-4 border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      {label && (
        <span className="text-sm text-gray-700 select-none">{label}</span>
      )}
    </label>
  );
};

export default Radio;
