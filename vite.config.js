import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.VITE_BASE_URL || '/',
  optimizeDeps: {
    include: ['@unicitylabs/sphere-sdk']
  },
  build: {
    outDir: 'dist',
    target: 'esnext'
  },
  define: {
    global: 'globalThis'
  }
})
