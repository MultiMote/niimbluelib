import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  optimizeDeps: {
    include: ["@mmote/niimbluelib"], // Fix browser error when using `npm link @mmote/niimbluelib`
  },
  resolve: {
    preserveSymlinks: true, // Fix build error when using `npm link @mmote/niimbluelib`
    alias: {
      $: resolve(import.meta.dirname, "./src")
    },
  }
});
