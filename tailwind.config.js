/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans KR"', 'sans-serif'],
        display: ['"Noto Serif KR"', 'serif'],
      },
      colors: {
        primary: {
          50:  '#f0f7ff',
          100: '#e0effe',
          200: '#baddfd',
          300: '#7dc1fc',
          400: '#38a0f8',
          500: '#0e82eb',
          600: '#0264ca',
          700: '#034fa4',
          800: '#074487',
          900: '#0c3a6f',
          950: '#082348',
        },
        sage: {
          50:  '#f4f8f4',
          100: '#e5f0e6',
          200: '#cce1ce',
          300: '#a5c9a9',
          400: '#76aa7d',
          500: '#528d5a',
          600: '#3e7146',
          700: '#335b39',
          800: '#2b4930',
          900: '#243d28',
          950: '#102015',
        },
        warm: {
          50:  '#fefdf8',
          100: '#fdf9ec',
          200: '#faf0cf',
          300: '#f5e4a5',
          400: '#eed373',
          500: '#e5bf47',
          600: '#d1a52e',
          700: '#ae8424',
          800: '#8c6923',
          900: '#735621',
          950: '#3f2d0d',
        }
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(0,0,0,0.08), 0 4px 16px -4px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 16px -4px rgba(0,0,0,0.12), 0 8px 32px -8px rgba(0,0,0,0.10)',
        'sidebar': '4px 0 24px -4px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
