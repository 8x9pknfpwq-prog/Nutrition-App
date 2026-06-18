/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // LineUp palette — clean, minimal, light
        canvas: '#F5F4F1', // off-white background
        ink: '#1A1A1A', // dark charcoal text
        wait: {
          green: '#1FA463', // 0–10 min
          amber: '#E8902B', // 11–30 min
          red: '#E03B3B', // 30+ min
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)',
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
