/** @type {import('tailwindcss').Config} */
// Tokens do design system Franco Importados (cores em src/index.css, light/dark).
const cor = (n) => `rgb(var(--${n}) / <alpha-value>)`
const cores = [
  'bg', 'surface', 'surface-raised', 'surface-inverse', 'ink', 'ink-muted', 'ink-subtle', 'ink-inverse',
  'line', 'line-strong', 'speckle', 'brand', 'brand-hover', 'on-brand', 'focus',
  'success', 'success-bg', 'warning', 'warning-bg', 'danger', 'danger-bg', 'info', 'info-bg',
]

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: Object.fromEntries(cores.map((n) => [n, cor(n)])),
      fontFamily: {
        sans: ['Jost', 'Futura', '"Century Gothic"', 'system-ui', 'sans-serif'],
        display: ['"Bodoni Moda"', 'Didot', '"Bodoni 72"', 'Georgia', 'serif'],
      },
      borderRadius: { none: '0px', sm: '2px', pill: '999px' },
      boxShadow: {
        sm: '0 1px 2px rgba(10,10,10,0.06)',
        lg: '0 16px 40px rgba(10,10,10,0.12)',
      },
      letterSpacing: { label: '0.14em', eyebrow: '0.24em' },
      height: { control: '48px' },
    },
  },
  plugins: [],
}
