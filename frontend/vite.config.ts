import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Detect Replit environment — only apply Replit-specific HMR settings there.
// Locally, Vite uses its own default HMR on the same port as the dev server.
const isReplit = !!process.env.REPL_ID;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5000,
    host: "0.0.0.0",
    allowedHosts: true,
    // On Replit the site is served behind a TLS reverse proxy on port 443,
    // so the HMR WebSocket must use wss:// on port 443.
    // Locally there is no such proxy — use Vite's built-in HMR defaults.
    hmr: isReplit
      ? { clientPort: 443, protocol: "wss" }
      : true,
    proxy: {
      "/api":    { target: "http://localhost:8000", changeOrigin: true },
      "/auth":   { target: "http://localhost:8000", changeOrigin: true },
      "/health": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
