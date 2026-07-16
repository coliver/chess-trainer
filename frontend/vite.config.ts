import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    origin: 'https://localhost',
    watch: { usePolling: true, interval: 100 },
    hmr: {
      protocol: 'wss',
      host: 'localhost',
      port: 5173,        // Vite’s internal port
      clientPort: 443,  // external/public port
      path: '/vite-hmr', // keep default-ish behavior
    },
  },
});
