import path from 'node:path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { ICARUS_API_HOST, ICARUS_API_PORT } from './src/environment'


// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: `${ICARUS_API_HOST}${ICARUS_API_PORT ? `:${ICARUS_API_PORT}` : ''}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
