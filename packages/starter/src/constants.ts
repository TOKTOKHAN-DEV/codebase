import os from 'os'
import path from 'path'

import { createPackageRoot } from '@codebase/node'

const packageRoot = createPackageRoot(__dirname)

export const CACHE_PATH = path.join(os.homedir(), 'starter', '.cache')
export const TEMP_PATH = path.join(os.homedir(), 'starter', '.temp')
export const PACKAGE_PATH = packageRoot('package.json')
