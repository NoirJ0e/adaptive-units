import type { Plugin, ResolvedConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import type { AdaptiveMode } from './types'

const UTILITY_NAMES = new Set([
  // spacing
  'w', 'min-w', 'max-w', 'h', 'min-h', 'max-h', 'size',
  'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl',
  'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml',
  'gap', 'gap-x', 'gap-y',
  'top', 'right', 'bottom', 'left', 'inset', 'inset-x', 'inset-y',
  'basis',
  // non-spacing
  'text', 'leading', 'tracking',
  'rounded', 'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l',
  'rounded-tl', 'rounded-tr', 'rounded-br', 'rounded-bl',
])

type RewriteResult = { rewrite: false } | { rewrite: true; name: string; value: string; arbitrary: boolean }

function analyzeUtility(baseUtility: string): RewriteResult {
  const bareMatch = baseUtility.match(/^(.+)-(\d+\.?\d*)$/)
  if (bareMatch) {
    const [, name, value] = bareMatch
    if (UTILITY_NAMES.has(name)) {
      return { rewrite: true, name, value, arbitrary: false }
    }
  }
  const arbMatch = baseUtility.match(/^(.+)-\[(-?\d*\.?\d+)px\]$/)
  if (arbMatch) {
    const [, name, value] = arbMatch
    if (UTILITY_NAMES.has(name)) {
      return { rewrite: true, name, value, arbitrary: true }
    }
  }
  return { rewrite: false }
}

function rewriteToken(token: string, prefix: string): string {
  let rest = token
  let variants = ''
  const colonIdx = rest.lastIndexOf(':')
  if (colonIdx >= 0) {
    variants = rest.slice(0, colonIdx + 1)
    rest = rest.slice(colonIdx + 1)
  }

  let important = false
  if (rest.startsWith('!')) {
    important = true
    rest = rest.slice(1)
  }

  let negative = false
  if (rest.startsWith('-')) {
    negative = true
    rest = rest.slice(1)
  }

  const result = analyzeUtility(rest)
  if (!result.rewrite) return token

  const { name, value, arbitrary } = result
  if (arbitrary) {
    const numVal = parseFloat(value)
    const isNeg = numVal < 0 || negative
    const absVal = Math.abs(numVal)
    return `${variants}${important ? '!' : ''}${isNeg ? '-' : ''}${prefix}-${name}-${absVal}`
  }

  return `${variants}${important ? '!' : ''}${negative ? '-' : ''}${prefix}-${name}-${value}`
}

function findNoAdaptRegions(code: string): [number, number][] {
  const regions: [number, number][] = []
  const startRe = /@no-adapt-start/g
  const endRe = /@no-adapt-end/g
  let m
  while ((m = startRe.exec(code)) !== null) {
    endRe.lastIndex = m.index
    const endMatch = endRe.exec(code)
    if (endMatch) {
      regions.push([m.index, endMatch.index + endMatch[0].length])
    }
  }
  return regions
}

function isInNoAdaptRegion(offset: number, regions: [number, number][]): boolean {
  return regions.some(([start, end]) => offset >= start && offset <= end)
}

function rewriteClassNamesInSource(code: string, prefix: string): string {
  const noAdaptRegions = findNoAdaptRegions(code)

  const matches: { start: number; end: number; replacement: string }[] = []

  const patterns = [
    { re: /className="([^"]+)"/g, wrap: (c: string) => `className="${c}"` },
    { re: /className=\{'([^']+)'\}/g, wrap: (c: string) => `className={'${c}'}` },
    { re: /className=\{`([^`]+)`\}/g, wrap: null as null },
  ]

  for (const { re, wrap } of patterns) {
    let m
    while ((m = re.exec(code)) !== null) {
      if (isInNoAdaptRegion(m.index, noAdaptRegions)) continue

      const full = m[0]
      const content = m[1]
      let replacement: string

      if (wrap) {
        const rewritten = content.split(/(\s+)/).map(part => {
          if (/^\s+$/.test(part)) return part
          return rewriteToken(part, prefix)
        }).join('')
        replacement = wrap(rewritten)
      } else {
        const rewritten = content.replace(
          /((?:^|(?<=\}))[^$]*?)(?=\$\{|$)/g,
          (segment: string) => {
            return segment.split(/(\s+)/).map(part => {
              if (/^\s+$/.test(part)) return part
              return rewriteToken(part, prefix)
            }).join('')
          }
        )
        replacement = `className={\`${rewritten}\`}`
      }

      if (replacement !== full) {
        matches.push({ start: m.index, end: m.index + full.length, replacement })
      }
    }
  }

  matches.sort((a, b) => b.start - a.start)
  let result = code
  for (const { start, end, replacement } of matches) {
    result = result.slice(0, start) + replacement + result.slice(end)
  }
  return result
}

function extractRewrittenClasses(code: string, prefix: string): Set<string> {
  const classes = new Set<string>()
  const noAdaptRegions = findNoAdaptRegions(code)

  const patterns = [
    /className="([^"]+)"/g,
    /className=\{'([^']+)'\}/g,
    /className=\{`([^`]+)`\}/g,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(code)) !== null) {
      if (isInNoAdaptRegion(match.index, noAdaptRegions)) continue
      const content = match[1]
      const tokens = content.split(/\s+/).filter(Boolean)
      for (const token of tokens) {
        if (token.includes('${')) continue
        const rewritten = rewriteToken(token, prefix)
        if (rewritten !== token) {
          classes.add(rewritten)
        }
      }
    }
  }

  return classes
}

const SAFELIST_FILE = '.adaptive-safelist'

export function createAdaptiveVitePlugins(modes: AdaptiveMode[]): Plugin[] {
  const suffixToPrefix = new Map(modes.map(m => [m.fileSuffix, m.prefix]))
  const suffixes = modes.map(m => m.fileSuffix.slice(1)).join('|')
  const fileRe = new RegExp(`\\.(${suffixes})\\.(tsx|jsx|ts|js)$`)

  let root = ''

  function findAdaptiveFiles(dir: string): { file: string; prefix: string }[] {
    const results: { file: string; prefix: string }[] = []

    function walk(d: string) {
      const entries = fs.readdirSync(d, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name)
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
          walk(fullPath)
        } else if (entry.isFile()) {
          const match = entry.name.match(fileRe)
          if (match) {
            const prefix = suffixToPrefix.get(`.${match[1]}`)!
            results.push({ file: fullPath, prefix })
          }
        }
      }
    }

    walk(dir)
    return results
  }

  function generateSafelist(): string {
    const files = findAdaptiveFiles(path.join(root, 'src'))
    const allClasses = new Set<string>()

    for (const { file, prefix } of files) {
      const code = fs.readFileSync(file, 'utf-8')
      const classes = extractRewrittenClasses(code, prefix)
      for (const cls of classes) {
        allClasses.add(cls)
      }
    }

    return Array.from(allClasses).sort().join(' ')
  }

  function updateSafelist() {
    const safelist = generateSafelist()
    const filePath = path.join(root, 'src', SAFELIST_FILE)
    const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : ''
    if (current !== safelist) {
      fs.writeFileSync(filePath, safelist, 'utf-8')
    }
  }

  return [
    {
      name: 'vite-plugin-adaptive:safelist',
      enforce: 'pre',

      configResolved(config: ResolvedConfig) {
        root = config.root
        updateSafelist()
      },

      handleHotUpdate({ file }) {
        if (fileRe.test(file)) {
          updateSafelist()
        }
      },
    },
    {
      name: 'vite-plugin-adaptive:transform',
      enforce: 'pre',

      transform(code, id) {
        const idMatch = id.match(fileRe)
        if (!idMatch) return null

        const prefix = suffixToPrefix.get(`.${idMatch[1]}`)!
        const rewritten = rewriteClassNamesInSource(code, prefix)

        if (rewritten === code) return null
        return { code: rewritten, map: null }
      },
    },
  ]
}
