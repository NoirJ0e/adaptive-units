import { createAdaptiveTailwindPlugin } from 'adaptive-units/tailwind'
import { modes } from './adaptive.config.js'

export default createAdaptiveTailwindPlugin(modes)
