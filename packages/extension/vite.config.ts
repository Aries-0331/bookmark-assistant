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
        import('fs').then(({ existsSync, cpSync, copyFileSync, readFileSync, writeFileSync, readdirSync, renameSync }) => {
          import('path').then(({ resolve }) => {
            const distDir = 'dist';
            // Copy manifest.json first
            const manifestSrc = resolve('public/manifest.json');
            const manifestDst = resolve(distDir, 'manifest.json');
            if (existsSync(manifestSrc)) {
              copyFileSync(manifestSrc, manifestDst);
            }
            const optionsSrc = resolve(distDir, 'src/options/options.html');
            const optionsDst = resolve(distDir, 'options.html');
            if (existsSync(optionsSrc)) {
              copyFileSync(optionsSrc, optionsDst);
            }
            const popupSrc = resolve(distDir, 'src/popup/popup.html');
            const popupDst = resolve(distDir, 'popup.html');
            if (existsSync(popupSrc)) {
              copyFileSync(popupSrc, popupDst);
            }
            // Ensure assets are available in dist; copy from src as they are referenced in manifest
            const assetsDir = resolve('src/assets');
            if (existsSync(assetsDir)) {
              cpSync(assetsDir, resolve(distDir, 'assets'), { recursive: true });
            }
            // Copy _locales directory for i18n support
            const localesDir = resolve('_locales');
            if (existsSync(localesDir)) {
              cpSync(localesDir, resolve(distDir, '_locales'), { recursive: true });
            }
            // Rename background script to match manifest
            const bgAssetsDir = resolve(distDir, 'assets');
            const bgFiles = readdirSync(bgAssetsDir).filter(f => f.startsWith('background-'));
            if (bgFiles.length > 0) {
              const bgFile = bgFiles[0];
              const bgSrc = resolve(bgAssetsDir, bgFile);
              const bgDst = resolve(bgAssetsDir, 'background.js');
              renameSync(bgSrc, bgDst);
            }
            // Verify manifest was copied correctly
            try {
              const manifestContent = readFileSync(manifestDst, 'utf-8');
              const manifest = JSON.parse(manifestContent);
              if (!manifest.default_locale) {
                console.error('WARNING: default_locale missing in manifest, fixing...');
                manifest.default_locale = 'en';
                writeFileSync(manifestDst, JSON.stringify(manifest, null, 2));
              }
            } catch (e) {
              console.error('Error reading/parsing manifest:', e);
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
        background: 'src/background/index.ts',
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
