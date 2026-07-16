import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    origin: "https://localhost",
    watch: {
      usePolling: true,
      interval: 100,
    },
    hmr: {
      protocol: "wss",
      host: "localhost",
      port: 443,
      clientPort: 443,
      path: "/ws",
    },
  },
});
