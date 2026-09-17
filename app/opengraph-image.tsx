// Social preview card, 1200x630. Generated rather than designed by hand so it
// can never drift from the product's own wording.
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "EduMoe — MoeAI, the tutor that knows your syllabus";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "70px 80px",
          background: "#07070c",
          backgroundImage:
            "radial-gradient(900px 500px at 8% -10%, rgba(56,189,248,0.22), transparent 60%), radial-gradient(800px 500px at 95% 8%, rgba(229,55,154,0.22), transparent 60%)",
          color: "#f2f2f7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 36 }}>
          <svg width="58" height="58" viewBox="0 0 100 100" fill="none">
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
          <span style={{ fontSize: 34, letterSpacing: 2, color: "rgba(242,242,247,0.65)" }}>
            EDUMOE · MOEAI
          </span>
        </div>

        <div style={{ fontSize: 68, lineHeight: 1.12, fontWeight: 700, maxWidth: 960 }}>
          The tutor that actually knows what you&rsquo;re studying
        </div>

        <div
          style={{
            fontSize: 31,
            lineHeight: 1.45,
            color: "rgba(242,242,247,0.66)",
            marginTop: 30,
            maxWidth: 940,
          }}
        >
          Answers from your own lecture material, in Egyptian Arabic, Franco-Arabic
          or English — and remembers where you got stuck.
        </div>
      </div>
    ),
    size,
  );
}
