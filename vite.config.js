import { defineConfig } from 'vite';

// IMPORTANT: base: './' is required for Capacitor WebView
// Absolute paths break inside the Android WebView. This makes asset paths relative
// so they resolve correctly when loaded from the file:// (or https://localhost) scheme.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split p5.js into its own chunk — it's heavy and rarely changes
        manualChunks: {
          p5: ['p5']
        }
      }
    }
  },
  server: {
    host: true, // expose on LAN — useful for live reload on real device
    port: 5173
  }
});
