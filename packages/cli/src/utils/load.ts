import path from 'path'

import { bundleRequire } from 'bundle-require'
import JoyCon from 'joycon'

export const loadConfigFile = async (cwd: string, configFile?: string) => {
  const configPath = await new JoyCon().resolve({
    files:
      configFile ?
        [configFile]
      : [
          'codebase.config.ts',
          'codebase.config.js',
          'codebase.config.mjs',
          'codebase.config.cjs',
        ],
    cwd,
    stopDir: path.parse(cwd).root,
    packageKey: 'codebase-cli',
  })

  if (!configPath) {
    return null
  }
  const config = await bundleRequire({
    filepath: configPath,
    tsconfig: path.join(cwd, 'tsconfig.json'),
  })

  return {
    path: configPath,
    data: config.mod.tok || config.mod.default || config.mod,
  }
}
