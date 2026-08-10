/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in':        { from: { opacity: '0', transform: 'translateY(8px)' },  to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in-up':     { from: { opacity: '0', transform: 'translateY(28px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in-down':   { from: { opacity: '0', transform: 'translateY(-20px)' },to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in':       { from: { opacity: '0', transform: 'scale(0.93)' },      to: { opacity: '1', transform: 'scale(1)' } },
        'slide-in-left':  { from: { opacity: '0', transform: 'translateX(-36px)' },to: { opacity: '1', transform: 'translateX(0)' } },
        'slide-in-right': { from: { opacity: '0', transform: 'translateX(36px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'float':          { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        'glow-pulse':     { '0%, 100%': { boxShadow: '0 0 16px hsl(184 80% 25% / 0.3)' }, '50%': { boxShadow: '0 0 48px hsl(184 80% 25% / 0.6)' } },
        'shimmer':        { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        'blink':          { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        'fade-in':         'fade-in 0.3s ease-out both',
        'fade-in-up':      'fade-in-up 0.5s cubic-bezier(0,0,0.2,1) both',
        'fade-in-down':    'fade-in-down 0.5s cubic-bezier(0,0,0.2,1) both',
        'scale-in':        'scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        'slide-in-left':   'slide-in-left 0.5s cubic-bezier(0,0,0.2,1) both',
        'slide-in-right':  'slide-in-right 0.5s cubic-bezier(0,0,0.2,1) both',
        'float':           'float 3s cubic-bezier(0.25,0.1,0.25,1) infinite',
        'glow-pulse':      'glow-pulse 2s cubic-bezier(0.25,0.1,0.25,1) infinite',
        'shimmer':         'shimmer 1.5s linear infinite',
        'blink':           'blink 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
