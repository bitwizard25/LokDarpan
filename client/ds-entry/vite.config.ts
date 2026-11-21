import { defineConfig } from "vite";
import path from "node:path";
const root = path.resolve(__dirname, "..");
export default defineConfig({
  root,
  resolve: { alias: [
    { find: /^~\//, replacement: path.join(root, "app") + "/" },
    { find: "@remix-run/react", replacement: path.join(root, "ds-entry/remix-shim.tsx") },
  ] },
  build: {
    outDir: "ds-dist", emptyOutDir: true, minify: false,
    lib: { entry: path.join(root, "ds-entry/index.ts"), formats: ["es"], fileName: () => "index.es.js" },
    rollupOptions: { external: ["react", "react-dom", "react/jsx-runtime"] },
  },
});
