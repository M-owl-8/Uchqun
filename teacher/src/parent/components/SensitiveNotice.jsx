import { ShieldAlert, Info, AlertTriangle } from 'lucide-react';

const INTENSITY = {
  low: {
    wrap: 'bg-p-sepia-50 border-p-sepia-200',
    icon: Info,
    iconClass: 'text-p-sepia-500',
    textClass: 'text-p-sepia-700',
  },
  medium: {
    wrap: 'bg-p-brand-50 border-p-brand-200',
    icon: ShieldAlert,
    iconClass: 'text-p-brand-600',
    textClass: 'text-p-brand-800',
  },
  high: {
    wrap: 'bg-amber-50 border-amber-200',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
    textClass: 'text-amber-800',
  },
};

/**
 * SensitiveNotice — renders contextual privacy / sensitivity notice.
 *
 * Props:
 *   intensity  'low' | 'medium' | 'high'
 *   children   notice text
 */
const SensitiveNotice = ({ intensity = 'low', children }) => {
  const cfg = INTENSITY[intensity] || INTENSITY.low;
  const Icon = cfg.icon;

  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${cfg.wrap}`}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.iconClass}`} />
      <p className={`text-[13px] leading-snug ${cfg.textClass}`}>{children}</p>
    </div>
  );
};

export default SensitiveNotice;
