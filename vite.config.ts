import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
  headers: {
    // Allow camera access from the dev server iframe
    'Permissions-Policy': 'camera=(self)',
    },
  },
  optimizeDeps: {
    include: [
      '@tensorflow/tfjs',
      '@tensorflow/tfjs-backend-webgl',
      '@tensorflow-models/hand-pose-detection',
    ],
  },
})
