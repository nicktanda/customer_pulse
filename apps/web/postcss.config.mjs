/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    // Standard Tailwind + Next pair: adds vendor prefixes so layout looks right in all browsers.
    autoprefixer: {},
  },
};

export default config;
