import path from 'path';
import util from 'util';
import { defineCommand } from '@codebase/cli';
import { convertFilePathToObject, cwd, renderExportConst, generateCodeFile } from '@codebase/node';
import { flatObject } from '@codebase/universal';
import snakeCase from 'lodash/snakeCase.js';


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

/**
 * @category Commands
 */
const genImg = defineCommand({
    name: 'gen:img',
    description: 'Generate image object from image files in the folder.',
    cliOptions: [
        {
            name: 'input',
            alias: 'i',
            type: 'string',
            description: '조회할 img 파일들이 포함되어있는 폴더 입니다.',
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
            description: '생성될 image 객체의 이름입니다',
        },
        {
            name: 'basePath',
            alias: 'b',
            type: 'string',
            description: '생성될 객체의 value 에 할당될 경로의 base-path 입니다',
        },
        {
            name: 'includes',
            alias: 'ic',
            type: 'string[]',
            description: '생성될 이미지 파일을 판별하는 패턴으로써, 파일이름이 패턴과 일치할 경우에만 객체에 포함됩니다.',
        },
        {
            name: 'ignored',
            alias: 'ig',
            type: 'string[]',
            description: '제외 될 이미지 파일을 판별하는 패턴으로써, 파일이름이 패턴과 일치할 경우에 객체에서 제외 됩니다.',
        },
        {
            name: 'oneDepth',
            alias: 'od',
            type: 'boolean',
            description: 'one depth  가 true 일 경우, 폴더 구조를 무시하고 one depth 로 객체를 생성합니다.',
        },
    ],
    default: {
        input: 'public',
        output: path.resolve('src', 'generated', 'path', 'images.ts'),
        displayName: 'MY_IMAGES',
        basePath: '/',
        includes: ['*.jpg', '*.png', '*.svg', '*.jpeg', '*.webp'],
        ignored: ['*node_module*'],
        oneDepth: true,
        formatKey: (string) => {
            return snakeCase(string).toUpperCase();
        },
    },
    run: (config) => __awaiter(void 0, void 0, void 0, function* () {
        const { 
        //
        input, output, ignored, displayName, includes, basePath, } = config;
        if (!input)
            throw new Error('input is required');
        if (!output)
            throw new Error('output is required');
        if (!displayName)
            throw new Error('displayName is required');
        const pathObj = convertFilePathToObject({
            includingPattern: includes === null || includes === void 0 ? void 0 : includes.map((pattern) => path.join('**', pattern)),
            ignoredPattern: ignored,
            basePath,
            formatValue: (data) => `require("${data.path}")`,
        }, cwd(input));
        const flatten = flatObject({
            formatKey: (parentKey, currentKey) => {
                return snakeCase([parentKey, currentKey].join(' ')).toUpperCase();
            },
            isValueType: (_value) => {
                return typeof _value === 'string';
            },
        }, pathObj);
        const view = renderExportConst(displayName, util.inspect(config.oneDepth ? flatten : pathObj, { depth: Infinity }));
        const replaced = view.replace(/['"]require\((".*")\)['"]/gi, (_, grouped) => `require(${grouped})`);
        generateCodeFile({
            outputPath: output,
            prettier: {
                configPath: 'auto',
            },
        }, replaced);
    }),
});

console.log('Hi');
genImg.run({
    input: './public/img',
    output: './public/MyImage.ts',
    displayName: 'MY_IMAGES2',
    oneDepth: true,
    basePath: '@/assets',
});
