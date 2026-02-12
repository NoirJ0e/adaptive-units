# adaptive-units

Tailwind CSS v4 + Vite + PostCSS 自适应视口单位方案。

将 `.vw.tsx` / `.vh.tsx` 中的 Tailwind 类名自动重写为视口单位，将 `.vw.scss` / `.vh.scss` 中的 `px` 值自动转换为 `calc()` 表达式。

## 安装

```bash
npm install adaptive-units
```

## 快速接入

```bash
npx adaptive-units init
```

该命令会自动生成以下文件：

- `src/adaptive.config.js` — modes 配置
- `src/tailwind-plugin.js` — Tailwind `@plugin` 包装
- `postcss.config.js` — PostCSS 配置

并在终端打印 `vite.config.ts` 和 CSS 入口文件的手动修改指南。

### vite.config.ts

在 plugins 数组中，**`tailwindcss()` 之前**添加：

```ts
import { createAdaptiveVitePlugins } from 'adaptive-units/vite'
import { modes } from './src/adaptive.config.js'

// plugins: [
//   ...createAdaptiveVitePlugins(modes),
//   tailwindcss(),
//   react(),
// ]
```

### CSS 入口文件（如 `src/app.css`）

```css
@import "tailwindcss";
@plugin "./tailwind-plugin.js";
@source "./.adaptive-safelist";
```

## API

### 主入口 (`adaptive-units`)

```ts
import { adaptCalc, adaptMotionProps, NoAdapt } from 'adaptive-units'
import type { AdaptiveMode } from 'adaptive-units'
```

- **`adaptCalc(px, mode)`** — 返回 `calc(px * 100vw / designBase)` 字符串
- **`adaptMotionProps(props, mode)`** — 将 `x/y/width/height/top/left/right/bottom` 数值属性转为 `calc()` 表达式（适用于 framer-motion 等）
- **`<NoAdapt>`** — 包裹不需要转换的区域，配合 `@no-adapt-start` / `@no-adapt-end` 注释使用

### React (`adaptive-units/react`)

```ts
import { useAdaptScale } from 'adaptive-units/react'

const scale = useAdaptScale(mode) // mode: AdaptiveMode | null
```

### 配置接口

```ts
interface AdaptiveMode {
  fileSuffix: string   // 文件后缀, e.g. '.vw'
  prefix: string       // Tailwind 工具类前缀, e.g. 'vw'
  unit: string         // CSS 视口单位, e.g. 'vw'
  designBase: number   // 设计稿基准尺寸, e.g. 1920
}
```

## 工作原理

1. **Vite 插件** (`createAdaptiveVitePlugins`)
   - 在 `enforce: 'pre'` 阶段拦截 `.vw.tsx` 等文件
   - 将 `className="w-300"` 重写为 `className="vw-w-300"`
   - 同时生成 `.adaptive-safelist` 文件供 Tailwind 扫描

2. **Tailwind 插件** (`createAdaptiveTailwindPlugin`)
   - 注册 `vw-w-*`、`vw-text-*` 等自定义工具类
   - 生成 `calc(N * 100vw / 1920)` 样式

3. **PostCSS 插件** (`createAdaptivePostcssPlugin`)
   - 处理 `.vw.scss` 等样式文件中的 `px` 值
   - 自动转换为 `calc()` 表达式

## 不转换的情况

- 普通 `.tsx` / `.css` 文件不受影响
- `<NoAdapt>` + `@no-adapt-start/@no-adapt-end` 区域内的类名不转换
- `/* adapt-ignore */` 注释旁的 CSS 声明不转换
- `0px` 不转换
- 非 `px` 单位（如 `%`、`em`）不转换
