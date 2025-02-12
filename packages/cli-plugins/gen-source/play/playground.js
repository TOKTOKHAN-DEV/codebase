import { defineCommand } from '@codebase/cli';
import Enquirer from 'enquirer';
import path from 'path';
import { createPackageRoot, cwd, pathOn, generateCodeFile } from '@codebase/node';
import { removeStr, pass } from '@codebase/universal';
import camelCase from 'lodash/camelCase.js';
import flow$1 from 'lodash/flow.js';
import kebabCase from 'lodash/kebabCase.js';
import { Eta } from 'eta';
import fs from 'fs';
import flow from 'lodash/fp/flow.js';
import prop from 'lodash/fp/prop.js';


// -- Shims --
import cjsUrl from 'node:url';
import cjsPath from 'node:path';
import cjsModule from 'node:module';
const __filename = cjsUrl.fileURLToPath(import.meta.url);
const __dirname = cjsPath.dirname(__filename);
const require = cjsModule.createRequire(import.meta.url);
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

const packageRoot = createPackageRoot(__dirname);

const eta = new Eta({
    views: packageRoot('templates'),
});
const renderDefinedEta = (name, options) => {
    return eta.render(`${name}.template.eta`, options);
};

const isDirectory = (file) => file.isDirectory();
const getSubFolder = (path) => {
    return fs
        .readdirSync(path, {
        encoding: 'utf-8',
        withFileTypes: true,
    })
        .filter(isDirectory);
};
function getTargetFolder(dirs) {
    return __awaiter(this, void 0, void 0, function* () {
        const { target } = yield Enquirer.prompt({
            type: 'autocomplete',
            name: 'target',
            message: 'Select path to be created',
            initial: 0,
            choices: [...dirs],
        });
        return target;
    });
}
function getTargetFolderRecursive(targetFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = fs.readdirSync(targetFolder, {
            encoding: 'utf-8',
            withFileTypes: true,
        });
        const removeBasePath = flow(removeStr(cwd()), //
        (str) => (str.startsWith(path.sep) ? str.substring(1) : str));
        const getNextList = flow(prop('name'), pathOn(targetFolder), removeBasePath);
        const dirs = files
            .filter(isDirectory)
            .map(getNextList)
            .concat([removeBasePath(targetFolder)])
            .reverse();
        const target = yield getTargetFolder(dirs);
        const targetStaticPath = cwd(target);
        const targetSubFolders = getSubFolder(targetStaticPath);
        const isSelectCurrentFolder = targetStaticPath === targetFolder;
        const hasSubFolder = !!targetSubFolders.length;
        const isRecursive = !isSelectCurrentFolder && hasSubFolder;
        if (isRecursive)
            return yield getTargetFolderRecursive(targetStaticPath);
        return targetStaticPath;
    });
}

const pascalCase = (str) => {
    const converted = camelCase(str);
    return converted.charAt(0).toUpperCase() + converted.slice(1);
};

const pathToDashCase = (string) => {
    const normalized = path.normalize(string);
    return normalized
        .split(path.sep)
        .filter((v) => !!v)
        .join('-');
};
const genDynamicPageTemplate = (config) => __awaiter(void 0, void 0, void 0, function* () {
    const pathPath = cwd('src', 'pages');
    const targetPath = yield getTargetFolderRecursive(pathPath);
    const { slugName } = yield Enquirer.prompt({
        type: 'input',
        name: 'slugName',
        message: 'What is your slug name?',
    });
    const removeBasePath = removeStr(cwd(pathPath));
    const pageName = flow$1(pass(targetPath), removeBasePath, pathToDashCase)();
    const isRoot = targetPath === cwd('src', 'pages');
    const pageNameWithSlug = (isRoot ? '' : pascalCase(pageName)) + 'By' + pascalCase(slugName);
    const pageComponent = renderDefinedEta('dynamic-page-component', {
        slug: camelCase(slugName),
        contentName: pageNameWithSlug,
        name: pageNameWithSlug + 'Page',
        pageTitle: `${kebabCase(pageName)} | 상세 페이지`,
    });
    const containerComponent = renderDefinedEta('component', {
        name: pageNameWithSlug,
        props: [
            {
                prop: camelCase(slugName),
                type: 'string | string[]',
                optional: true,
            },
        ],
    });
    const containerIndexComponent = renderDefinedEta('index', {
        exportName: pageNameWithSlug,
        importPath: `./${pageNameWithSlug}`,
    });
    generateCodeFile({
        prettier: { parser: 'babel-ts', configPath: 'auto' },
        outputPath: path.resolve(targetPath, `[${camelCase(slugName)}]`, 'index.tsx'),
    }, pageComponent);
    generateCodeFile({
        prettier: { parser: 'babel-ts', configPath: 'auto' },
        outputPath: cwd('src', //
        'containers', pageNameWithSlug, `${pageNameWithSlug}.tsx`),
    }, containerComponent);
    generateCodeFile({
        prettier: { parser: 'babel-ts', configPath: 'auto' },
        outputPath: cwd('src', //
        'containers', pageNameWithSlug, 'index.ts'),
    }, containerIndexComponent);
});

const genPageTemplate = (config) => __awaiter(void 0, void 0, void 0, function* () {
    const targetPath = yield getTargetFolderRecursive(cwd('src', 'pages'));
    const { pageName } = yield Enquirer.prompt({
        type: 'input',
        name: 'pageName',
        message: 'What is your page name?',
    });
    const pageComponent = renderDefinedEta('page-component', {
        contentName: pascalCase(pageName),
        name: pascalCase(pageName) + 'Page',
        pageTitle: kebabCase(pageName),
    });
    const containerComponent = renderDefinedEta('component', {
        name: pascalCase(pageName),
    });
    const containerIndexComponent = renderDefinedEta('index', {
        exportName: pascalCase(pageName),
        importPath: `./${pascalCase(pageName)}`,
    });
    generateCodeFile({
        prettier: { parser: 'babel-ts', configPath: 'auto' },
        outputPath: path.resolve(targetPath, `${kebabCase(pageName)}`, 'index.tsx'),
    }, pageComponent);
    generateCodeFile({
        prettier: { parser: 'babel-ts', configPath: 'auto' },
        outputPath: cwd('src', //
        'containers', pascalCase(pageName), `${pascalCase(pageName)}.tsx`),
    }, containerComponent);
    generateCodeFile({
        prettier: { parser: 'babel-ts', configPath: 'auto' },
        outputPath: cwd('src', //
        'containers', pascalCase(pageName), 'index.ts'),
    }, containerIndexComponent);
});

/**
 * @category Commands
 */
const genSource = defineCommand({
    name: 'gen:source',
    description: '',
    cliOptions: [
        {
            name: 'appName',
            alias: 'n',
            type: 'string',
            description: 'page tile 을 설정합니다. (default: "Toktokhan")',
        },
    ],
    default: {
        appName: 'Toktokhan',
    },
    run: (config) => __awaiter(void 0, void 0, void 0, function* () {
        const resolvers = {
            page: genPageTemplate,
            'dynamic-page': genDynamicPageTemplate,
        };
        const { type } = yield Enquirer.prompt({
            type: 'autocomplete',
            name: 'type',
            message: 'Select Source Code Type',
            initial: 0,
            choices: Object.keys(resolvers),
        });
        resolvers[type](config);
    }),
});

genSource.run({
    appName: 'Toktokhan2',
});
