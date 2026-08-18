import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function jsMime() {
  return {
    name: "js-mime",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const send = res.setHeader.bind(res);
        res.setHeader = (name, value) => {
          if (String(name).toLowerCase() === "content-type" && /javascript/i.test(String(value))) {
            return send("Content-Type", "application/javascript; charset=utf-8");
          }
          return send(name, value);
        };
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [jsMime(), react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    cors: true,
    hmr: {
      host: "127.0.0.1",
      protocol: "ws",
      port: 5173,
      clientPort: 5173,
    },
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
