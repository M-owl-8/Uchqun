import { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  color: string;
  onClick?: () => void;
}

export function QuickActionCard({ icon: Icon, title, subtitle, color, onClick }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="glass rounded-2xl p-5 flex items-center gap-4 w-full text-left hover:shadow-medium transition-all duration-300 active:scale-[0.98]"
      style={{ minHeight: '80px' }}
    >
      <div
        className="flex items-center justify-center rounded-xl flex-shrink-0"
        style={{
          width: '56px',
          height: '56px',
          backgroundColor: `${color}20`,
        }}
      >
        <Icon style={{ strokeWidth: 'var(--icon-stroke)' }} size={28} className="text-[#2E3A59]" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[#2E3A59] mb-1">{title}</h3>
        <p className="text-sm text-[#5A6B8C]">{subtitle}</p>
      </div>
    </button>
  );
}
