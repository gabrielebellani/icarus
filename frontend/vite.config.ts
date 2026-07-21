import path from 'node:path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'


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
        target: `${process.env.ICARUS_API_HOST || 'http://localhost'}${process.env.ICARUS_API_PORT ? `:${process.env.ICARUS_API_PORT}` : ':3465'}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
