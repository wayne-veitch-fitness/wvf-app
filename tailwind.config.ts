import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // WVF brand palette — to be refined in Phase 5 (Polish & Launch)
      colors: {
        wvf: {
          black: '#1a1a1a',
          white: '#ffffff',
          bg: '#f5f5f4',
          surface: '#ffffff',
          border: '#e5e5e3',
          muted: '#6b6b6b',
          subtle: '#9a9a9a',
          accent: '#3b3b3b',
          'accent-soft': '#eeeeec',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Inter',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

export default config
