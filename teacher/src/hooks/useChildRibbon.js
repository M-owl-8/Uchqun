const RIBBON_COLORS = [
  { name: 'lavender',   hex: '#9889B8' },
  { name: 'mint',       hex: '#7FB69A' },
  { name: 'coral',      hex: '#D08573' },
  { name: 'sand',       hex: '#C7A878' },
  { name: 'sky',        hex: '#7CA6C6' },
  { name: 'rose',       hex: '#C58CA5' },
  { name: 'olive',      hex: '#9AA47A' },
  { name: 'peach',      hex: '#D8A47F' },
  { name: 'cornflower', hex: '#8593C4' },
  { name: 'heather',    hex: '#A990B0' },
  { name: 'clay',       hex: '#B98373' },
  { name: 'fern',       hex: '#7FA88A' },
];

export function useChildRibbon(child) {
  if (!child) return RIBBON_COLORS[0];

  if (child.ribbonColor) {
    const found = RIBBON_COLORS.find(c => c.name === child.ribbonColor);
    if (found) return found;
  }

  // Deterministic hash from the child's id
  const id = String(child.id || child._id || '');
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return RIBBON_COLORS[Math.abs(hash) % RIBBON_COLORS.length];
}

export { RIBBON_COLORS };
