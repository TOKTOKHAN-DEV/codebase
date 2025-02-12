import path from 'path';
import { defineCommand } from '@codebase/cli';
import { convertFilePathToObject, cwd, generateCodeFile } from '@codebase/node';
import { flatObject } from '@codebase/universal';
import camelCase from 'lodash/camelCase.js';
import startCase from 'lodash/startCase.js';
import flow from 'lodash/fp/flow.js';
import join from 'lodash/fp/join.js';
import map from 'lodash/fp/map.js';

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
 * 지정된 경로의 `svg`파일 기반으로 **Chakra UI Icon Component** 를 생성합니다.
 *
 * @packageDocumentation
 */
const toPascalCase = (str) => startCase(camelCase(str)).replace(/ /g, '');
/**
 * @category Commands
 */
const genIcon = defineCommand({
    name: 'gen:icon',
    description: 'Generate Chakra-UI Icon Component from svg files in the folder.',
    cliOptions: [
        {
            name: 'input',
            alias: 'i',
            type: 'string',
            description: '조회할 svg 파일들이 포함되어있는 폴더 입니다.',
        },
        {
            name: 'output',
            alias: 'o',
            type: 'string',
            description: '생성될 파일이 위치할 경로입니다.',
        },
        {
            name: 'ignored',
            alias: 'ig',
            type: 'string[]',
            description: '제외 될 아이콘 컴포넌트 파일을 판별하는 패턴으로써, 파일이름이 패턴과 일치할 경우에 객체에서 제외 됩니다.',
        },
    ],
    default: {
        input: 'public',
        output: path.resolve('src', 'generated', 'icons', 'MyIcons.tsx'),
        ignored: ['*node_module*'],
        basePath: '/',
    },
    run: (config) => __awaiter(void 0, void 0, void 0, function* () {
        const { 
        //
        input, output, ignored, basePath, } = config;
        if (!input)
            throw new Error('input is required');
        if (!output)
            throw new Error('output is required');
        const svgRegex = ['*.svg'];
        const pathObj = convertFilePathToObject({
            includingPattern: svgRegex === null || svgRegex === void 0 ? void 0 : svgRegex.map((pattern) => path.join('**', pattern)),
            ignoredPattern: ignored,
            basePath,
            formatValue: (data) => ({ path: data.path }),
        }, cwd(input));
        const flatten = flatObject({
            formatKey: (parentKey, currentKey) => {
                return toPascalCase([parentKey, currentKey].join(' '));
            },
            isValueType: (value) => {
                return typeof value === 'object' && typeof value.path === 'string';
            },
        }, pathObj);
        flow(Object.entries, map(([key, { path }]) => `export { default as ${key}Icon } from '${path}';`), join('\n'), generateCodeFile({
            outputPath: output,
            prettier: {
                configPath: 'auto',
            },
        }))(flatten);
    }),
});

console.log('Hi');
genIcon.run({
    input: './public/icons',
    output: './public/MyIcon.tsx',
    basePath: '@/assets',
});
