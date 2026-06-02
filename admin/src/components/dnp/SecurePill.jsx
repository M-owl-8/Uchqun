import { LockIcon } from '../icons/LockIcon';

export function SecurePill({ label = '256-bit TLS' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-[7px]',
        'px-[12px] py-[6px] rounded-full',
        'bg-white/[.08] border border-white/[.14]',
        'text-[#F2E9DF] text-[12.5px] font-semibold',
      ].join(' ')}
    >
      <LockIcon size={13} />
      {label}
    </span>
  );
}
