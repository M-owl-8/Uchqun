import { LogOut } from 'lucide-react';

/**
 * Shared logout button — text-visible by default across all portals.
 *
 * TP-MOBILE-PASS S3 carved this out as a shared component because
 * admin / reception / teacher each had inline icon-only buttons that
 * hid the action behind a tap/hover. Government already showed the
 * text; now everyone does. Visible text is the default; hide via
 * `iconOnly` only when space is genuinely constrained (e.g. a top-bar
 * row with no horizontal room).
 *
 * Props:
 *   onLogout   — handler (required). Pass `useAuth().logout` from the portal.
 *   label      — translated string (required). Pass `t('nav.logout')`.
 *   variant    — visual style: 'sidebar' (default), 'top', 'inline'.
 *   iconOnly   — boolean (default false). Hides the text label but keeps
 *                aria-label/title for accessibility. Use sparingly.
 *   className  — extra Tailwind classes appended to the default chain.
 */
const LogoutButton = ({
  onLogout,
  label,
  variant = 'sidebar',
  iconOnly = false,
  className = '',
}) => {
  const base =
    'flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-error-500 rounded-md';

  const variantClasses = {
    sidebar:
      'w-full justify-start px-3 py-2 text-[13px] font-medium text-slate-200 hover:text-white hover:bg-white/10',
    top:
      'px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-white/15',
    inline:
      'px-3 py-2 text-[13px] font-semibold text-error-600 hover:text-error-700 hover:bg-error-50',
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      className={`${base} ${variantClasses[variant] || variantClasses.sidebar} ${className}`}
      aria-label={label}
      title={label}
    >
      <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      {!iconOnly && (
        <span className="truncate">{label}</span>
      )}
    </button>
  );
};

export default LogoutButton;
