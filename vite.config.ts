import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to handle Chrome extension build
    {
      name: 'chrome-extension-build',
      writeBundle() {
        // Copy HTML files to root with correct names after build
        import('fs').then(({ copyFileSync, existsSync }) => {
          import('path').then(({ resolve }) => {
            const distDir = 'dist'
            
            if (existsSync(resolve(distDir, 'src/popup/popup.html'))) {
              copyFileSync(
                resolve(distDir, 'src/popup/popup.html'),
                resolve(distDir, 'popup.html')
              )
            }
            
            if (existsSync(resolve(distDir, 'src/options/options.html'))) {
              copyFileSync(
                resolve(distDir, 'src/options/options.html'),
                resolve(distDir, 'options.html')
              )
            }
          })
        })
      }
    }
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  // configure for Chrome extension build
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: 'src/popup/popup.html',
        options: 'src/options/options.html',
        background: 'src/background/index.ts',
        content: 'src/content/injector.ts'
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    // Ensure the manifest and assets are copied
    copyPublicDir: true
  }
})