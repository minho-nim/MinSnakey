import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  server: {
    port: 5173,
    proxy: {
      "/c": { target: "http://127.0.0.1:8787", changeOrigin: false },
      "/og.png": { target: "http://127.0.0.1:8787", changeOrigin: false },
    },
  },
  build: { outDir: "dist" },
});
