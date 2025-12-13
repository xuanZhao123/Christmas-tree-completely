import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  optimizeDeps: {
    include: [
      '@tensorflow/tfjs-core',
      '@tensorflow/tfjs-converter',
      '@tensorflow/tfjs-backend-webgl',
      '@tensorflow/tfjs-backend-cpu',
      '@tensorflow-models/handpose'
    ]
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    commonjsOptions: {
      include: [/node_modules/]
    }
  }
});