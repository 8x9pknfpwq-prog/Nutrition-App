/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // NYC Lines palette — warm sand, near-black ink, signal dots
        canvas: '#F5F2EC', // app background (warm sand)
        ink: '#1A1A18', // near-black text
        froyo: '#E84A8A', // froyo-mode accent (berry pink)
        tile: '#D4C9B0', // khaki icon tile
        darktile: '#1A1A18', // dark variant tile
        muted: '#8A8070', // muted label
        wait: {
          green: '#4CAF50', // 0–10 min
          amber: '#F5A623', // 11–30 min
          red: '#E53935', // 30+ min
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        serif: ['Spectral', 'Georgia', 'ui-serif', 'serif'],
      },
      boxShadow: {
        // Unified Apple-style depth: a soft drop shadow + a hairline ring.
        card: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)',
        sheet: '0 -8px 30px rgba(0,0,0,0.12)',
        pin: '0 4px 10px rgba(0,0,0,0.25)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'toast-in': {
          '0%': { transform: 'translateY(-12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.28s cubic-bezier(0.16,1,0.3,1)',
        'toast-in': 'toast-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
