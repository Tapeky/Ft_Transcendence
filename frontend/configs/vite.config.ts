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
    // API proxy configuration - forward API requests to backend
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      }
    },
    // HTTPS configuration (conditional)
    ...(process.env.ENABLE_HTTPS === 'true' && fs.existsSync('/app/ssl/key.pem') && fs.existsSync('/app/ssl/cert.pem') && {
      https: {
        key: fs.readFileSync('/app/ssl/key.pem'),
        cert: fs.readFileSync('/app/ssl/cert.pem'),
      }
    }),
  },
  // CSS processing configuration
  css: {
    postcss: './configs/postcss.config.cjs',
  },
});