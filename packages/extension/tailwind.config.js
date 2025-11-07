/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}"
  ],
  presets: [
    // Use shared brand tokens for consistent colors across extension and website
    require('@bookmark-assistant/shared/tailwind-preset')
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
