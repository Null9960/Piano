import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@mediapipe/hands', '@mediapipe/camera_utils'],
  },
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
