import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        'accent-green': '#10b981',
        'aura-blue': '#2563eb',
        'aura-teal': '#10b981',
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        playfair: ['"Playfair Display"', 'serif'],
        sans: ['"Public Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
