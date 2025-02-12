import { defineCommand } from '@codebase/cli';
import { createPackageRoot, prettierString, withLoading, cwd } from '@codebase/node';
import path from 'path';
import { generateApi } from 'swagger-typescript-api';
import fs from 'fs';
import camelCase from 'lodash/camelCase.js';
import upperFirst from 'lodash/upperFirst.js';


// -- Shims --
import cjsUrl from 'node:url';
import cjsPath from 'node:path';
import cjsModule from 'node:module';
const __filename = cjsUrl.fileURLToPath(import.meta.url);
const __dirname = cjsPath.dirname(__filename);
const require = cjsModule.createRequire(import.meta.url);
const packageRoot = createPackageRoot(__dirname);

const GENERATE_SWAGGER_DATA = {
    CUSTOM_AXIOS_TEMPLATE_FOLDER: packageRoot('templates/custom-axios'),
    CUSTOM_FETCH_TEMPLATE_FOLDER: packageRoot('templates/custom-fetch'),
    EXTRA_TEMPLATE_FOLTER: packageRoot('templates/my'),
    TYPE_FILE: ['react-query-type.ts', 'data-contracts.ts', 'util-types.ts'],
    UTIL_FILE: ['param-serializer-by.ts'],
    QUERY_HOOK_INDICATOR: '@indicator-for-query-hook',
    USE_SUSPENSE_QUERY_HOOK_INDICATOR: '@indicator-for-use-suspense-query-hook',
    AXIOS_DEFAULT_INSTANCE_PATH: '@/configs/axios/instance',
    FETCH_DEFAULT_INSTANCE_PATH: '@/configs/fetch/fetch-extend',
};

const { EXTRA_TEMPLATE_FOLTER, CUSTOM_AXIOS_TEMPLATE_FOLDER, CUSTOM_FETCH_TEMPLATE_FOLDER, QUERY_HOOK_INDICATOR: QUERY_HOOK_INDICATOR$1, USE_SUSPENSE_QUERY_HOOK_INDICATOR: USE_SUSPENSE_QUERY_HOOK_INDICATOR$1, } = GENERATE_SWAGGER_DATA;
const parseSwagger = (config) => generateApi({
    templates: config.httpClientType === 'axios' ?
        CUSTOM_AXIOS_TEMPLATE_FOLDER
        : CUSTOM_FETCH_TEMPLATE_FOLDER,
    modular: true,
    moduleNameFirstTag: true,
    extractEnums: true,
    addReadonly: true,
    unwrapResponseData: true,
    url: config.swaggerSchemaUrl,
    input: config.swaggerSchemaUrl,
    httpClientType: config.httpClientType, // "axios" or "fetch"
    typeSuffix: 'Type',
    prettier: {
        printWidth: 120,
    },
    extraTemplates: [
        {
            name: 'react-query-type.ts', //
            path: path.resolve(EXTRA_TEMPLATE_FOLTER, 'react-query-type.eta'),
        },
        {
            name: 'util-types.ts', //
            path: path.resolve(EXTRA_TEMPLATE_FOLTER, 'util-types.eta'),
        },
        {
            name: 'param-serializer-by.ts', //
            path: path.resolve(EXTRA_TEMPLATE_FOLTER, 'param-serializer-by.eta'),
        },
    ],
    hooks: {
        onPrepareConfig: (defaultConfig) => {
            return {
                ...defaultConfig,
                myConfig: {
                    QUERY_HOOK_INDICATOR: QUERY_HOOK_INDICATOR$1,
                    USE_SUSPENSE_QUERY_HOOK_INDICATOR: USE_SUSPENSE_QUERY_HOOK_INDICATOR$1,
                    ...config,
                },
            };
        },
    },
});

const { TYPE_FILE, UTIL_FILE, QUERY_HOOK_INDICATOR, USE_SUSPENSE_QUERY_HOOK_INDICATOR, } = GENERATE_SWAGGER_DATA;
const writeSwaggerApiFile = (params) => {
    const { input, output, spinner, config } = params;
    input.files.forEach(async ({ fileName, fileContent: content, fileExtension }) => {
        const name = fileName + fileExtension;
        try {
            const isTypeFile = TYPE_FILE.includes(name);
            const isUtilFile = UTIL_FILE.includes(name);
            const isHttpClient = name === 'http-client.ts';
            const isApiFile = content?.includes(QUERY_HOOK_INDICATOR);
            const filename = name.replace('.ts', '');
            const getTargetFolder = () => {
                if (isUtilFile)
                    return path.resolve(output, '@utils');
                if (isTypeFile)
                    return path.resolve(output, '@types');
                if (isHttpClient)
                    return path.resolve(output, `@${filename}`);
                return path.resolve(output, filename);
            };
            const targetFolder = getTargetFolder();
            fs.mkdirSync(targetFolder, { recursive: true });
            if (spinner)
                spinner.info(`generated: ${targetFolder}`);
            if (isHttpClient) {
                generate(path.resolve(targetFolder, 'index.ts'), content);
                return;
            }
            if (isApiFile) {
                const { apiContents, hookParts } = splitHookContents(filename, content);
                generatePretty(path.resolve(targetFolder, `${filename}.api.ts`), apiContents);
                if (config.includeReactQuery) {
                    generatePretty(path.resolve(targetFolder, `${filename}.query.ts`), hookParts[0]);
                }
                if (config.includeReactSuspenseQuery) {
                    generatePretty(path.resolve(targetFolder, `${filename}.suspenseQuery.ts`), hookParts[1]);
                }
                return;
            }
            generate(path.resolve(targetFolder, name), content);
        }
        catch (err) {
            console.error(err);
        }
    });
};
async function generatePretty(path, contents) {
    const organized = await prettierString(contents, {
        parser: 'babel-ts',
        plugins: ['prettier-plugin-organize-imports'],
    });
    const formatted = await prettierString(organized, {
        parser: 'typescript',
        configPath: 'auto',
    });
    generate(path, formatted);
}
function generate(path, contents) {
    fs.writeFileSync(path, contents);
}
function splitHookContents(filename, content) {
    const [_apiContent, _hookContent] = content.split(QUERY_HOOK_INDICATOR);
    const _hookParts = _hookContent.split(USE_SUSPENSE_QUERY_HOOK_INDICATOR);
    const lastImport = getLastImportLine(content);
    const lines = content.split('\n');
    const importArea = [
        `import { ${upperFirst(camelCase(filename))}Api } from './${filename}.api';`,
        ...lines.slice(0, lastImport),
    ].join('\n');
    return {
        apiContents: _apiContent,
        hookParts: _hookParts.map((d) => importArea + d),
    };
}
function getLastImportLine(content) {
    return (Math.max(...content
        .split('\n')
        .map((line, idx) => ({ idx, has: /from ('|").*('|");/.test(line) }))
        .filter(({ has }) => has)
        .map(({ idx }) => idx)) + 1);
}

/**
 * @category Commands
 */
const genApi = defineCommand({
    name: 'gen:api',
    description: 'swagger schema 를 기반으로 api 를 생성합니다.',
    cliOptions: [],
    default: {
        swaggerSchemaUrl: '',
        output: 'src/generated/apis',
        includeReactQuery: true,
        includeReactSuspenseQuery: false,
        httpClientType: 'axios',
        instancePath: GENERATE_SWAGGER_DATA.AXIOS_DEFAULT_INSTANCE_PATH,
        paginationSets: [
            {
                keywords: ['cursor'],
                nextKey: 'cursor',
            },
        ],
    },
    run: async (config) => {
        const isWebUrl = (string) => string.startsWith('http://') || string.startsWith('https://');
        const coverPath = (config) => {
            const { httpClientType, swaggerSchemaUrl, output } = config;
            const { AXIOS_DEFAULT_INSTANCE_PATH, FETCH_DEFAULT_INSTANCE_PATH } = GENERATE_SWAGGER_DATA;
            const instancePath = config.instancePath ||
                (httpClientType === 'axios' ?
                    AXIOS_DEFAULT_INSTANCE_PATH
                    : FETCH_DEFAULT_INSTANCE_PATH);
            return {
                ...config,
                instancePath,
                swaggerSchemaUrl: isWebUrl(swaggerSchemaUrl) ? swaggerSchemaUrl : cwd(swaggerSchemaUrl),
                output: cwd(output),
            };
        };
        const covered = coverPath(config);
        const parsed = await withLoading(`Parse Swagger`, covered.swaggerSchemaUrl, () => {
            return parseSwagger(covered);
        });
        if (!parsed) {
            console.error('Failed to generate api: swagger parse error.');
            return;
        }
        withLoading('Write Swagger API', //
        covered.output, (spinner) => {
            writeSwaggerApiFile({
                input: parsed,
                output: covered.output,
                spinner,
                config,
            });
        });
    },
});

genApi.run({
    swaggerSchemaUrl: `https://sales-api-dev.pluuug.com/openapi.json/`,
    output: 'test/generated/apis',
    includeReactQuery: true,
    includeReactSuspenseQuery: true,
    httpClientType: 'axios',
    instancePath: 'test/generated/apis/http-client',
    paginationSets: [
        {
            keywords: ['cursor'],
            nextKey: 'cursor',
        },
    ],
});
