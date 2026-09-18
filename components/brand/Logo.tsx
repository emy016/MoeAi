/**
 * The MoeAI mark, drawn in code.
 *
 * Two overlapping triangles, each drawn as a nested outline — so every edge
 * reads as a pair of neon lines, and the two long bars cross below the valley.
 * The gradient runs straight across: cyan at the left foot, magenta at the
 * first peak, red at the crossing, amber at the right foot.
 *
 * Being code means it stays sharp at any size, weighs about 2 KB instead of
 * 90 KB, inherits the page's theme, and can be animated.
 *
 * Every instance needs its own gradient and filter ids, or a second logo on the
 * page silently adopts the first one's paint. Hence `uid`.
 */
import { useId } from "react";

type Animation = "none" | "draw" | "pulse" | "orbit";

/** Two overlapping triangles, each an inner contour followed by an outer one. */
const MARK = [
  "M 9.3 95.6 L 37.8 25.2 L 58.0 64.8 Z M 0.3 106.4 L 37.0 11.2 L 66.4 67.2 Z",
  "M 62.0 64.8 L 82.2 25.2 L 110.7 95.6 Z M 53.6 67.2 L 83.0 11.2 L 119.7 106.4 Z",
];

const STOPS: [string, string][] = [
  ["0%", "#22d3ee"], ["16%", "#3b82f6"], ["32%", "#d946ef"],
  ["50%", "#f43f5e"], ["68%", "#f97316"], ["100%", "#fde047"],
];

export function Logo({
  size = 48,
  animation = "none",
  title = "MoeAI",
  className,
}: {
  size?: number;
  animation?: Animation;
  title?: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const grad = `moe-grad-${uid}`;
  const glow = `moe-glow-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
      className={[ "moe-mark", animation !== "none" ? `moe-${animation}` : "", className ]
        .filter(Boolean)
        .join(" ")}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="120" y2="0" gradientUnits="userSpaceOnUse">
          {STOPS.map(([offset, color]) => <stop key={offset} offset={offset} stopColor={color} />)}
        </linearGradient>
        <filter id={glow} x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="1.7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g
        fill="none"
        stroke={`url(#${grad})`}
        strokeWidth="2.4"
        strokeLinejoin="miter"
        strokeMiterlimit="8"
        filter={`url(#${glow})`}
      >
        {MARK.map(d => <path key={d} d={d} />)}
      </g>
    </svg>
  );
}

export default Logo;
