import type { MetadataRoute } from "next";

// Icons point at the generated /icon and /apple-icon routes rather than static
// PNGs, so there is one source of truth for the mark.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EduMoe — curriculum-aware AI tutoring",
    short_name: "EduMoe",
    description: "MoeAI knows your syllabus, not just the internet.",
    start_url: "/",
    display: "standalone",
    background_color: "#07070c",
    theme_color: "#07070c",
    orientation: "portrait",
    categories: ["education"],
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
