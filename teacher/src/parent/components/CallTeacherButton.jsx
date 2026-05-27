import { Phone } from 'lucide-react';

/**
 * CallTeacherButton — tel: link styled as a secondary action.
 * Renders nothing when phone is absent.
 */
const CallTeacherButton = ({ phone, label = "O'qituvchiga qo'ng'iroq" }) => {
  if (!phone) return null;

  return (
    <a
      href={`tel:${phone}`}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-p-brand-300 text-p-brand-700 text-[13px] font-medium hover:bg-p-brand-50 transition-colors"
    >
      <Phone className="w-4 h-4" />
      {label}
    </a>
  );
};

export default CallTeacherButton;
