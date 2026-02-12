import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      vite: 'src/vite.ts',
      tailwind: 'src/tailwind.ts',
      postcss: 'src/postcss.ts',
      react: 'src/react.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    outExtension({ format }) {
      return { js: format === 'esm' ? '.mjs' : '.cjs' }
    },
    external: ['react', 'react-dom', 'vite', 'tailwindcss', 'postcss', 'tailwindcss/plugin'],
  },
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    outExtension() {
      return { js: '.js' }
    },
    banner: { js: '#!/usr/bin/env node' },
    clean: false,
  },
])
