import path from 'path';
import util from 'util';
import { defineCommand } from '@codebase/cli';
import { convertFilePathToObject, renderExportConst, generateCodeFile, cwd } from '@codebase/node';
import { keep, flatObject } from '@codebase/universal';
import compact from 'lodash/compact.js';
import flow from 'lodash/flow.js';
import snakeCase from 'lodash/snakeCase.js';

/**
 * @category Commands
 */
const genRoutePage = defineCommand({
    name: 'gen:route',
    description: 'Generate route object from page files in the folder.',
    cliOptions: [
        {
            name: 'input',
            alias: 'i',
            type: 'string',
            description: '조회할 page 파일들이 포함되어있는 폴더 입니다.',
        },
        {
            name: 'output',
            alias: 'o',
            type: 'string',
            description: '생성될 파일이 위치할 경로입니다.',
        },
        {
            name: 'displayName',
            alias: 'd',
            type: 'string',
            description: '생성될 route 객체의 이름입니다',
        },
        {
            name: 'includes',
            alias: 'ic',
            type: 'string[]',
            description: '포함할 route 의 glob 패턴입니다.',
        },
        {
            name: 'ignored',
            alias: 'ig',
            type: 'string[]',
            description: '제외할 route 의 glob 패턴입니다.',
        },
        {
            name: 'oneDepth',
            alias: 'od',
            type: 'boolean',
            description: 'one depth  가 true 일 경우, 폴더 구조를 무시하고 one depth 로 객체를 생성합니다.',
        },
    ],
    default: {
        input: 'src/pages',
        output: 'src/generated/path/routes.ts',
        displayName: 'ROUTES',
        ignored: ['_app.tsx', '_document.tsx', '_error.tsx', 'api/**'],
    },
    run: flow(keep, keep.map(prop('input')), keep.map(firstArg(cwd)), keep.map((value, kept) => {
        var _a, _b;
        return convertFilePathToObject({
            basePath: '/',
            includingPattern: (_a = kept.includes) === null || _a === void 0 ? void 0 : _a.map(globAllDir),
            ignoredPattern: (_b = kept.ignored) === null || _b === void 0 ? void 0 : _b.map(globAllDir),
            formatKey: getRouteKey,
            formatValue: getRouteValue,
        }, value);
    }), keep.map((value, kept) => kept.oneDepth ? flatObject({ formatKey: getFlatObjKey }, value) : value), keep.map(generateRouteFile)),
});
function prop(key) {
    return (obj) => obj[key];
}
function firstArg(fn) {
    return (...param) => fn(param[0]);
}
function globAllDir(pattern) {
    return path.join('**', pattern);
}
function getRouteKey(key) {
    if (key === 'index')
        return 'MAIN';
    const [dynamicPattern] = Array.from(key.matchAll(/\[(.*?)\]/g));
    if (dynamicPattern === null || dynamicPattern === void 0 ? void 0 : dynamicPattern[1])
        return snakeCase(`by ${dynamicPattern[1]}`).toUpperCase();
    return snakeCase(key).toUpperCase();
}
function getRouteValue(data) {
    const replaced = data.path.replace(/\.(tsx|ts)$/, '').replace(/index/, '');
    if (replaced.endsWith('/'))
        return replaced.substring(0, replaced.length - 1) || '/';
    return replaced;
}
function getFlatObjKey(parentKey, currentKey) {
    return snakeCase(compact([parentKey, currentKey]).join(' ')).toUpperCase();
}
function generateRouteFile(data, config) {
    if (!config.displayName)
        throw new Error('displayName is required');
    if (!config.output)
        throw new Error('output is required');
    const view = renderExportConst(config.displayName, util.inspect(data, { depth: Infinity }));
    generateCodeFile({ outputPath: config.output }, view);
}

console.log('Hi');
genRoutePage.run({
    input: '.mock/pages',
    output: '.mock/generated/routes.ts',
    displayName: 'ROUTES',
    ignored: ['_app.tsx', '_document.tsx', '_error.tsx', 'api/**'],
    oneDepth: true,
});
