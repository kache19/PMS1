/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx,js,jsx}',
    './services/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontSize: {
        'xs': ['0.65rem', { lineHeight: '0.9rem' }],
        'sm': ['0.75rem', { lineHeight: '1rem' }],
        'base': ['0.875rem', { lineHeight: '1.25rem' }],
        'lg': ['1rem', { lineHeight: '1.5rem' }],
        'xl': ['1.125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.25rem', { lineHeight: '1.875rem' }],
      },
      spacing: {
        '0.5': '0.125rem',
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
      }
    },
  },
  plugins: [],
}
