/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url))

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: { index: src('index.ts'), chat: src('chat/index.ts'), vue: src('vue/index.ts') },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
      cssFileName: 'style',
    },
    rollupOptions: { external: ['vue'] },
    sourcemap: true,
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
})
