import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    cors: {
      // Allowed origins for the Docker‑compose dev setup
      origin: [
        'http://localhost',
        'http://frontend',
        'https://localhost',
        'https://frontend',
      ],
      credentials: true,
    },
  },
});
