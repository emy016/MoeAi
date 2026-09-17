// Favicon, generated at build time from the EduMoe mark — the double-chevron
// "M" in the cyan → magenta → amber gradient. No binary asset to keep in sync.
import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 14,
        }}
      >
        <svg width="46" height="46" viewBox="0 0 100 100" fill="none">
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
            strokeWidth="13"
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
