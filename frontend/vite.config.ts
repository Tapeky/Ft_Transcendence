import { defineConfig } from 'vite';
import fs from 'fs';

// Vite Configuration for Vanilla TypeScript

export default defineConfig({
  plugins: [],
  build: {
    outDir: 'build'
  },
  // Development server configuration
  server: {
    host: '0.0.0.0',
    port: 3000,
    historyApiFallback: true, // SPA routing: redirect unknown routes to index.html
    // HTTPS configuration (conditional)
    ...(process.env.ENABLE_HTTPS === 'true' && {
      https: {
        key: fs.readFileSync('/app/ssl/key.pem'),
        cert: fs.readFileSync('/app/ssl/cert.pem'),
      }
    }),
  },
  // CSS processing configuration
  css: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
});