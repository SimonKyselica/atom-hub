// GitHub-style 5×5 mirrored identicon generated from any string.
function hash(input: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function Identicon({ seed, size = 40, className }: { seed: string; size?: number; className?: string }) {
  const h = hash(seed);
  const hue = h % 360;
  const color = `hsl(${hue} 55% 55%)`;
  const rects: [number, number][] = [];
  for (let i = 0; i < 15; i++) {
    if ((hash(seed + i) & 1) === 0) continue;
    const x = Math.floor(i / 5); // columns 0..2, mirrored to 4..2
    const y = i % 5;
    rects.push([x, y]);
    if (x < 2) rects.push([4 - x, y]);
  }
  return (
    <svg
      viewBox="-0.5 -0.5 6 6"
      width={size}
      height={size}
      className={className}
      aria-hidden
      style={{ background: "var(--bg-subtle)", borderRadius: "50%" }}
    >
      {rects.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={color} />
      ))}
    </svg>
  );
}
