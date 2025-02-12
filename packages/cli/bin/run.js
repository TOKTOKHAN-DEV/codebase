#!/usr/bin/env node
import { Command } from 'commander';
import { json } from '@codebase/node';
import chalk from 'chalk';
import clear from 'clear';
import enquirer from 'enquirer';
import figlet from 'figlet';
import curry from 'lodash/curry.js';
import merge from 'lodash/merge.js';
import path from 'path';
import { bundleRequire } from 'bundle-require';
import JoyCon from 'joycon';

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

const _registry = (program, config, command) => {
    var _a;
    const cmd = program.command(command.name);
    cmd.description(command.description);
    (_a = command.cliOptions) === null || _a === void 0 ? void 0 : _a.forEach((option) => {
        var _a, _b;
        if (!option)
            return;
        const name = option.alias ? `-${option.alias}, --${option.name}` : `--${option.name}`;
        const type = (() => {
            if (!option.type) {
                return '';
            }
            if (option.type === 'boolean') {
                return '';
            }
            if (option.type.includes('[]')) {
                return `<${option.type.replace('[]', '')}...>`;
            }
            return `<${option.type}>`;
        })();
        cmd.option(`${name} ${type}`.trim(), option.description, (_b = (_a = config === null || config === void 0 ? void 0 : config[command.name]) === null || _a === void 0 ? void 0 : _a[option.name]) !== null && _b !== void 0 ? _b : command.default[option.name]);
    });
    cmd.action((options) => {
        const defaultConfig = command.default;
        const fileConfig = (config === null || config === void 0 ? void 0 : config[command.name]) || {};
        const merged = merge(defaultConfig, fileConfig, options);
        command.run(merged);
    });
};
const registry = curry(_registry);

const loadConfigFile = (cwd, configFile) => __awaiter(void 0, void 0, void 0, function* () {
    const configPath = yield new JoyCon().resolve({
        files: [
                'codebase.config.ts',
                'codebase.config.js',
                'codebase.config.mjs',
                'codebase.config.cjs',
            ],
        cwd,
        stopDir: path.parse(cwd).root,
        packageKey: 'codebase-cli',
    });
    if (!configPath) {
        return null;
    }
    const config = yield bundleRequire({
        filepath: configPath,
        tsconfig: path.join(cwd, 'tsconfig.json'),
    });
    return {
        path: configPath,
        data: config.mod.tok || config.mod.default || config.mod,
    };
});

const program = new Command();
const appName = 'codebase';
const version = json('package.json').version;
/**
 * 똑똑한개발자의 플러그인을 사용할 수 있는 **CLI TOOL**입니다.
 * `gen:api`, `gen:theme`, `gen:route`, `gen:sitemap` 등 다양한 플러그인을 지원하며, 사용자가 개발한 스크립트를 플러그인으로 등록할 수 있습니다.
 *
 * @packageDocumentation
 */
const cli = () => __awaiter(void 0, void 0, void 0, function* () {
    clear();
    yield welcome();
    program.name(appName).version(version);
    program
        .description("CLI to help codebase's working")
        .option('-c, --config', 'config file path')
        .helpCommand(true)
        .action(() => __awaiter(void 0, void 0, void 0, function* () {
        program.outputHelp();
        console.log('\n');
        const { name } = yield enquirer.prompt({
            type: 'autocomplete',
            name: 'name',
            message: 'Pick Resolver',
            choices: program.commands.map((c) => c.name()),
        });
        const target = program.commands.find((c) => c.name() === name);
        target === null || target === void 0 ? void 0 : target.parse();
    }));
    const config = yield loadConfigFile(process.cwd());
    const commands = (config === null || config === void 0 ? void 0 : config.data.plugins) || [];
    commands.forEach(registry(program, config === null || config === void 0 ? void 0 : config.data));
    program.parse(process.argv);
});
function welcome() {
    return __awaiter(this, void 0, void 0, function* () {
        const welcome = figlet.textSync(appName, { horizontalLayout: 'full' });
        console.log(chalk.blueBright(welcome));
    });
}

cli();
