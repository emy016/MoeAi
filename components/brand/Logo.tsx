/**
 * The MoeAI mark, drawn in code.
 *
 * One continuous zigzag — up, down, up, down — outlined rather than filled, so
 * what you see is the band's two edges with the dark between them. The gradient
 * runs straight across: cyan at the left foot, magenta at the first peak, red
 * in the valley, amber at the right foot.
 *
 * Being code means it stays sharp at any size, weighs about 2 KB instead of
 * 90 KB, inherits the page's theme, and can be animated.
 *
 * Every instance needs its own gradient and filter ids, or a second logo on the
 * page silently adopts the first one's paint. Hence `uid`.
 */
import { useId } from "react";

type Animation = "none" | "draw" | "pulse" | "orbit";

/** Outer contour, then the inner contour walked back — one closed path. */
const MARK = "M 2.9 101.1 L 37.5 20.1 L 60.2 66.8 L 82.7 20.1 L 116.1 100.6 L 102.4 94.9 L 82.3 34.3 L 60.2 81.0 L 37.8 34.3 L 16.7 95.6 Z";

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
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        fill="none"
        stroke={`url(#${grad})`}
        strokeWidth="3.4"
        strokeLinejoin="miter"
        strokeMiterlimit="12"
        filter={`url(#${glow})`}
        d={MARK}
      />
    </svg>
  );
}

export default Logo;
