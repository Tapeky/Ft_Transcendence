import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

// Vite Configuration

export default defineConfig({
  plugins: [react()],
  // Development server configuration
  server: {
    host: '0.0.0.0',
    port: 3000,
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