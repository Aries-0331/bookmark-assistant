import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

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
            const distDir = 'dist';
            if (existsSync(resolve(distDir, 'src/options/options.html'))) {
              copyFileSync(
                resolve(distDir, 'src/options/options.html'),
                resolve(distDir, 'options.html')
              );
            }
          });
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@bookmark-sync/shared/': new URL('../shared/src/', import.meta.url).pathname,
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  // configure for Chrome extension build
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        options: 'src/options/options.html',
        background: 'src/background/index.ts',
        // content script removed in refactor (legacy injector.ts deleted)
      },
      output: {
        // Sanitize filenames to avoid leading underscores (Chrome disallows files like _commonjsHelpers.js)
        entryFileNames: (chunkInfo) => {
          const name = (chunkInfo && chunkInfo.name) || 'entry';
          const safe = name.replace(/^_+/, 'cjs_');
          return `${safe}.js`;
        },
        chunkFileNames: (chunkInfo) => {
          const name = (chunkInfo && chunkInfo.name) || 'chunk';
          const safe = name.replace(/^_+/, 'cjs_');
          return `${safe}.js`;
        },
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    // Ensure the manifest and assets are copied
    copyPublicDir: true,
    // Service worker compatibility
    target: 'es2017',
    minify: false, // Keep disabled for debugging
  },
  define: {
    // Clean defines - no window polyfills needed
    global: 'globalThis',
  },
});
