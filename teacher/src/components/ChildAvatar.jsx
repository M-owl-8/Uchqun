import { useChildRibbon } from '../hooks/useChildRibbon';

const SIZES = {
  xs:  { px: 28,  text: 10 },
  sm:  { px: 32,  text: 11 },
  md:  { px: 40,  text: 13 },
  lg:  { px: 56,  text: 16 },
  xl:  { px: 80,  text: 22 },
  '2xl': { px: 120, text: 36 },
};

/**
 * Child avatar — ribbon color background + white initials.
 * Falls back to initials when no photoUrl.
 * The avatar IS the ribbon's expression in circle/square form.
 */
export function ChildAvatar({ child, size = 'md', shape = 'circle' }) {
  const ribbon = useChildRibbon(child);
  const { px, text } = SIZES[size] || SIZES.md;
  const radius = shape === 'square' ? '16px' : '9999px';

  const first = (child?.firstName || '').trim();
  const last  = (child?.lastName  || '').trim();
  const initials = `${first[0] || ''}${last[0] || ''}`.toUpperCase();
  const fullName = child?.fullName || `${first} ${last}`.trim();

  if (child?.photoUrl) {
    return (
      <img
        src={child.photoUrl}
        alt={fullName}
        width={px}
        height={px}
        className="object-cover ring-2 ring-surface"
        style={{ width: px, height: px, borderRadius: radius }}
      />
    );
  }

  return (
    <div
      aria-label={fullName}
      className="grid place-items-center text-surface font-semibold"
      style={{
        width: px,
        height: px,
        fontSize: `${text}px`,
        background: ribbon.hex,
        borderRadius: radius,
        flexShrink: 0,
      }}
    >
      {initials || '?'}
    </div>
  );
}
