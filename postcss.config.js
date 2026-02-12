import { createAdaptivePostcssPlugin } from 'adaptive-units/postcss'
import { modes } from './src/adaptive.config.js'

export default {
  plugins: [
    createAdaptivePostcssPlugin(modes),
  ],
}
