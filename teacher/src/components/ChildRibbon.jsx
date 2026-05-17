import { useChildRibbon } from '../hooks/useChildRibbon';

/**
 * A thin vertical color ribbon that identifies a child.
 * Width: 3px at rest, 6px when active.
 * Only use on child-representing surfaces — never on groups, documents, or admin messages.
 */
export function ChildRibbon({ child, active = false, width = null, className = '' }) {
  const ribbon = useChildRibbon(child);
  const w = width ?? (active ? 6 : 3);

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: 'block',
        width: `${w}px`,
        alignSelf: 'stretch',
        background: ribbon.hex,
        flex: 'none',
        borderRadius: '0 2px 2px 0',
      }}
    />
  );
}
