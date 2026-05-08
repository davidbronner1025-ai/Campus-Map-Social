import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

const rawPort = process.env.PORT || "5173";
const port = Number(rawPort);
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  plugins: [react(), tailwindcss(), runtimeErrorOverlay(), mockupPreviewPlugin()],
  base: basePath,
  server: {
    host: "0.0.0.0",
    port,
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
