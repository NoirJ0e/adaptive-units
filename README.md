# adaptive-units

Adaptive viewport unit conversion for **Tailwind CSS v4 + Vite + PostCSS**.

Automatically rewrites Tailwind class names in `.vw.tsx` / `.vh.tsx` files to viewport-relative units, and converts `px` values in `.vw.scss` / `.vh.scss` to `calc()` expressions — so you can write pixel values from the design spec and get responsive output for free.

## Installation

```bash
npm install adaptive-units
```

## Quick Start

```bash
npx adaptive-units init
```

This generates the required config files and prints a setup guide for your `vite.config.ts` and CSS entry point.

### vite.config.ts

Add the adaptive plugins **before** `tailwindcss()`:

```ts
import { createAdaptiveVitePlugins } from 'adaptive-units/vite'
import { modes } from './src/adaptive.config.js'

export default defineConfig({
  plugins: [
    ...createAdaptiveVitePlugins(modes),
    tailwindcss(),
    react(),
  ],
})
```

### CSS Entry (e.g. `src/app.css`)

```css
@import "tailwindcss";
@plugin "./tailwind-plugin.js";
@source "./.adaptive-safelist";
```

## File Naming Convention

The `.vw` / `.vh` suffix tells the plugins which files to process. **This applies to all file types** — components, pages, hooks, stylesheets, etc.:

| File type | Example | Processed by |
|---|---|---|
| React component | `Hero.vw.tsx` | Vite plugin (rewrites `className`) |
| TypeScript module | `utils.vw.ts` | Vite plugin |
| Stylesheet | `layout.vw.scss` | PostCSS plugin (rewrites `px` values) |
| Regular file | `Header.tsx` | **Not processed** — no conversion |

A component that needs viewport-width adaptation should be named `Component.vw.tsx` instead of `Component.tsx`. If a component doesn't need adaptive conversion, keep the regular name — it won't be touched.

You can mix adapted and non-adapted files freely in the same directory. Only files with the `.vw` or `.vh` suffix are processed.

## How It Works

The library consists of three coordinated plugins:

1. **Vite Plugin** (`createAdaptiveVitePlugins`) — Intercepts `.vw.tsx` files at the `enforce: 'pre'` stage, rewrites `className="w-300"` → `className="vw-w-300"`, and generates a `.adaptive-safelist` for Tailwind to scan.

2. **Tailwind Plugin** (`createAdaptiveTailwindPlugin`) — Registers custom utilities like `vw-w-*`, `vw-text-*`, etc., generating `calc(N * 100vw / designBase)` styles.

3. **PostCSS Plugin** (`createAdaptivePostcssPlugin`) — Processes `.vw.scss` files, converting `px` values to `calc()` expressions automatically.

## API

### Main Entry (`adaptive-units`)

```ts
import { adaptCalc, adaptMotionProps, NoAdapt } from 'adaptive-units'
import type { AdaptiveMode } from 'adaptive-units'
```

| Export | Description |
|---|---|
| `adaptCalc(px, mode)` | Returns a `calc(px * 100vw / designBase)` string |
| `adaptMotionProps(props, mode)` | Converts `x/y/width/height/top/left/right/bottom` numeric props to `calc()` (for framer-motion, etc.) |
| `<NoAdapt>` | Wrapper component to opt out of conversion in specific regions |

### React Hook (`adaptive-units/react`)

```ts
import { useAdaptScale } from 'adaptive-units/react'

const scale = useAdaptScale(mode) // mode: AdaptiveMode | null
```

### Configuration

```ts
interface AdaptiveMode {
  fileSuffix: string   // e.g. '.vw'
  prefix: string       // Tailwind utility prefix, e.g. 'vw'
  unit: string         // CSS viewport unit, e.g. 'vw'
  designBase: number   // Design spec base width, e.g. 1920
}
```

## Opting Out

Conversion is skipped in the following cases:

- Regular `.tsx` / `.css` files (only suffixed files are processed)
- Content inside `<NoAdapt>` + `@no-adapt-start` / `@no-adapt-end` regions
- CSS declarations next to `/* adapt-ignore */` comments
- `0px` values
- Non-px units (`%`, `em`, `rem`, etc.)

## License

MIT
