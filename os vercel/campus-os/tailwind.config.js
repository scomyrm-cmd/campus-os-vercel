/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class'],
  safelist: ['badge-blue', 'badge-green', 'badge-amber', 'badge-red', 'badge-neutral'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: { sans: ['Inter Variable', 'Noto Sans Arabic Variable', 'sans-serif'] },
      boxShadow: { card: '0 2px 4px rgb(15 23 42 / 0.025)', pop: '0 12px 40px rgb(15 23 42 / 0.12)' },
    },
  },
  plugins: [],
};
