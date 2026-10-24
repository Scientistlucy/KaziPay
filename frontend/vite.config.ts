import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // Route tests render lazily loaded pages; the first load compiles their chunk, which can exceed the 5s default.
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', globals: true, testTimeout: 20000 },
})