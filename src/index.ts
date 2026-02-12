export type { AdaptiveMode } from './types'
export { NoAdapt } from './NoAdapt'

import type { AdaptiveMode } from './types'

export function adaptCalc(px: number, mode: AdaptiveMode): string {
  return `calc(${px} * 100${mode.unit} / ${mode.designBase})`
}

const ADAPT_KEYS = new Set(['x', 'y', 'width', 'height', 'top', 'left', 'right', 'bottom'])

export function adaptMotionProps(
  props: Record<string, number | string>,
  mode: AdaptiveMode,
): Record<string, number | string> {
  const result: Record<string, number | string> = {}
  for (const [key, value] of Object.entries(props)) {
    if (ADAPT_KEYS.has(key) && typeof value === 'number') {
      result[key] = adaptCalc(value, mode)
    } else {
      result[key] = value
    }
  }
  return result
}
