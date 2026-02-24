import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'

// ── file templates ──────────────────────────────────────────────

const ADAPTIVE_CONFIG = `\
export const modes = [
  { fileSuffix: '.vw', prefix: 'vw', unit: 'vw', designBase: 1920 },
  { fileSuffix: '.vh', prefix: 'vh', unit: 'vh', designBase: 1080 },
]
`

const TAILWIND_PLUGIN = `\
import { createAdaptiveTailwindPlugin } from 'adaptive-units/tailwind'
import { modes } from './adaptive.config.js'

export default createAdaptiveTailwindPlugin(modes)
`

const ADAPTIVE_CONFIG_DTS = `\
import type { AdaptiveMode } from 'adaptive-units'
export declare const modes: AdaptiveMode[]
`

const POSTCSS_CONFIG = `\
import { createAdaptivePostcssPlugin } from 'adaptive-units/postcss'
import { modes } from './src/adaptive.config.js'

export default {
  plugins: [
    createAdaptivePostcssPlugin(modes),
  ],
}
`

// ── helpers ─────────────────────────────────────────────────────

function ask(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

async function writeFile(filePath: string, content: string): Promise<boolean> {
  if (fs.existsSync(filePath)) {
    const ok = await ask(`  ⚠  ${path.relative(process.cwd(), filePath)} already exists. Overwrite? (y/N) `)
    if (!ok) {
      console.log(`  ⏭  Skipped ${path.relative(process.cwd(), filePath)}`)
      return false
    }
  }

  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(filePath, content, 'utf-8')
  console.log(`  ✅ Created ${path.relative(process.cwd(), filePath)}`)
  return true
}

// ── init command ────────────────────────────────────────────────

async function init() {
  const root = process.cwd()
  const srcDir = path.join(root, 'src')

  console.log()
  console.log('adaptive-units init')
  console.log('='.repeat(40))
  console.log()

  // 1. adaptive.config.js → src/
  await writeFile(path.join(srcDir, 'adaptive.config.js'), ADAPTIVE_CONFIG)

  // 1b. adaptive.config.d.ts → src/
  await writeFile(path.join(srcDir, 'adaptive.config.d.ts'), ADAPTIVE_CONFIG_DTS)

  // 2. tailwind-plugin.js → src/
  await writeFile(path.join(srcDir, 'tailwind-plugin.js'), TAILWIND_PLUGIN)

  // 3. postcss.config.js → root
  await writeFile(path.join(root, 'postcss.config.js'), POSTCSS_CONFIG)

  // 4. Manual instructions
  console.log()
  console.log('-'.repeat(40))
  console.log()
  console.log('Next steps — add the following manually:')
  console.log()

  // vite.config.ts
  console.log('1. vite.config.ts — add the adaptive Vite plugins:')
  console.log()
  console.log(`   import { createAdaptiveVitePlugins } from 'adaptive-units/vite'`)
  console.log(`   import { modes } from './src/adaptive.config.js'`)
  console.log()
  console.log('   // in plugins array, BEFORE tailwindcss():')
  console.log('   plugins: [')
  console.log('     ...createAdaptiveVitePlugins(modes),')
  console.log('     tailwindcss(),')
  console.log('     react(),')
  console.log('   ]')
  console.log()

  // CSS entry
  console.log('2. CSS entry file (e.g. src/app.css) — add plugin & source:')
  console.log()
  console.log('   @import "tailwindcss";')
  console.log('   @plugin "./tailwind-plugin.js";')
  console.log('   @source "./.adaptive-safelist";')
  console.log()

  console.log('Done! See README for full documentation.')
  console.log()
}

// ── main ────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const command = args[0]

if (command === 'init') {
  init().catch((err) => {
    console.error(err)
    process.exit(1)
  })
} else {
  console.log('Usage: adaptive-units init')
  console.log()
  console.log('Commands:')
  console.log('  init    Generate config files for adaptive-units')
  process.exit(command ? 1 : 0)
}
