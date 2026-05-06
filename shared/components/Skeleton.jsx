const pulse = 'animate-pulse bg-gray-200 rounded';

export function SkeletonLine({ className = '' }) {
  return <div className={`${pulse} h-4 ${className}`} />;
}

export function SkeletonAvatar({ size = 'md' }) {
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14' };
  return <div className={`${pulse} rounded-full ${sizes[size] ?? sizes.md}`} />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="w-1/3" />
          <SkeletonLine className="w-1/4" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} className={i === lines - 1 ? 'w-2/3' : 'w-full'} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} className="flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-4 border-b last:border-0 flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} className={`flex-1 ${c === 0 ? 'w-1/4' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm space-y-2">
      <SkeletonLine className="w-1/2" />
      <div className={`${pulse} h-8 w-1/3`} />
      <SkeletonLine className="w-2/3" />
    </div>
  );
}

export function SkeletonDashboard({ stats = 4, cards = 3 }) {
  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-2 md:grid-cols-${stats} gap-4`}>
        {Array.from({ length: stats }).map((_, i) => <SkeletonStat key={i} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: cards }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  );
}

export function SkeletonList({ items = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
          <SkeletonAvatar />
          <div className="flex-1 space-y-2">
            <SkeletonLine className="w-1/3" />
            <SkeletonLine className="w-1/2" />
          </div>
          <SkeletonLine className="w-16" />
        </div>
      ))}
    </div>
  );
}
