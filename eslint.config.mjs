import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next's recommended rules for the web app. The Expo app (mobile/), the
// built bundle and static pages under public/, and one-off scripts are not
// linted here.
const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The React compiler rules flag working patterns (state set inside an
      // effect, refs read in render). Keep them visible, but as warnings until
      // those components are refactored on purpose.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
    },
  },
  { ignores: [".next/**", "node_modules/**", "mobile/**", "public/**", "scripts/**", "supabase/**", "next-env.d.ts"] },
];

export default config;
