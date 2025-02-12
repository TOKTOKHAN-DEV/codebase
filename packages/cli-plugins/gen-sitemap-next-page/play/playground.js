import { pass, isNullish, prefix, awaited, removeStr, log, not, createObjBySelector, relay } from '@codebase/universal';
import range from 'lodash/range.js';
import path from 'path';
import { defineCommand } from '@codebase/cli';
import { pathOn, generateCodeFile } from '@codebase/node';
import { globby } from 'globby';
import flatMap from 'lodash/flatMap.js';
import filter from 'lodash/fp/filter.js';
import flow from 'lodash/fp/flow.js';
import map from 'lodash/fp/map.js';
import union from 'lodash/fp/union.js';
import find from 'lodash/fp/find.js';
import prop from 'lodash/fp/prop.js';
import { isMatch } from 'matcher';

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

const isInWildcard = (target) => (patterns) => isMatch(target, patterns);
const findKeyHasWildCard = (obj) => (key) => flow(pass(obj), Object.entries, find(flow(prop(1), find(isInWildcard(key)))), prop(0))();
const renderSitemap = (sites) => {
    return `
  <?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${sites
        .map(({ changefreq, loc, priority }) => {
        return `<url>
                <loc>${loc}</loc>
                ${isNullish(priority) ? '' : `<priority>${priority}</priority>`}
                ${isNullish(changefreq) ? '' : `<changefreq>${changefreq}</changefreq>`}
              </url>`;
    })
        .join('\n')}
  </urlset> 
  `;
};
const routesBy = (routeMapper) => (route) => __awaiter(void 0, void 0, void 0, function* () {
    const routes = routeMapper === null || routeMapper === void 0 ? void 0 : routeMapper[route];
    if (typeof routes === 'function') {
        return routes();
    }
    if (routes) {
        return routes;
    }
    return route;
});
const hasDynamicRoute = (str) => !!str.match(/\[.*\]/);

/**
 * @category Commands
 */
const genSitemap = defineCommand({
    name: 'gen:sitemap',
    description: 'next.js page router 에서 pages 폴더 기반으로 sitemap.xml 파일을 생성합니다.',
    cliOptions: [
        {
            name: 'domain',
            alias: 'd',
            type: 'string',
            description: '도메인 주소입니다.',
        },
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
            name: 'includes',
            alias: 'ic',
            type: 'string[]',
            description: 'sitemap 에 포함되는 파일 glob 패턴 입니다.',
        },
        {
            name: 'ignored',
            alias: 'ig',
            type: 'string[]',
            description: 'sitemap 에 포함되지 않는 파일 glob 패턴 입니다.',
        },
    ],
    default: {
        input: './pages',
        output: './public/sitemap.xml',
        routerType: 'page',
        includes: ['**/*.{ts,tsx}'],
        ignored: [
            '**/api/**',
            '**/_app.{ts,tsx}',
            '**/_document.{ts,tsx}',
            '**/_error.{ts,tsx}',
        ],
    },
    run: (config) => __awaiter(void 0, void 0, void 0, function* () {
        const { domain, input, output, routerType, changefreq, priority, ignored, includes, routeMapper, } = config;
        if (!domain) {
            throw new Error('domain is required');
        }
        const removeTarget = routerType === 'page' ? 'index' : 'page';
        const removeTargetRegex = new RegExp(`/?${removeTarget}(\\.tsx|\\.ts|\\.js|\\.jsx)?$`, 'g');
        flow(pass(includes === null || includes === void 0 ? void 0 : includes.map(pathOn(input))), union(ignored === null || ignored === void 0 ? void 0 : ignored.map(flow(pathOn(input), prefix('!')))), globby, awaited(map(flow((t) => path.relative(input, t), removeStr(removeTargetRegex), prefix('/'), routesBy(routeMapper)))), awaited((d) => Promise.all(d)), awaited(flow(log("sitemap's routes"), flatMap, filter(not(hasDynamicRoute)), map(createObjBySelector({
            loc: pathOn(domain),
            priority: findKeyHasWildCard(priority || {}),
            changefreq: findKeyHasWildCard(changefreq || {}),
        })), renderSitemap, generateCodeFile({
            outputPath: output,
            prettier: {
                parser: 'html',
            },
        }))))();
    }),
});

// console.log(path.relative(path.resolve('./pages'), path.resolve('./pages/index.tsx'))
const list = range(0, 100);
const getList = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { offset, limit } = params;
    const next = offset + limit;
    return {
        total: list.length,
        next: list.length - 1 < next ? null : next,
        data: list.slice(offset, offset + limit),
    };
});
genSitemap.run({
    domain: 'https://example.com',
    input: './pages',
    output: './public/sitemap.xml',
    includes: ['**/*.{ts,tsx}'],
    ignored: ['**/_app.{ts,tsx}', '**/_document.{ts,tsx}', '**/_error.{ts,tsx}'],
    routerType: 'page',
    routeMapper: {
        '/goods/[id]': relay({
            initialParam: 0,
            getNext: (nextParam) => getList({ offset: nextParam, limit: 10 }),
            getNextParams: (last) => last === null || last === void 0 ? void 0 : last.next,
            selector: (pages) => pages.map((p) => p.data.map((id) => `/goods/${id}`)).flat(),
        }),
    },
    priority: {
        1: ['/'],
        0.5: ['/payment/*', ['/goods/*', '!/goods/review']],
    },
    changefreq: {
        always: [],
        daily: [],
        hourly: ['/payment/*'],
        monthly: [],
        never: [],
        weekly: [],
        yearly: [],
    },
});
