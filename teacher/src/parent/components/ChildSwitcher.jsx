import { useChild } from '../context/ChildContext';

const CHILD_COLORS = [
  'bg-p-brand-100 text-p-brand-800',
  'bg-p-honey-100 text-p-honey-700',
  'bg-p-sepia-100 text-p-sepia-700',
  'bg-p-brand-200 text-p-brand-900',
];

const ChildSwitcher = ({ compact = false }) => {
  const { children = [], selectedChildId, selectChild } = useChild();

  if (!children.length) return null;
  if (children.length === 1 && compact) {
    const child = children[0];
    return (
      <span className="text-[13px] font-medium text-p-sepia-600">
        {child.firstName} {child.lastName}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'flex-wrap'}`}>
      {children.map((child, i) => {
        const selected = child.id === selectedChildId;
        const colorClass = CHILD_COLORS[i % CHILD_COLORS.length];
        return (
          <button
            key={child.id}
            onClick={() => selectChild(child.id)}
            className={`px-3 py-1 rounded-full text-[13px] font-medium transition-all border ${
              selected
                ? 'bg-p-brand-600 text-white border-p-brand-600 shadow-sm'
                : `${colorClass} border-transparent hover:border-p-sepia-300`
            }`}
          >
            {child.firstName}
          </button>
        );
      })}
    </div>
  );
};

export default ChildSwitcher;
