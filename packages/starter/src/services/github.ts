import { existsSync } from 'fs'
import path from 'path'

import { ItemOf } from '@codebase/universal'
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest'

import { filter, flow, map, memoize, pick, prop } from 'lodash/fp'

import { cachedPackage } from '../utils/cached-package'

export const github: Octokit = new Octokit({
  auth: process.env.TOKIT_GITHUB_TOKEN,
})

const isStartWith = (str: string) => (target: string) => target.startsWith(str)

export type Package = ItemOf<
  RestEndpointMethodTypes['repos']['listReleases']['response']['data']
>

export type PackageSummary = {
  id: number
  name: string
  version: string
  isCached: boolean
  zipUrl: string | null
}

export type PackageChoise = {
  id: number
  name: string
  message: string
}

export const releasedTemplates: {
  (packageName: string): Promise<Package[]>
  summary(name: string): Promise<PackageSummary[]>
  choices(name: string): Promise<PackageChoise[]>
} = Object.assign(
  memoize(
    (packageName: string): Promise<Package[]> =>
      github.repos
        .listReleases({
          owner: 'TOKTOKHAN-DEV',
          repo: 'codebase',
        })
        .then(
          flow(
            prop('data'),
            filter(flow(prop('name'), isStartWith(`@codebase/${packageName}`))),
          ),
        ),
  ),
  {
    summary: memoize(
      (name: string): Promise<PackageSummary[]> =>
        releasedTemplates(name).then(
          map(
            flow(
              pick(['id', 'name', 'published_at', 'tag_name', 'zipball_url']),
              (data): PackageSummary => {
                const rgx = /@toktokhan-dev\/(.*)@(.*)/d
                const [, name, version] = data.name?.match(rgx) || []
                const pureName = name.replace('template-', '')

                return {
                  id: data.id,
                  name: pureName,
                  version,
                  isCached: existsSync(
                    path.resolve(
                      cachedPackage(pureName, version),
                      'package.json',
                    ),
                  ),
                  zipUrl: data.zipball_url,
                }
              },
            ),
          ),
        ),
    ),
    choices: memoize((name: string): Promise<PackageChoise[]> => {
      return releasedTemplates.summary(name).then(
        map(
          (data): PackageChoise => ({
            id: data.id,
            name: `${data.name}@${data.version}`,
            message: `${data.name}@${data.version}${data.isCached ? '(installed)' : ''}`,
          }),
        ),
      )
    }),
  },
)
