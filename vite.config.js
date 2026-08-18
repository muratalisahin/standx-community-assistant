import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/standx-api": {
        target: "https://perps.standx.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/standx-api/, ""),
      },
    },
  },
});
