/** @type {import('tailwindcss').Config} */
// Tokens do padrão premium Franco Importados (cores em src/index.css, claro/escuro).
const cor = (n) => `rgb(var(--${n}) / <alpha-value>)`
const cores = [
  'bg', 'surface', 'surface-raised', 'surface-sunken', 'surface-field', 'surface-inverse',
  'ink', 'ink-muted', 'ink-subtle', 'ink-inverse', 'line', 'line-soft', 'line-strong', 'speckle',
  'brand', 'brand-hover', 'on-brand', 'gold', 'gold-ink', 'gold-bg', 'hero', 'focus',
  'success', 'success-bg', 'warning', 'warning-bg', 'danger', 'danger-bg', 'info', 'info-bg',
]

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: Object.fromEntries(cores.map((n) => [n, cor(n)])),
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        display: ['Montserrat', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      borderRadius: { none: '0px', sm: '6px', field: '12px', card: '20px', sheet: '22px', pill: '999px' },
      boxShadow: {
        sm: '0 6px 20px rgb(var(--sombra) / 0.04)',
        card: '0 1px 2px rgb(var(--sombra) / 0.04), 0 8px 24px rgb(var(--sombra) / 0.05)',
        'card-hover': '0 1px 2px rgb(var(--sombra) / 0.05), 0 14px 32px rgb(var(--sombra) / 0.09)',
        elevada: '0 8px 20px rgb(var(--sombra) / 0.2)',
        lg: '0 24px 70px rgb(var(--sombra) / 0.3)',
      },
      letterSpacing: { label: '0.12em', eyebrow: '0.16em' },
      height: { control: '50px' },
    },
  },
  plugins: [],
}
