// tailwind.config.cjs
module.exports = {
  darkMode: 'class', // enable class‑based dark mode
  content: ['./index.html', './src/**/*.js', './src/**/*.html'],
  theme: {
    extend: {
      colors: {
        primary: '#1a5c38',
        accent: '#b5841e',
        surface: '#ffffff',
        background: '#f4f1e8',
        danger: '#b83228',
      },
      borderRadius: { lg: '12px', md: '7px', sm: '4px' },
      boxShadow: { glass: '0 4px 30px rgba(0,0,0,0.12)' },
    },
  },
  plugins: [],
};
