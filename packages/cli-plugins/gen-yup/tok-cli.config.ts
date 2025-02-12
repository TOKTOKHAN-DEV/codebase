import { RootConfig } from '@codebase/cli'

import { genYup } from './src'

const config: RootConfig<{ plugins: [typeof genYup] }> = {
  plugins: [genYup],
  'gen:yup': {},
}

export default config
