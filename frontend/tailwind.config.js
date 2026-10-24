/** @type {import('tailwindcss').Config} */
const brand = (step) => `rgb(var(--brand-${step}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand steps are CSS variables so the client portal can re-theme per tenant (docs/DESIGN_SYSTEM.md 2.1).
        brand: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [step, brand(step)])),
        ink: {
          0: '#FFFFFF', 25: '#FAFBFC', 50: '#F5F7FA', 100: '#EDF0F5', 200: '#E1E6EE', 300: '#C9D1DD',
          400: '#98A3B5', 500: '#66728A', 600: '#4A556B', 700: '#343E52', 800: '#202939', 900: '#121826',
        },
        success: { DEFAULT: '#0F7B53', soft: '#E7F6EF', line: '#B4E3CD' },
        warning: { DEFAULT: '#A15C07', soft: '#FEF5E6', line: '#F8D9A0' },
        danger: { DEFAULT: '#C8321F', soft: '#FDEEEC', line: '#F5C2BA', hover: '#A82918' },
        chart: { 1: '#1A41BA', 2: '#5A8CF7' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      fontSize: {
        display: ['30px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '700' }],
        title: ['22px', { lineHeight: '30px', letterSpacing: '-0.015em', fontWeight: '650' }],
        heading: ['17px', { lineHeight: '26px', letterSpacing: '-0.01em', fontWeight: '600' }],
        subheading: ['15px', { lineHeight: '22px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '22px' }],
        small: ['13px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        overline: ['11px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '600' }],
      },
      borderRadius: { sm: '6px', md: '8px', lg: '12px', xl: '16px' },
      boxShadow: {
        xs: '0 1px 2px rgb(18 24 38 / 0.05)',
        card: '0 1px 2px rgb(18 24 38 / 0.04), 0 1px 3px rgb(18 24 38 / 0.06)',
        pop: '0 12px 32px -8px rgb(18 24 38 / 0.16), 0 2px 6px rgb(18 24 38 / 0.06)',
        modal: '0 24px 64px -16px rgb(18 24 38 / 0.32)',
        focus: '0 0 0 3px rgb(var(--brand-600) / 0.22)',
        'focus-danger': '0 0 0 3px rgb(200 50 31 / 0.18)',
      },
      transitionTimingFunction: { out: 'cubic-bezier(.2,.8,.2,1)' },
      transitionDuration: { fast: '120ms', base: '180ms', slow: '240ms' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'overlay-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'content-in': { from: { opacity: '0', transform: 'translateY(4px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        'sheet-in': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        'drawer-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
        'toast-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'overlay-in': 'overlay-in 180ms ease-out',
        'content-in': 'content-in 240ms cubic-bezier(.2,.8,.2,1)',
        'sheet-in': 'sheet-in 240ms cubic-bezier(.2,.8,.2,1)',
        'drawer-in': 'drawer-in 240ms cubic-bezier(.2,.8,.2,1)',
        'toast-in': 'toast-in 180ms cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
}
