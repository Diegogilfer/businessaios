/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary:   '#00E5CC',
        secondary: '#7B5CFF',
        accent:    '#3B8EFF',
        teal:      '#00E5CC',
        violet:    '#7B5CFF',
        blue:      '#3B8EFF',
        amber:     '#FF9A3C',
        red:       '#FF4566',
        green:     '#00C896',
        base:      '#04091A',
        surface:   '#080F1E',
        elevated:  '#0D1629',
        border:    'rgba(255,255,255,0.07)',
        muted:     '#2D3A50',
        dim:       '#6B7FA8',
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        glass: '20px',
      },
    },
  },
  plugins: [],
}
