const Tabs = ({ tabs, activeTab, onChange, className = '' }) => (
  <div className={`flex border-b border-gray-200 ${className}`} role="tablist">
    {tabs.map(({ id, label, count }) => {
      const active = id === activeTab;
      return (
        <button
          key={id}
          role="tab"
          aria-selected={active}
          onClick={() => onChange(id)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
            ${active
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          {label}
          {count !== undefined && (
            <span className={`ml-2 px-1.5 py-0.5 text-[11px] font-bold rounded-badge
              ${active ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
              {count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default Tabs;
