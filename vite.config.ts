import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [
    react(),
    {
      name: 'modern-font-files',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('@fontsource') && id.endsWith('.css'))
          return code.replace(/,\s*url\([^)]*\.woff['"]?\)\s*format\(['"]woff['"]\)/g, '')
      }
    }
  ],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { outDir: '../../out/renderer', emptyOutDir: true }
})
