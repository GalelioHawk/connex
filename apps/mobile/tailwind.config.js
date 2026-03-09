/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        navy:    '#0D1B2A',
        green:   '#006B3C',
        accent:  '#00A86B',
        danger:  '#E53E3E',
        warning: '#F6AD55',
        muted:   '#8A9BB0',
        surface: '#1A2B3C',
        border:  '#2A3F55',
      },
    },
  },
  plugins: [],
};
