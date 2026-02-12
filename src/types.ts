export interface AdaptiveMode {
  /** File suffix to match, e.g. '.vw' */
  fileSuffix: string
  /** Prefix for generated Tailwind utilities, e.g. 'vw' */
  prefix: string
  /** CSS viewport unit, e.g. 'vw' or 'vh' */
  unit: string
  /** Design base size in px, e.g. 1920 */
  designBase: number
}
