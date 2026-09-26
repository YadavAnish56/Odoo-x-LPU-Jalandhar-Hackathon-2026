import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // The frontend calls /api/... and Vite forwards those requests to the backend.
  // Set VITE_API_TARGET in frontend/.env if the backend is not on port 5000.
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '');
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:5000';
  const proxy = { '/api': { target: apiTarget, changeOrigin: true } };

  return {
    server: { port: 3000, open: true, proxy },
    preview: { port: 3000, proxy },
  };
});
