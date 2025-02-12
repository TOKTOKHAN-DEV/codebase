import { boxLog } from '@codebase/node'

export const throwError = (message: string) => {
  throw boxLog(
    [
      `${message} You can customize "tokenModes" in the "tok-cli.config.ts" file.`,
      `@see https://www.codebase.page/docs/docs/tokript/Offical%20Plugins/gen-theme-chakra#tokenmode`,
    ],
    { title: 'Message from tokript' },
  )
}
