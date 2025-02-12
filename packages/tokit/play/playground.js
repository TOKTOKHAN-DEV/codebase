import { isNotNullish } from '@codebase/universal';
import enquirer from 'enquirer';
import prop from 'lodash/fp/prop.js';
import { existsSync } from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';
import filter from 'lodash/fp/filter.js';
import flow from 'lodash/fp/flow.js';
import map from 'lodash/fp/map.js';
import memoize from 'lodash/fp/memoize.js';
import pick from 'lodash/fp/pick.js';
import os from 'os';
import { createPackageRoot } from '@codebase/node';


// -- Shims --
import cjsUrl from 'node:url';
import cjsPath from 'node:path';
import cjsModule from 'node:module';
const __filename = cjsUrl.fileURLToPath(import.meta.url);
const __dirname = cjsPath.dirname(__filename);
const require = cjsModule.createRequire(import.meta.url);
const packageRoot = createPackageRoot(__dirname);
const CACHE_PATH = path.join(os.homedir(), 'tokit', '.cache');
path.join(os.homedir(), 'tokit', '.temp');
packageRoot('package.json');

const cachedPackage = (name, version) => path.resolve(CACHE_PATH, name, `${version}`);

const github = new Octokit({
    auth: process.env.TOKIT_GITHUB_TOKEN,
});
const isStartWith = (str) => (target) => target.startsWith(str);
const releasedTemplates = Object.assign(memoize((packageName) => github.repos
    .listReleases({
    owner: 'TOKTOKHAN-DEV',
    repo: 'toktokhan-dev',
})
    .then(flow(prop('data'), filter(flow(prop('name'), isStartWith(`@codebase/${packageName}`)))))), {
    summary: memoize((name) => releasedTemplates(name).then(map(flow(pick(['id', 'name', 'published_at', 'tag_name', 'zipball_url']), (data) => {
        const rgx = /@toktokhan-dev\/(.*)@(.*)/d;
        const [, name, version] = data.name?.match(rgx) || [];
        const pureName = name.replace('template-', '');
        return {
            id: data.id,
            name: pureName,
            version,
            isCached: existsSync(path.resolve(cachedPackage(pureName, version), 'package.json')),
            zipUrl: data.zipball_url,
        };
    })))),
    choices: memoize((name) => {
        return releasedTemplates.summary(name).then(map((data) => ({
            id: data.id,
            name: `${data.name}@${data.version}`,
            message: `${data.name}@${data.version}${data.isCached ? '(installed)' : ''}`,
        })));
    }),
});

const packageMap = {
    'next-page-init': {
        owner: 'TOKTOKHAN-DEV',
        repo: 'next-page-init',
    },
    'next-app-init': {
        owner: 'TOKTOKHAN-DEV',
        repo: 'next-page-init',
    },
    'rn-native-base-init': {
        owner: 'TOKTOKHAN-DEV',
        repo: 'next-page-init',
    },
};
async function selectTemplate() {
    const { template } = await enquirer.prompt({
        name: 'template',
        message: 'Select a template',
        type: 'select',
        choices: Object.keys(packageMap).map((key) => ({
            name: key + '3',
            message: key + '2',
        })),
    });
    console.log({ template });
    const pack = packageMap[template];
    const releases = await github.repos.listReleases({
        owner: pack.owner,
        repo: pack.repo,
    });
    await enquirer.prompt({
        name: 'version',
        message: 'Select a Version',
        type: 'select',
        choices: releases.data.map(prop('tag_name')).filter(isNotNullish),
    });
}
selectTemplate();
