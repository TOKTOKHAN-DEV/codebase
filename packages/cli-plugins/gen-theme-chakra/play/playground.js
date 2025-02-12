import { existsSync } from 'fs';
import path from 'path';
import { defineCommand } from '@codebase/cli';
import { boxLog, json, generateCodeFile } from '@codebase/node';
import { pass, createObjBySelector, removeStr, multiply } from '@codebase/universal';
import flow from 'lodash/fp/flow.js';
import mapKeys from 'lodash/fp/mapKeys.js';
import mapValues from 'lodash/fp/mapValues.js';
import prop from 'lodash/fp/prop.js';
import replace from 'lodash/fp/replace.js';
import isObject from 'lodash/isObject.js';
import invert from 'lodash/fp/invert.js';
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
 * 객체의 값이 null 또는 undefined인지 검사하고, 넘겨진 에러 메시지를 throw 하는 함수를 반환합니다.
 */
const assertNullish = (message) => (val) => {
    if (val == null || typeof val === 'undefined')
        throw new Error(message);
    return val;
};

const throwError = (message) => {
    throw boxLog([
        `${message} You can customize "tokenModes" in the "tok-cli.config.ts" file.`,
        `@see https://www.codebase.page/docs/docs/tokript/Offical%20Plugins/gen-theme-chakra#tokenmode`,
    ], { title: 'Message from tokript' });
};

const isNumeric = (v) => {
    return !isNaN(parseFloat(v));
};
const getColorKey = flow(replace(/\s/g, ''), replace(/-/g, '.'));
const getColorTokenKey = flow(getColorKey, (str) => {
    const splitted = str.split('.');
    if (isNumeric(splitted.at(-1))) {
        const temp = [...splitted];
        const last = temp.pop();
        return temp.join('-') + `.${last}`;
    }
    return splitted.join('-');
});
const refColorSchema = (key) => `colorSchema["${key}"]`;
/**
 * 주어진 JSON 객체에서 색상 스키마를 추출하고 변환합니다.
 *
 * @param json - 색상 스키마가 포함된 ThemeToken 객체입니다.
 * @returns 변환된 색상 스키마 객체를 반환합니다.
 */
const getColorSchemaObj = flow(prop('colorSchema'), //
mapKeys(getColorTokenKey), mapValues(flow(prop('value'), assertNullish("not found value. Please check 'colorSchema' value."))));
/**
 * 주어진 값 객체가 유효한 토큰 모드를 가지고 있는지 확인합니다.
 *
 * @param val - 확인할 값 객체입니다.
 * @param tokenModes - 확인할 토큰 모드 객체입니다.
 */
const checkValidToken = (val, tokenModes) => {
    if (!(tokenModes['light'] in val)) {
        throwError('The light key for "tokenModes" is not found in the semanticTokens objects.');
    }
    if (Object.values(val).length === 2 && !(tokenModes['dark'] in val)) {
        throwError(`The dark key for "tokenModes" is not found in the semanticTokens objects.`);
    }
    return;
};
/**
 * 주어진 모드에 따라 토큰 값을 반환합니다.
 *
 * @param mode - 토큰 값을 가져올 모드입니다.
 * @returns 주어진 토큰에 대한 값을 반환하는 함수입니다.
 */
const getTokenValue = (mode) => (token) => {
    const ref = prop(`${mode}.ref`)(token);
    const value = prop(`${mode}.value`)(token);
    if (ref)
        return flow(getColorTokenKey, refColorSchema)(ref);
    return value;
};
/**
 * 주어진 JSON 객체에서 색상 토큰을 추출하고 변환합니다.
 *
 * @param json - 색상 토큰이 포함된 ThemeToken 객체입니다.
 * @param mode - 색상 모드 객체입니다.
 * @returns 변환된 색상 토큰 객체를 반환합니다.
 */
const getColorTokenObj = (json, mode) => flow(pass(json), prop('semanticTokens'), //
mapKeys(getColorKey), mapValues(flow((identity) => {
    checkValidToken(identity, mode);
    return identity;
}, createObjBySelector({
    default: getTokenValue(mode['light']),
    _dark: getTokenValue(mode['dark']),
}))))();
/**
 * 주어진 JSON 객체를 기반으로 색상 스키마와 색상 토큰을 생성하고 렌더링합니다.
 *
 * @param json - 색상 스키마와 색상 토큰이 포함된 ThemeToken 객체입니다.
 * @param tokenModes - 색상 모드 객체입니다.
 * @returns 렌더링된 색상 스키마와 색상 토큰 문자열을 반환합니다.
 */
const renderColor = (json, tokenModes) => {
    const colorSchema = getColorSchemaObj(json);
    const colorToken = getColorTokenObj(json, tokenModes);
    return `
    /**
     * !DO NOT EDIT THIS FILE
     * 
     * gnerated by script: tokript gen:theme
     * 
     * theme color 를 정의하는 곳입니다.
     * dark 모드를 대응하기 위해 semantic token 을 사용해서 정의합니다.
     *
     * @see https://chakra-ui.com/docs/styled-system/semantic-tokens
    **/

    export const colorSchema = ${JSON.stringify(colorSchema, null, 2)}

    export const colors = ${JSON.stringify(colorToken, null, 2)
        .replaceAll(/"colorSchema\[(.*)\]"/g, 'colorSchema[$1]')
        .replaceAll('\\', '')}
  `;
};

const mapObj = (mapper) => (obj) => flow(pass(obj), Object.entries, map(mapper), Object.fromEntries)();

const BREAKPOINT_ORDER = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];
const removeSpace = replace(/\s/g, '');
const coverTextStyleByKey = (key, value) => {
    const percentToNumber = flow(removeStr('%'), //
    Number, multiply(0.01), (number) => {
        return Number(number.toFixed(2));
    });
    switch (key) {
        case 'lineHeight': {
            return percentToNumber(value);
        }
        case 'letterSpacing': {
            return `${percentToNumber(value)}em`;
        }
        default: {
            return value;
        }
    }
};
/**
 * 주어진 객체의 키를 미리 정의된 순서에 따라 정렬합니다.
 *
 * @param obj - 정렬할 키-값 쌍을 포함하는 객체입니다.
 * @returns 키가 미리 정의된 순서대로 정렬된 새 객체를 반환합니다.
 *
 */
const sortKeys = (order) => (obj) => {
    const sortedObj = {};
    order.forEach((key) => {
        if (key in obj) {
            sortedObj[key] = obj[key];
        }
    });
    return sortedObj;
};
/**
 * 주어진 객체의 키를 제공된 키 맵에 따라 매핑합니다. 키 맵에 존재하지 않는 키가 있을 경우,
 * 해당 키가 tokenMode에서 유효하지 않다는 메시지를 로그로 출력합니다.
 * @param obj - 키를 매핑할 객체입니다.
 * @param keyMap - 기존 키를 새로운 키로 매핑하는 객체입니다.
 * @returns 키가 매핑된 새로운 객체를 반환합니다.
 */
const matchKey = (keyMap) => (obj) => mapKeys((key) => {
    if (!keyMap || Object.keys(keyMap).length === 0) {
        return throwError(`The given value requires tokenMode.`);
    }
    if (!(keyMap === null || keyMap === void 0 ? void 0 : keyMap[key])) {
        return throwError(`This "${key}" is not a valid value in tokenMode.`);
    }
    return keyMap[key];
})(obj);
/**
 * 주어진 JSON 객체의 텍스트 스타일을 변환합니다.
 *
 * @param json - 변환할 텍스트 스타일 객체입니다.
 * @param mode - 선택적 키 매핑 객체입니다. 이 객체는 텍스트 스타일의 키를 변환하는 데 사용됩니다.
 * @returns 변환된 텍스트 스타일 객체를 반환합니다.
 */
const getTextStyleObj = (json, mode) => flow(pass(json), mapKeys(removeSpace), mapValues(mapObj(([key, value]) => {
    if (isObject(value)) {
        return [
            key,
            flow(pass(value), matchKey(mode), sortKeys(BREAKPOINT_ORDER), mapValues((value) => coverTextStyleByKey(key, value)))(),
        ];
    }
    return [key, coverTextStyleByKey(key, value)];
})))();
/**
 * 주어진 JSON 객체를 기반으로  chakra-ui theme 에 사용될 파일 컨텐츠를 생성합니다.
 *
 * @param json textStyles의 ThemeToken 객체입니다.
 * @param tokenModes - textStyles 모드 객체입니다.
 * @returns chakra-ui theme에 적용가능한 textStyle이 출력됩니다.
 */
const renderTextStyle = (json, tokenModes) => {
    const modes = tokenModes;
    const swapMode = invert(modes);
    const textStyle = getTextStyleObj(json, swapMode);
    return `
    /**
     * !DO NOT EDIT THIS FILE
     * 
     * generated by script: tokript gen:theme
     * 
     * theme text style 을 정의하는 곳입니다.
     *
     * @see https://chakra-ui.com/docs/styled-system/semantic-tokens
    **/
    
    export const textStyles = ${JSON.stringify(textStyle, null, 2)}
  `;
};

/**
 * @category Commands
 */
const genTheme = defineCommand({
    name: 'gen:theme',
    description: 'theme json 파일기반으로 Chakra theme token 생성합니다. theme json 은 피그마 플러그인으로 부터 생성된 json 파일입니다.',
    default: {
        input: path.resolve('public', 'token.json'),
        output: path.resolve('src', 'generated', 'tokens'),
        tokenModes: {
            colors: { light: 'light', dark: 'dark' },
        },
    },
    cliOptions: [
        {
            name: 'input',
            alias: 'i',
            description: 'theme json 경로',
            type: 'string',
        },
        {
            name: 'output',
            alias: 'o',
            description: 'chakra theme token 생성 폴더',
            type: 'string',
        },
    ],
    run: (config) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        if (!existsSync(config.input)) {
            throw new Error(`theme json file is not found: ${config.input}`);
        }
        const token = json(config.input);
        const colorMode = (_a = config.tokenModes) === null || _a === void 0 ? void 0 : _a.colors;
        const textStyleMode = (_b = config.tokenModes) === null || _b === void 0 ? void 0 : _b.textStyles;
        const color = renderColor(token.colors, {
            light: (colorMode === null || colorMode === void 0 ? void 0 : colorMode.light) || 'light',
            dark: (colorMode === null || colorMode === void 0 ? void 0 : colorMode.dark) || 'dark',
        });
        const textStyle = renderTextStyle(token.textStyles, textStyleMode || {});
        generateCodeFile({
            outputPath: path.resolve(config.output, 'colors.ts'),
            prettier: { parser: 'babel-ts', configPath: 'auto' },
        }, color);
        generateCodeFile({
            outputPath: path.resolve(config.output, 'text-styles.ts'),
            prettier: { parser: 'babel-ts', configPath: 'auto' },
        }, textStyle);
    }),
});

genTheme.run({
    input: 'token.json',
    output: 'generated/theme',
    tokenModes: {
        colors: {
            light: 'light',
            dark: 'dark',
        },
        textStyles: {
            base: 'mobile',
            sm: 'tablet',
            md: 'desktop',
        },
    },
});
