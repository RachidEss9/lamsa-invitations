import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root = path.resolve(__dirname, "..");

export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^convex\/react$/, replacement: path.resolve(__dirname, "mockConvex.tsx") },
      {
        find: /^@\/convex\/_generated\/api$/,
        replacement: path.resolve(__dirname, "mockApi.ts"),
      },
      { find: "@", replacement: path.resolve(root, "src") },
    ],
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: { input: path.resolve(__dirname, "index.html") },
  },
});
