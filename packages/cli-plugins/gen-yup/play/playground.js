import path from 'path';
import { defineCommand } from '@codebase/cli';
import fs from 'fs';
import { createPackageRoot, cwd } from '@codebase/node';
import { Eta } from 'eta';
import clear from 'clear';
import enquirer from 'enquirer';


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

/**
 * @description i: fooBar / o: FOO_BAR
 * @param str camelCase 문자열
 */
function addUnderscoreToCamelCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
}

/**
 * @description i: Foo / o: foo
 * @param str 문자열
 */
function convertLowerCase(str) {
    return `${str.charAt(0).toLowerCase()}${str.slice(1)}`;
}

/**
 * @description object 2개의 차집합을 반환합니다.
 * @param objA Record<string, string>
 * @param objB Record<string, string>
 */
const differenceOfSets = (objA, objB) => {
    const keysA = Object.keys(objA);
    const keysB = new Set(Object.keys(objB));
    const differenceKeys = keysA.filter((key) => !keysB.has(key));
    const result = {};
    for (const key of differenceKeys) {
        result[key] = objA[key];
    }
    return result;
};

/**
 * @description 배열에 담긴 Object를 반환합니다.
 * @param object Record<string, string>
 */
const mappedObject = (object) => {
    return Object.entries(object).reduce((acc, [name, value]) => [...acc, { name, value }], []);
};

/**
 * @description use{str}에서 use를 제거합니다.
 * @param str hook의 이름입니다.
 */
const removeUse = (str) => {
    if (str.startsWith('use')) {
        return str.slice(3);
    }
    return str;
};

/**
 * @description 공통으로 사용되는 yup schema syntax를 반환합니다.
 * @param name string
 * @param requiredText required(HELPER_TEXT['REQUIRED_INPUT']) | optional()
 * @param [additionalTests = ''] string
 */
const getStringSchema = (name, requiredText, additionalTests = '') => {
    return `${name}: yup
      .string()
      ${additionalTests ? `.${requiredText}${additionalTests},` : `.${requiredText},`}`;
};

const AddressSchema = {
    postcode: (requiredOrNot) => getStringSchema('postcode', requiredOrNot, `
        .min(4, HELPER_TEXT['POSTCODE'])
        .max(20, HELPER_TEXT['POSTCODE'])
        .matches(REGEX['POSTCODE_EXCEPT_HYPHEN'], HELPER_TEXT['POSTCODE'])`),
    addressMain: (requiredOrNot) => getStringSchema('addressMain', requiredOrNot, `.max(100, HELPER_TEXT['ADDRESS_MAIN_MAX'])`),
    addressDetail: (requiredOrNot) => getStringSchema('addressDetail', requiredOrNot, `.max(100, HELPER_TEXT['ADDRESS_DETAIL_MAX'])`),
    city: (requiredOrNot) => getStringSchema('city', requiredOrNot, `.max(100, HELPER_TEXT['CITY_MAX'])`),
    region: (requiredOrNot) => getStringSchema('region', requiredOrNot, `.max(50, HELPER_TEXT['REGION_MAX'])`),
};

const AuthenticationSchema = {
    id: (requiredOrNot) => getStringSchema('id', requiredOrNot, `
        .test(
        HELPER_TEXT['ID_SPECIAL_CHARACTER'],
        HELPER_TEXT['ID_SPECIAL_CHARACTER'],
        (value) => !REGEX['SPECIAL_CHARACTER'].test(value || ''),
        )
        .matches(REGEX['ID'], HELPER_TEXT['ID_COMMON'])`),
    email: (requiredOrNot) => getStringSchema('email', requiredOrNot, `.matches(REGEX['EMAIL'], HELPER_TEXT['EMAIL_COMMON'])`),
    password: (requiredOrNot) => getStringSchema('password', requiredOrNot, `.matches(REGEX['PASSWORD'], HELPER_TEXT['PASSWORD_COMMON'])`),
    passwordConfirm: (requiredOrNot) => getStringSchema('passwordConfirm', requiredOrNot, `.oneOf([yup.ref('password')], HELPER_TEXT['PASSWORD_NOT_EQ'])`),
    newPassword: (requiredOrNot) => getStringSchema('newPassword', requiredOrNot, `.matches(REGEX['PASSWORD'], HELPER_TEXT['PASSWORD_COMMON'])`),
    newPasswordConfirm: (requiredOrNot) => getStringSchema('newPasswordConfirm', requiredOrNot, `.oneOf([yup.ref('newPassword')], HELPER_TEXT['PASSWORD_NOT_EQ'])`),
};

/**
 * @description 내국인 혹은 외국인의 이름은 공통된 규칙을 적용합니다.
 * @param name username | firstName | lastName
 * @param requiredText required(HELPER_TEXT['REQUIRED_INPUT']) | optional()
 */
const getNameDetailSchema = (name, requiredText) => {
    return getStringSchema(name, requiredText, `
      .min(2, HELPER_TEXT['USERNAME_MIN'])
      .max(20, HELPER_TEXT['USERNAME_MAX'])
      .test(
        HELPER_TEXT['USERNAME_SPECIAL_CHARACTER'],
        HELPER_TEXT['USERNAME_SPECIAL_CHARACTER'],
        (value) => !REGEX['SPECIAL_CHARACTER'].test(value || ''),
      )
      .matches(REGEX['USERNAME'], HELPER_TEXT['USERNAME_COMMON'])`);
};

const ProfileSchema = {
    phone: (requiredOrNot) => getStringSchema('phone', requiredOrNot, `.matches(REGEX['PHONE'], HELPER_TEXT['PHONE'])`),
    cellPhone: (requiredOrNot) => getStringSchema('cellPhone', requiredOrNot, `.matches(REGEX['CELL_PHONE'], HELPER_TEXT['CELL_PHONE'])`),
    businessPhone: (requiredOrNot) => getStringSchema('businessPhone', requiredOrNot, `.matches(REGEX['BUSINESS_PHONE'], HELPER_TEXT['BUSINESS_PHONE'])`),
    birthdate: (requiredOrNot) => getStringSchema('birthdate', requiredOrNot, `
        .matches(REGEX['BIRTHDATE_COMMON'], HELPER_TEXT['BIRTHDATE_COMMON'])
        .matches(
        REGEX['BIRTHDATE_DETAIL_FORMAT'],
        HELPER_TEXT['BIRTHDATE_DETAIL_FORMAT'],
        )`),
    nickname: (requiredOrNot) => getStringSchema('nickname', requiredOrNot, `
        .min(2, HELPER_TEXT['NICKNAME_MIN'])
        .nullable()
        .transform((value) => (!!value ? value : null))
        .max(10, HELPER_TEXT['NICKNAME_MAX'])
        .test(
        HELPER_TEXT['NICKNAME_SPECIAL_CHARACTER'],
        HELPER_TEXT['NICKNAME_SPECIAL_CHARACTER'],
        (value) => !REGEX['SPECIAL_CHARACTER'].test(value || ''),
        )
        .matches(REGEX['NICKNAME'], HELPER_TEXT['NICKNAME_COMMON'])`),
    username: (requiredOrNot) => getNameDetailSchema('username', requiredOrNot),
    firstName: (requiredOrNot) => getNameDetailSchema('firstName', requiredOrNot),
    lastName: (requiredOrNot) => getNameDetailSchema('lastName', requiredOrNot),
};

/**
 * @description required(...) 혹은 optional()를 반환합니다.
 * @param type required | not_required
 */
const getRequiredOrNot = (type) => {
    return type === 'required' ?
        "required(HELPER_TEXT['REQUIRED_INPUT'])"
        : 'optional()';
};

const schemaDetailMap = Object.assign(Object.assign(Object.assign({}, ProfileSchema), AuthenticationSchema), AddressSchema);
function getDetailSchema({ value, type }) {
    const fn = schemaDetailMap[value];
    if (fn) {
        return fn(getRequiredOrNot(type));
    }
    return getStringSchema(value, getRequiredOrNot(type));
}

const createValidationConfig = ({ output, outputConstants, importConstants }) => (arg) => {
    const { hookName, selectedSchema } = arg;
    const eta = new Eta({
        views: path.join(packageRoot('templates/custom')),
    });
    const etaConstants = new Eta({
        views: path.join(packageRoot('templates/constants')),
    });
    const outputPath = output || path.resolve(cwd('src', 'generated', 'hooks'));
    const outputConstantsPath = outputConstants || path.resolve(cwd('src', 'generated', 'constants'));
    const importConstantsPath = importConstants || '../constants';
    const config = {
        data: {
            hookName: removeUse(hookName),
            selectedSchema,
        },
        utils: {
            addUnderscoreToCamelCase,
            convertLowerCase,
            getDetailSchema,
        },
        config: {
            importConstantsPath,
        },
    };
    const view = eta.render('signup.eta', config);
    const targetPath = path.resolve(outputPath, `${hookName}.ts`);
    fs.mkdirSync(outputPath, { recursive: true });
    fs.writeFileSync(targetPath, view, 'utf-8');
    fs.mkdirSync(outputConstantsPath, { recursive: true });
    (function () {
        ['helper-text', 'regex'].forEach((name) => {
            const view = etaConstants.render(`${name}.eta`, config);
            const targetPath = path.resolve(outputConstantsPath, `${name}.ts`);
            fs.writeFileSync(targetPath, view, 'utf-8');
        });
    })();
};

const schemaList = [
    { name: '아이디', value: 'id' },
    { name: '비밀번호', value: 'password' },
    { name: '비밀번호_확인', value: 'passwordConfirm' },
    { name: '새_비밀번호', value: 'newPassword' },
    { name: '새_비밀번호_확인', value: 'newPasswordConfirm' },
    { name: '이메일', value: 'email' },
    { name: '이메일_인증번호', value: 'emailVerificationCode' },
    { name: '휴대폰_번호', value: 'cellPhone' },
    { name: '휴대폰_인증번호', value: 'cellPhoneVerificationCode' },
    { name: '유선_번호', value: 'phone' },
    { name: '회사_번호', value: 'businessPhone' },
    { name: '생년월일', value: 'birthdate' },
    { name: '닉네임', value: 'nickname' },
    { name: '우편번호', value: 'postcode' },
    { name: '기본주소', value: 'addressMain' },
    { name: '상세주소', value: 'addressDetail' },
    { name: '도시', value: 'city' },
    { name: '주/지역', value: 'region' },
    { name: '이름_(username)', value: 'username' },
    { name: '이름_(first_name)', value: 'firstName' },
    { name: '성_(last_name)', value: 'lastName' },
];

const generatePrompt = () => __awaiter(void 0, void 0, void 0, function* () {
    clear();
    const { hook: { result: hookName }, } = yield enquirer.prompt({
        type: 'snippet',
        name: 'hook',
        message: 'hook 이름',
        required: true,
        template: `use\${name}Form`,
    });
    const { schema } = yield enquirer.prompt({
        type: 'multiselect',
        name: 'schema',
        message: '필요한 Schema (Space 선택 / Enter 확정)',
        choices: schemaList,
        result(value) {
            if (!value.length) {
                throw new Error('최소 한 개 이상 선택해 주세요');
            }
            return this === null || this === void 0 ? void 0 : this.map(value);
        },
    });
    const { requiredSchema } = yield enquirer.prompt({
        type: 'multiselect',
        name: 'requiredSchema',
        message: '필수 Schema (Space 선택 / Enter 확정)',
        choices: mappedObject(schema),
        result(value) {
            if (!value.length) {
                throw new Error('최소 한 개 이상 선택해 주세요');
            }
            return this === null || this === void 0 ? void 0 : this.map(value || []);
        },
    });
    const notRequiredSchema = differenceOfSets(schema, requiredSchema);
    return {
        hookName,
        selectedSchema: {
            required: mappedObject(requiredSchema),
            notRequired: mappedObject(notRequiredSchema),
        },
    };
});

/**
 * @category Commands
 */
const genYup = defineCommand({
    name: 'gen:yup',
    description: 'Generate Yup schema file with RHF',
    cliOptions: [
        {
            name: 'output',
            alias: 'o',
            type: 'string',
            description: '생성될 파일이 위치할 경로입니다.',
        },
        {
            name: 'outputConstants',
            alias: 'oc',
            type: 'string',
            description: '정규표현식, 헬퍼텍스트 폴더가 위치할 경로입니다.',
        },
        {
            name: 'importConstants',
            alias: 'ic',
            type: 'string',
            description: '정규표현식, 헬퍼텍스트를 불러올 경로입니다.',
        },
    ],
    default: {
        output: path.resolve('src', 'generated', 'hooks'),
        outputConstants: path.resolve('src', 'generated', 'constants'),
        importConstants: '@/generated/constants',
    },
    run: (config) => __awaiter(void 0, void 0, void 0, function* () {
        generatePrompt().then(createValidationConfig(config));
    }),
});

console.log('Hi');
genYup.run({});
