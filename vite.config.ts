import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Plugin to copy extension manifest and assets to dist
function copyExtensionFiles() {
  return {
    name: 'copy-extension-files',
    writeBundle() {
      const distDir = resolve(__dirname, 'dist');

      // Copy manifest.json
      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(distDir, 'manifest.json'),
      );

      // Copy icons directory
      const iconsDir = resolve(distDir, 'icons');
      if (!existsSync(iconsDir)) {
        mkdirSync(iconsDir, { recursive: true });
      }

      // Copy icon files if they exist
      const srcIcons = resolve(__dirname, 'public', 'icons');
      if (existsSync(srcIcons)) {
        for (const file of ['icon-16.png', 'icon-48.png', 'icon-128.png']) {
          const src = resolve(srcIcons, file);
          if (existsSync(src)) {
            copyFileSync(src, resolve(iconsDir, file));
          }
        }
      }
    },
  };
}

// ── Content Script Build Plugin ──────────────────────────────────────────────
// Chrome MV3 content scripts are loaded as classic scripts, NOT ES modules.
// If Vite creates shared chunks (e.g. for shared/messages.ts used by both
// background and content), content.js will contain `import` statements that
// fail silently. This plugin runs a second mini-build that produces content.js
// as a self-contained IIFE with all dependencies inlined.
function buildContentScript() {
  return {
    name: 'build-content-script',
    apply: 'build' as const,
    async closeBundle() {
      const { build } = await import('vite');
      await build({
        configFile: false,
        logLevel: 'warn',
        plugins: [],
        resolve: {
          alias: { '@': resolve(__dirname, 'src') },
        },
        build: {
          write: true,
          outDir: resolve(__dirname, 'dist'),
          emptyOutDir: false,    // Don't clear the main build output
          copyPublicDir: false,
          rollupOptions: {
            input: resolve(__dirname, 'src/content/index.ts'),
            output: {
              format: 'iife',
              entryFileNames: 'content.js',
              inlineDynamicImports: true,
            },
          },
          // Suppress the "Generated an empty chunk" warning
          chunkSizeWarningLimit: 1000,
        },
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), copyExtensionFiles(), buildContentScript()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidebar: resolve(__dirname, 'sidebar.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        // content is built separately by buildContentScript() as IIFE
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
