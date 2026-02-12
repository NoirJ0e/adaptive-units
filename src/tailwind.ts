import plugin from 'tailwindcss/plugin'
import type { AdaptiveMode } from './types'

function calcAdaptive(v: string, unit: string, designBase: number): string {
  return `calc(${v} * 100${unit} / ${designBase})`
}

function makeStyle(cssProp: string | string[], value: string): Record<string, string> {
  if (Array.isArray(cssProp)) {
    const result: Record<string, string> = {}
    for (const p of cssProp) {
      result[p] = value
    }
    return result
  }
  return { [cssProp]: value }
}

const BARE_VALUE = { __BARE_VALUE__: (v: { value: string }) => v.value }

const SPACING_PROPS: Record<string, string | string[]> = {
  'w': 'width',
  'min-w': 'minWidth',
  'max-w': 'maxWidth',
  'h': 'height',
  'min-h': 'minHeight',
  'max-h': 'maxHeight',
  'size': ['width', 'height'],
  'p': 'padding',
  'px': ['paddingLeft', 'paddingRight'],
  'py': ['paddingTop', 'paddingBottom'],
  'pt': 'paddingTop',
  'pr': 'paddingRight',
  'pb': 'paddingBottom',
  'pl': 'paddingLeft',
  'm': 'margin',
  'mx': ['marginLeft', 'marginRight'],
  'my': ['marginTop', 'marginBottom'],
  'mt': 'marginTop',
  'mr': 'marginRight',
  'mb': 'marginBottom',
  'ml': 'marginLeft',
  'gap': 'gap',
  'gap-x': 'columnGap',
  'gap-y': 'rowGap',
  'top': 'top',
  'right': 'right',
  'bottom': 'bottom',
  'left': 'left',
  'inset': 'inset',
  'inset-x': ['left', 'right'],
  'inset-y': ['top', 'bottom'],
  'basis': 'flexBasis',
}

const NON_SPACING_PROPS: Record<string, string | string[]> = {
  'text': 'fontSize',
  'leading': 'lineHeight',
  'tracking': 'letterSpacing',
  'border': 'borderWidth',
  'border-t': 'borderTopWidth',
  'border-r': 'borderRightWidth',
  'border-b': 'borderBottomWidth',
  'border-l': 'borderLeftWidth',
  'border-x': ['borderLeftWidth', 'borderRightWidth'],
  'border-y': ['borderTopWidth', 'borderBottomWidth'],
  'rounded': 'borderRadius',
  'rounded-t': ['borderTopLeftRadius', 'borderTopRightRadius'],
  'rounded-r': ['borderTopRightRadius', 'borderBottomRightRadius'],
  'rounded-b': ['borderBottomLeftRadius', 'borderBottomRightRadius'],
  'rounded-l': ['borderTopLeftRadius', 'borderBottomLeftRadius'],
  'rounded-tl': 'borderTopLeftRadius',
  'rounded-tr': 'borderTopRightRadius',
  'rounded-br': 'borderBottomRightRadius',
  'rounded-bl': 'borderBottomLeftRadius',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tailwind v4 __BARE_VALUE__ typing is incompatible with Record<string, string>
const MATCH_OPTIONS: any = {
  type: 'number',
  supportsNegativeValues: true,
  values: BARE_VALUE,
}

export function createAdaptiveTailwindPlugin(modes: AdaptiveMode[]) {
  return plugin(function ({ matchUtilities }) {
    for (const [name, cssProp] of Object.entries(SPACING_PROPS)) {
      for (const { prefix, unit, designBase } of modes) {
        matchUtilities(
          { [`${prefix}-${name}`]: (v: string) => makeStyle(cssProp, calcAdaptive(v, unit, designBase)) },
          MATCH_OPTIONS,
        )
      }
    }

    for (const [name, cssProp] of Object.entries(NON_SPACING_PROPS)) {
      matchUtilities(
        { [name]: (v: string) => makeStyle(cssProp, `${v}px`) },
        MATCH_OPTIONS,
      )
      for (const { prefix, unit, designBase } of modes) {
        matchUtilities(
          { [`${prefix}-${name}`]: (v: string) => makeStyle(cssProp, calcAdaptive(v, unit, designBase)) },
          MATCH_OPTIONS,
        )
      }
    }
  })
}
