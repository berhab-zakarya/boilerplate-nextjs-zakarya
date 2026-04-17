/**
 * `zakarya create <name>` command
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import { projectGenerator } from '../generators/project.generator';
import type { ZakaryaConfig } from '../config/config.types';

export function createCommand(program: Command, config: ZakaryaConfig): void {
    program
        .command('create <name>')
        .description(
            'Create a new production-ready Next.js project with the zakarya architecture.\n\n' +
            'Examples:\n' +
            '  zakarya create my-app\n' +
            '  zakarya create my-app --yes\n' +
            '  zakarya create my-app --plugins auth,payments'
        )
        .option('-y, --yes', 'Skip prompts and use defaults', false)
        .option('-f, --force', 'Overwrite existing files without confirmation', false)
        .option('--plugins <plugins>', 'Comma-separated list of plugins (e.g. auth,payments)')
        .option(
            '--api-url <url>',
            'Override API base URL',
            config.api.baseUrl
        )
        .action(async (name: string, options: { yes: boolean; force: boolean; apiUrl: string; plugins?: string }) => {
            validateProjectName(name);

            const mergedConfig: ZakaryaConfig = {
                ...config,
                api: { ...config.api, baseUrl: options.apiUrl },
                plugins: options.plugins
                    ? options.plugins.split(',').map((p) => ({ name: p.trim() }))
                    : config.plugins,
            };

            await projectGenerator.generate({
                name,
                cwd: process.cwd(),
                yes: options.yes,
                config: mergedConfig,
            });
        });
}

function validateProjectName(name: string): void {
    if (!/^[a-z0-9][a-z0-9-_]*$/.test(name)) {
        console.error(
            chalk.red(
                `\nInvalid project name: "${name}"\n` +
                'Project names must start with a lowercase letter or digit and contain only\n' +
                'lowercase letters, digits, hyphens, and underscores.\n'
            )
        );
        process.exit(1);
    }
}
