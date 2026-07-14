import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
    hmr: {
      host: 'localhost',
      port: 443,
      protocol: 'wss',
    },
    allowedHosts: ['localhost', 'host.docker.internal']
  },
});
