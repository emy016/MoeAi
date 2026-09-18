/**
 * The MoeAI mark, drawn in code.
 *
 * Two stroked triangles that cross to form an M, over a cyan → magenta → amber
 * gradient with a neon bloom — the logo, but as geometry rather than a JPEG.
 * Being code means it stays sharp at any size, weighs about 2 KB instead of
 * 90 KB, inherits the page's theme, and can be animated.
 *
 * Every instance needs its own gradient and filter ids, or a second logo on the
 * page silently adopts the first one's paint. Hence `uid`.
 */
import { useId } from "react";

type Animation = "none" | "draw" | "pulse" | "orbit";

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
        <linearGradient id={grad} x1="0" y1="120" x2="120" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="34%" stopColor="#c026d3" />
          <stop offset="62%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <filter id={glow} x="-45%" y="-45%" width="190%" height="190%">
          <feGaussianBlur stdDeviation="3.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Left and right strokes cross in the middle; together they read as M. */}
      <g
        fill="none"
        stroke={`url(#${grad})`}
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${glow})`}
      >
        <path d="M8 110 L38 16 L68 110 Z" />
        <path d="M52 110 L82 16 L112 110 Z" />
      </g>
    </svg>
  );
}

export default Logo;
