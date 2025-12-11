import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import webExtension from '@samrum/vite-plugin-web-extension';
import manifestJson from './public/manifest.json';
const manifest: any = manifestJson as any;

export default defineConfig({
  plugins: [
    react(),
    webExtension({ manifest }),
    // Custom plugin to handle Chrome extension build
    {
      name: 'chrome-extension-build',
      writeBundle() {
        import('fs').then(({ existsSync, cpSync, copyFileSync }) => {
          import('path').then(({ resolve }) => {
            const distDir = 'dist';
            const optionsSrc = resolve(distDir, 'src/options/options.html');
            const optionsDst = resolve(distDir, 'options.html');
            if (existsSync(optionsSrc)) {
              copyFileSync(optionsSrc, optionsDst);
            }
            // Ensure assets are available in dist; copy from src as they are referenced in manifest
            const assetsDir = resolve('src/assets');
            if (existsSync(assetsDir)) {
              cpSync(assetsDir, resolve(distDir, 'assets'), { recursive: true });
            }
          });
        });
      },
    },
  ],
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
      },
    },
    copyPublicDir: true,
    target: 'es2017',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  define: {
    // Clean defines - no window polyfills needed
    global: 'globalThis',
  },
});
