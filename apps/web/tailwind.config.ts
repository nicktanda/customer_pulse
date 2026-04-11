import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {},
  },
  // Bootstrap already ships a CSS reset ("Reboot"); skipping Tailwind preflight avoids conflicts.
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};

export default config;
