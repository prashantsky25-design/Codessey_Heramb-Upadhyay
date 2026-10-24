/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0a0b0d',
          card: '#121417',
          cardHover: '#181b1f',
          border: '#22262c',
          borderSubtle: '#1b1e24',
          accent: '#06b6d4', // cyan-500
          accentGlow: 'rgba(6, 182, 212, 0.15)',
          danger: '#f43f5e', // rose-500
          success: '#10b981', // emerald-500
          warning: '#f59e0b', // amber-500
          textMuted: '#94a3b8',
          textBright: '#f8fafc'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    },
  },
  plugins: [],
}
