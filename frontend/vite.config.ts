import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    ...(process.env.ENABLE_HTTPS === 'true' && {
      https: {
        key: fs.readFileSync(path.join(__dirname, '../ssl/key.pem')),
        cert: fs.readFileSync(path.join(__dirname, '../ssl/cert.pem')),
      }
    }),
  },
  css: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
});