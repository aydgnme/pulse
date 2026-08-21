export const COLORS = {
  bg: '#070B14',
  ring: 'rgba(234, 242, 255, 0.10)',
  needle: '#5EEAD4',
  target: '#FF5C7A',
  text: '#EAF2FF',
  dim: '#8B93A7',
  danger: '#FF5C7A',
} as const;

/** Needle colour drifts from calm mint to hot amber as the speed climbs. */
export function tensionColor(t: number): string {
  const mint = [94, 234, 212];
  const amber = [255, 180, 84];
  const c = mint.map((m, i) => Math.round(m + (amber[i] - m) * Math.min(t, 1)));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
