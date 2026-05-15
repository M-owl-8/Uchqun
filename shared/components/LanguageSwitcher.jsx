const LanguageSwitcher = ({
  value = 'uz',
  onChange,
  icon: Icon = null,
  selectClassName = 'px-2 py-1 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500',
  wrapperClassName = '',
  label = 'Select language',
}) => {
  const select = (
    <select value={value} onChange={onChange} className={selectClassName} aria-label={label}>
      <option value="uz">UZ</option>
      <option value="ru">RU</option>
      <option value="en">EN</option>
    </select>
  );

  if (Icon || wrapperClassName) {
    return (
      <div className={wrapperClassName || 'flex items-center gap-2'}>
        {Icon && <Icon className="w-4 h-4 text-gray-600" />}
        {select}
      </div>
    );
  }

  return select;
};

export default LanguageSwitcher;
