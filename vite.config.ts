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
      generateBundle(_options, bundle) {
        // Move HTML files to root and rename them
        for (const fileName in bundle) {
          const file = bundle[fileName]
          if (fileName.includes('popup') && fileName.endsWith('.html')) {
            delete bundle[fileName]
            bundle['popup.html'] = file
          }
          if (fileName.includes('options') && fileName.endsWith('.html')) {
            delete bundle[fileName]
            bundle['options.html'] = file
          }
        }
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