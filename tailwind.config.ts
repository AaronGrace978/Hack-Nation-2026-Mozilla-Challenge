import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    './sidebar.html',
  ],
  theme: {
    extend: {
      colors: {
        // Firefox flame accent — warm orange → red
        nexus: {
          50: '#fff4e6',
          100: '#ffe8cc',
          200: '#ffd8a8',
          300: '#ffc078',
          400: '#ff922b',   // Primary accent — Firefox orange
          500: '#ff6b35',
          600: '#fd7e14',   // Button / active state
          700: '#e8590c',
          800: '#d9480f',
          900: '#c92a2a',
          950: '#862e2e',
        },
        // Firefox Proton light text
        surface: {
          0: '#fbfbfe',
          1: '#f0f0f4',
          2: '#e0e0e6',
          3: '#cfcfd8',
          4: '#b1b1b9',
        },
        // Firefox Proton dark backgrounds
        dark: {
          0: '#1c1b22',     // Main background
          1: '#2b2a33',     // Surface
          2: '#32313c',     // Elevated surface
          3: '#3f3e47',     // Borders / dividers
          4: '#5b5b66',     // Muted text
        },
        // Extra Mozilla accents for variety
        moz: {
          blue: '#0060df',
          purple: '#9059ff',
          green: '#058b00',
          red: '#ff4f5e',
          yellow: '#ffbd4f',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
