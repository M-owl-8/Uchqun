import { LockIcon } from '../icons/LockIcon';

/**
 * DNP SecurePill — glass pill for use on dark panel surfaces.
 *
 * Props:
 *   label  string  (default "256-bit TLS")
 */
export function SecurePill({ label = '256-bit TLS' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-[7px]',
        'px-[12px] py-[6px] rounded-full',
        'bg-white/[.08] border border-white/[.14]',
        'text-[#EAF1E7] text-[12.5px] font-semibold',
      ].join(' ')}
    >
      <LockIcon size={13} />
      {label}
    </span>
  );
}
