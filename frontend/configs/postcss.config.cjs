module.exports = {
	plugins: {
	  'postcss-import': {},
	  'tailwindcss/nesting': {},
	  tailwindcss: { config: './configs/tailwind.config.js' },
	  autoprefixer: {},
	}
  }