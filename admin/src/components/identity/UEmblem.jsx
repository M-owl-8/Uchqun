export function UEmblem({ size = 40 }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: '#A85C40',
        color: '#F2E9DF',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 700,
        fontSize: Math.round(size * 0.52),
        letterSpacing: '-0.06em',
        flexShrink: 0,
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      U
    </span>
  );
}
