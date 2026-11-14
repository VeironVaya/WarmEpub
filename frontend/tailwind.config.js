/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          DEFAULT: '#F5EFEB',
          deep: '#ECE4DC',
          light: '#FAF7F2',
        },
        surface: {
          DEFAULT: '#FAF7F2',
          pure: '#FFFFFF',
        },
        terracotta: {
          DEFAULT: '#D3746B',
          hover: '#C2655C',
          light: '#F9ECEB',
        },
        tealAccent: {
          DEFAULT: '#4B8B9B',
          hover: '#3D7381',
          light: '#E7F2F4',
        },
        espresso: {
          DEFAULT: '#2D2825',
          muted: '#7C746E',
          soft: '#4A433E',
        },
        sandBorder: '#E5DDD3',
      },
      fontFamily: {
        sans: [
          'Inter',
          'Roboto',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        serif: [
          'Charter',
          'Merriweather',
          'Lora',
          'Georgia',
          'serif',
        ],
      },
      boxShadow: {
        warm: '0 4px 20px -2px rgba(45, 40, 37, 0.06)',
        'warm-hover': '0 12px 28px -4px rgba(45, 40, 37, 0.10)',
        'warm-popover': '0 16px 36px -6px rgba(45, 40, 37, 0.16)',
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
    },
  },
  plugins: [],
}

