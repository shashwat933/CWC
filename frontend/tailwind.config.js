// @type {import('tailwindcss').Config} 
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mine': '#ADFF45',
        'mine2': '#1976d2',
        'mine3': '#0A95FF',
        'formPlaceholder': '#808080',
      },
      width: {
        '128': '70rem',
        'size1': '30rem',
        'size2': '19rem',
        '25': '21rem',
        '500': '55rem',
        '17': '17rem',
        






      },
      
      fontFamily: {
        'poppins': 'Poppins, sans-serif'
      },
      
      
      margin: {
        '18': '4.65rem',
      },
      height: {
        'sizeOfBlog': '10rem',
        'sizeOfImage': '20rem',

      },
      screens: {
        'md2': '810px',
        'sm2': '450px',
        'laptop': '1200px',
        'mobile1': { 'max': '1200px' },
        'mobile2':  '600px',

      },
    },
  },
  plugins: [],
}
