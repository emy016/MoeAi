/**
 * The MoeAI mark, drawn in code.
 *
 * A red M of two overlapping peaks, each a band with a black outline and a
 * white cut between them, traced from the brand image into two filled paths:
 * the black outline layer, then the red layer on top. Being code means it
 * stays sharp at any size, weighs under 1 KB, and can be animated.
 */
type Animation = "none" | "draw" | "pulse" | "orbit";

/** Black outline layer, then red fill layer; both even-odd so the white cut stays open. */
export const MARK_INK = "M35.5 15.6L0 92.3L0 105L60.1 73.3L119.8 105.1L120 92.2L84.3 14.9L60 51.4L35.9 14.9ZM36.6 29.8L5.6 95.9L52.9 69.9L38.5 50.2L20.2 84.9L9.8 91.1L37.4 36.6L60.1 68.5L82.9 36.6L110.2 90.9L100.1 85.4L81.6 50.2L67.2 69.9L114.3 95.7L83.2 29.5L60.1 63.7L36.9 29.5Z";
export const MARK_RED = "M35.7 17.2L1 92.5L1 103.4L60.3 72.4L119 103.6L119 92.5L84.2 16.8L60.1 53L36.1 16.9ZM36.5 27.9L3.8 97.8L39.4 78.7L54.2 70.1L38.3 48.5L19.4 84.5L12 88.7L37.6 38.4L59.9 70L82.8 38.4L108 88.8L100.8 84.6L81.7 48.5L65.9 70.1L116.2 97.8L83.5 27.7L60.1 62.1L36.8 27.6Z";

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
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      className={[ "moe-mark", animation !== "none" ? `moe-${animation}` : "", className ]
        .filter(Boolean)
        .join(" ")}
    >
      {title ? <title>{title}</title> : null}
      <path className="moe-mark-ink" fill="#0e0404" fillRule="evenodd" d={MARK_INK} />
      <path className="moe-mark-red" fill="#ea4349" fillRule="evenodd" d={MARK_RED} />
    </svg>
  );
}

export default Logo;
