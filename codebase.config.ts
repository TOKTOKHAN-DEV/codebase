import { RootConfig } from '@codebase/cli'
import { commit } from '@codebase/cli-plugin-commit'

const config: RootConfig<{ plugins: [typeof commit] }> = {
  plugins: [commit],
  basePath: process.cwd(),
}

export default config
