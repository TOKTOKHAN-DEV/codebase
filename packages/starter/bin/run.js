#!/usr/bin/env node
import os from 'os';
import { program, Argument, Option } from 'commander';
import { createPackageRoot, boxLog, cwd, pathOf, json, prettierString, infoLog, $ } from '@codebase/node';
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import path from 'path';
import { isNotNullish, pass, runIfFn, awaited, removeStr } from '@codebase/universal';
import enquirer from 'enquirer';
import prop from 'lodash/fp/prop.js';
import fs, { existsSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'fs';
import { Octokit } from '@octokit/rest';
import filter from 'lodash/fp/filter.js';
import flow from 'lodash/fp/flow.js';
import map from 'lodash/fp/map.js';
import memoize from 'lodash/fp/memoize.js';
import pick from 'lodash/fp/pick.js';
import includesFrom from 'lodash/fp/includesFrom.js';
import toLower from 'lodash/fp/toLower.js';
import mapValues from 'lodash/mapValues.js';
import flow$1 from 'lodash/flow.js';
import { GitHubManager } from '@codebase/github';
import simpleGit from 'simple-git';


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
const PACKAGE_PATH = packageRoot('package.json');

const PACKAGE_MAP = {
    'next-page-init': {
        owner: 'TOKTOKHAN-DEV',
        repo: 'next-page-init',
    },
    'next-app-init': {
        owner: 'TOKTOKHAN-DEV',
        repo: 'next-app-init',
    },
    'rn-native-base-init': {
        owner: 'TOKTOKHAN-DEV',
        repo: 'rn-native-base-init',
    },
};

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

const isCached = (name, version) => existsSync(path.resolve(cachedPackage(name, version), 'package.json'));

const logMissingConfigMessage = (missing) => {
    const missingItems = missing.join(', ');
    const isAre = missing.length > 1 ? 'are' : 'is';
    const missingMsg = [
        `The following required item(s) ${isAre} missing: ${chalk.green.bgGray.bold(missingItems)}.`,
    ];
    const isMissedGithub = missing.map(flow(toLower, includesFrom('github')));
    const envGuide = `
  It looks like you need to set up your GitHub information in your environment variables.

  Please set the following environment variables in your terminal:
    
  ${chalk.bgWhite.blackBright('export TOKIT_GITHUB_TOKEN=<your-github-token>')}
  ${chalk.bgWhite.blackBright('export TOKIT_GITHUB_OWNER=<your-github-owner>')}
  ${chalk.bgWhite.blackBright('export TOKIT_GITHUB_USERNAME=<your-github-username>')}
  
  Replace <your-github-token>, <your-github-owner>, and <your-github-username> with your actual GitHub information.
  
  For more detailed instructions on how to do this, please refer to ${chalk.blue.bold.underline('https://www.xx')}.`;
    const msg = isMissedGithub ? missingMsg.concat(envGuide) : missingMsg;
    throw boxLog(msg, {
        title: 'Message from Tokit',
    });
};

const checkMissingConfig = async (createRemoteRepo, projectname, pathname) => {
    const missing = [];
    if (!projectname && !pathname) {
        missing.push('Project name or pathname');
    }
    if (createRemoteRepo === 'Yes') {
        const githubToken = process.env.TOKIT_GITHUB_TOKEN;
        const githubOwner = process.env.TOKIT_GITHUB_OWNER;
        const githubUserName = process.env.TOKIT_GITHUB_USERNAME;
        if (!githubToken)
            missing.push('GitHub Token Environment');
        if (!githubOwner)
            missing.push('GitHub Owner Environment');
        if (!githubUserName)
            missing.push('GitHub Username Environment');
    }
    if (missing.length > 0)
        return logMissingConfigMessage(missing);
};
async function initialQuestion(pathname) {
    const { projectname, template } = await enquirer.prompt([
        {
            type: 'input',
            name: 'projectname',
            message: 'What is your project name?',
            skip: pathname !== undefined,
            initial: () => pathname,
        },
        {
            type: 'select',
            name: 'template',
            message: "What's your template?",
            choices: Object.keys(PACKAGE_MAP),
        },
    ]);
    const pack = PACKAGE_MAP[template];
    const releases = await github.repos.listReleases({
        owner: pack.owner,
        repo: pack.repo,
    });
    if (releases.data.length === 0) {
        throw new Error('No releases found');
    }
    const { createRemoteRepo, manager, version } = await enquirer.prompt([
        {
            name: 'version',
            message: 'What version do you want to use?',
            type: 'select',
            choices: releases.data
                .map(prop('tag_name'))
                .filter(isNotNullish)
                .map((tag) => ({
                name: tag,
                message: isCached(pack.repo, tag) ? `${tag} (cached)` : tag,
            })),
        },
        {
            type: 'select',
            name: 'manager',
            message: 'What is your package manager?',
            choices: ['npm', 'pnpm', 'yarn'],
        },
        {
            type: 'select',
            name: 'createRemoteRepo',
            message: 'Would you like to create a remote repository on GitHub?',
            choices: ['No', 'Yes'],
        },
    ]);
    await checkMissingConfig(createRemoteRepo, projectname, pathname);
    return {
        version,
        createRemoteRepo,
        manager,
        projectname,
        template,
        pathname: cwd(projectname || pathname || ''),
        isCached: isCached(pack.repo, version),
    };
}

const updator = (target) => (prev) => ({ ...prev, ...runIfFn(target, prev) });
const modifyPackageJson = (data, path) => flow$1(pass(path), pathOf('package.json'), json, updator(data), JSON.stringify, (src) => prettierString(src, { parser: 'json' }), awaited((src) => writeFileSync(pathOf('package.json', path), src)))();

async function cacheToLocal(config) {
    const cachePath = cachedPackage(config.template, config.version);
    fs.cpSync(cachePath, path.resolve(config.pathname), { recursive: true });
    (() => {
        const gitignorePath = path.resolve(config.pathname, '.gitignore');
        const prev = readFileSync(gitignorePath, 'utf-8');
        const updated = removeStr(/\.*pnpm-lock.yaml/g, prev);
        fs.writeFileSync(gitignorePath, updated);
    })();
    (() => {
        const huskyPath = path.resolve(config.pathname, '.husky');
        const files = readdirSync(huskyPath);
        files.forEach((file) => {
            const prev = readFileSync(path.resolve(huskyPath, file), 'utf-8');
            const updated = prev.replaceAll('pnpm', config.manager);
            fs.writeFileSync(path.resolve(huskyPath, file), updated);
        });
    })();
    (() => {
        const changesetPath = path.resolve(config.pathname, '.github');
        fs.rmSync(changesetPath, { recursive: true });
    })();
    (() => {
        const changesetPath = path.resolve(config.pathname, '.changeset');
        fs.rmSync(changesetPath, { recursive: true });
    })();
    (() => {
        const changesetPath = path.resolve(config.pathname, '.scripts');
        fs.rmSync(changesetPath, { recursive: true });
    })();
    // modify package.json scripts
    const modifyScripts = (scripts) => {
        const IGNORED = ['changeset'];
        const updated = Object.entries(scripts).filter(([key]) => !IGNORED.includes(key));
        return mapValues(Object.fromEntries(updated), (value) => value.replaceAll('pnpm', config.manager));
    };
    // modify package.json dev dependencies
    const modifyDevDependencies = (dependencies) => {
        const IGNORED = ['@changesets/cli', '@changesets/changelog-github'];
        const updated = Object.entries(dependencies).filter(([key]) => !IGNORED.includes(key));
        return Object.fromEntries(updated);
    };
    await modifyPackageJson((prev) => {
        return {
            ...prev,
            name: config.projectname,
            version: '0.0.0',
            devDependencies: modifyDevDependencies(prev.devDependencies),
            scripts: modifyScripts(prev.scripts),
        };
    }, config.pathname);
}

const GIT_TOKEN = process.env.TOKIT_GITHUB_TOKEN || '';
const GIT_OWNER = process.env.TOKIT_GITHUB_OWNER || '';
const GIT_USERNAME = process.env.TOKIT_GITHUB_USERNAME || '';
const createRepository = async (config) => {
    const owner = GIT_OWNER;
    const repo = config.projectname;
    const github = new GitHubManager({
        token: GIT_TOKEN || '',
        owner,
        repo,
    });
    const { clone_url, html_url, isOrg } = await github.createRepo({
        isPrivate: true,
    });
    if (!isOrg) {
        infoLog('Collaborator Addition Skipped', `User ${GIT_USERNAME} is already the repository owner.`);
    }
    else {
        await github.addCollaborator({
            username: GIT_USERNAME,
            permission: 'admin',
        });
        infoLog('Collaborator Added', `User ${GIT_USERNAME} was successfully added as a collaborator`);
    }
    return { cloneUrl: clone_url, url: html_url };
};

const removeGit = async (baseDir) => {
    const gitDirPath = path.join(baseDir, '.git');
    if (existsSync(gitDirPath)) {
        rmSync(gitDirPath, { recursive: true, force: true });
    }
};

const proceedGit = async ({ cloneUrl, baseDir }) => {
    const git = simpleGit({ baseDir });
    try {
        await flow$1(async () => removeGit(baseDir), 
        // awaited(infoLog('Remove .git')),
        awaited(() => git.init()), 
        // awaited(infoLog('Initialized git repository')),
        awaited(() => git.add('.')), 
        // awaited(infoLog('Added all files')),
        awaited(() => git.commit('Upload TOKIT`s template')), 
        // awaited(infoLog('Committed changes')),
        awaited(() => git.branch(['-M', 'main'])), 
        // awaited(infoLog('Renamed branch to main')),
        awaited(() => git.addRemote('origin', cloneUrl)), 
        // awaited(infoLog('Added remote origin')),
        awaited(() => git.push(['-u', 'origin', 'main'])))();
    }
    catch (error) {
        console.error('Error git process:', error);
    }
};

const storeCache = async (config) => {
    const cachePath = cachedPackage(config.template, config.version);
    fs.mkdirSync(cachePath, { recursive: true });
    const git = simpleGit({ baseDir: cachePath });
    const pack = PACKAGE_MAP[config.template];
    await git.clone(`https://github.com/${pack.owner}/${pack.repo}.git`, '.', {
        '--branch': config.version,
    });
    await removeGit(cachePath);
};

const name = 'tokit';
const version = json(PACKAGE_PATH).version;
const isWindows = os.platform() === 'win32';
/**
 * 똑똑한개발자 보일러 플레이트를 생성하는 CLI Tool 입니다.
 * 템플릿을 선택하는 대화형 인터페이스를 제공하고, 선택한 템플릿을 로컬에 캐시하며, 지정된 경로에 설치합니다.
 *
 * @packageDocumentation
 */
async function main() {
    clear();
    await welcome();
    const app = program
        .name(name)
        .description("CLI to help install tok's template")
        .version(version)
        .addArgument(new Argument('path', 'source code path').argOptional())
        .addOption(new Option('-p, --project-name', ''))
        .addOption(new Option('-t, --template', 'output the version number'))
        .addOption(new Option('-m, --manager', 'output the version number'));
    app.parse(process.argv);
    if (app.args.length < 1)
        app.outputHelp();
    const [$pathname] = app.args;
    const config = await initialQuestion($pathname);
    if (!config.isCached) {
        await storeCache(config);
        infoLog('stored cache', cachedPackage(config.template, config.version));
    }
    await cacheToLocal(config);
    infoLog('Successfully cached to local', config.pathname);
    if (config.createRemoteRepo === 'Yes') {
        const data = await createRepository(config);
        await proceedGit({
            baseDir: config.pathname,
            cloneUrl: data.cloneUrl,
        });
        infoLog('Successfully connected to the remote repository. You can check it at =>', data.url);
    }
    $(config.manager, ['install'], { cwd: config.pathname, shell: isWindows });
}
main();
async function welcome() {
    const welcome = figlet.textSync(name, { horizontalLayout: 'full' });
    console.log(chalk.greenBright(welcome));
}
