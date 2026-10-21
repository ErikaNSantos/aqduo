import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// No GitHub Pages o site fica em /<nome-do-repo>/; o workflow passa esse caminho em VITE_BASE.
export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
});
