// Home-screen icon for iOS. Same mark, more padding, no rounded corners —
// iOS applies its own mask.
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07070c",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="100" y2="100">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#e5379a" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>
          <path
            d="M6 88 L28 16 L50 58 L72 16 L94 88"
            stroke="url(#g)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
    ),
    size,
  );
}
