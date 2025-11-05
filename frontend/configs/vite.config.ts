import { defineConfig } from 'vite';
import fs from 'fs';

// Vite Configuration for Vanilla TypeScript

const IP_ACCESS = process.env.IP_ACCESS;

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
        target: `https://${IP_ACCESS}:8443`,
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: `wss://${IP_ACCESS}:8443`,
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    },
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
    postcss: './configs/postcss.config.cjs',
  },
});