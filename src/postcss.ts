import type { AdaptiveMode } from './types'

const WHITELIST = new Set([
  'width', 'min-width', 'max-width',
  'height', 'min-height', 'max-height',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'gap', 'row-gap', 'column-gap',
  'top', 'right', 'bottom', 'left', 'inset',
  'font-size', 'line-height', 'letter-spacing',
  'border-radius',
  'padding-inline', 'padding-inline-start', 'padding-inline-end',
  'padding-block', 'padding-block-start', 'padding-block-end',
  'margin-inline', 'margin-inline-start', 'margin-inline-end',
  'margin-block', 'margin-block-start', 'margin-block-end',
  'inset-inline', 'inset-inline-start', 'inset-inline-end',
  'inset-block', 'inset-block-start', 'inset-block-end',
  'inline-size', 'min-inline-size', 'max-inline-size',
  'block-size', 'min-block-size', 'max-block-size',
])

const PX_REGEX = /(-?\d*\.?\d+)px/g

function hasAdaptIgnore(decl: any): boolean {
  const next = decl.next()
  if (next && next.type === 'comment' && next.text.trim() === 'adapt-ignore') {
    return true
  }
  const prev = decl.prev()
  if (prev && prev.type === 'comment' && prev.text.trim() === 'adapt-ignore') {
    return true
  }
  return false
}

function convertPxValues(value: string, unit: string, designBase: number): string {
  return value.replace(PX_REGEX, (_match, numStr) => {
    const num = parseFloat(numStr)
    if (num === 0) return '0'
    return `calc(${num} * 100${unit} / ${designBase})`
  })
}

export function createAdaptivePostcssPlugin(modes: AdaptiveMode[]) {
  const suffixMap = new Map(
    modes.map(m => [m.fileSuffix, { unit: m.unit, designBase: m.designBase }])
  )
  const suffixes = modes.map(m => m.fileSuffix.slice(1)).join('|')
  const fileRe = new RegExp(`\\.(${suffixes})\\.(css|scss|sass|less)$`)

  const postcssPlugin = () => {
    return {
      postcssPlugin: 'postcss-adaptive-units',
      Declaration(decl: any) {
        const filePath = decl.root().source?.input?.file || ''

        const fileMatch = filePath.match(fileRe)
        if (!fileMatch) return
        const modeConfig = suffixMap.get(`.${fileMatch[1]}`)
        if (!modeConfig) return

        if (!WHITELIST.has(decl.prop)) return
        PX_REGEX.lastIndex = 0
        if (!PX_REGEX.test(decl.value)) return
        if (hasAdaptIgnore(decl)) return

        PX_REGEX.lastIndex = 0
        decl.value = convertPxValues(decl.value, modeConfig.unit, modeConfig.designBase)
      },
    }
  }

  postcssPlugin.postcss = true as const
  return postcssPlugin
}
