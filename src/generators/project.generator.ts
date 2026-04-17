import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execa } from 'execa';
import { SafetySystem } from '../safety/safety.system';
import { writeConfig } from '../config/config.resolver';
import type { ZakaryaConfig } from '../config/config.types';
import {
    apiClientTemplate,
    endpointsTemplate,
    appErrorTemplate,
    queryClientTemplate,
    queryProviderTemplate,
    rootLayoutTemplate,
    rootPageTemplate,
    nextConfigTemplate,
    projectTsConfigTemplate,
} from '../templates/project/project.templates';

export interface ProjectGeneratorOptions {
    /** The project name / directory name */
    name: string;
    /** Parent directory in which the project folder will be created */
    cwd: string;
    /** Whether to skip interactive prompts and use defaults */
    yes: boolean;
    /** Resolved config (possibly from flags/prompts) */
    config: ZakaryaConfig;
}

interface ProjectAnswers {
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
    apiBaseUrl: string;
    withZod: boolean;
    withZustand: boolean;
    withVitest: boolean;
}

export class ProjectGenerator {
    private safety = new SafetySystem();

    async generate(opts: ProjectGeneratorOptions): Promise<void> {
        const projectDir = path.join(opts.cwd, opts.name);

        // ── Guard: directory already exists ──────────────────────────────────────
        if (await fs.pathExists(projectDir)) {
            const files = await fs.readdir(projectDir);
            if (files.length > 0) {
                const confirmed = await this.safety.confirm(
                    `Directory "${opts.name}" already exists and is not empty. Continue?`,
                    false
                );
                if (!confirmed) {
                    console.log(chalk.yellow('Aborted.'));
                    process.exit(0);
                }
            }
        }

        // ── Interactive prompts ───────────────────────────────────────────────────
        const answers = opts.yes
            ? this.defaultAnswers(opts.config)
            : await this.promptUser(opts.config);

        const finalConfig: ZakaryaConfig = {
            ...opts.config,
            api: { ...opts.config.api, baseUrl: answers.apiBaseUrl },
            features: {
                ...opts.config.features,
                zod: answers.withZod,
                zustand: answers.withZustand,
                vitest: answers.withVitest,
            },
        };

        // ── Generation ────────────────────────────────────────────────────────────
        const spinner = ora(`Creating project ${chalk.cyan(opts.name)}...`).start();

        try {
            await fs.ensureDir(projectDir);

            spinner.text = 'Scaffolding directory structure...';
            await this.createDirectoryStructure(projectDir, finalConfig);

            spinner.text = 'Writing shared layer...';
            await this.writeSharedLayer(projectDir, finalConfig);

            spinner.text = 'Writing Next.js app files...';
            await this.writeAppFiles(projectDir, opts.name);

            spinner.text = 'Writing configuration files...';
            await this.writeConfigFiles(projectDir, opts.name, finalConfig);

            spinner.text = 'Writing zakarya.config.json...';
            await writeConfig(finalConfig, projectDir);

            spinner.text = `Installing dependencies with ${answers.packageManager}...`;
            await this.installDependencies(projectDir, answers.packageManager, finalConfig);

            spinner.succeed(chalk.green(`Project "${opts.name}" created!`));
            this.printSuccessMessage(opts.name, projectDir, answers.packageManager);
        } catch (err) {
            spinner.fail(chalk.red(`Failed to create project: ${opts.name}`));
            throw err;
        }
    }

    // ─── Prompts ──────────────────────────────────────────────────────────────

    private async promptUser(config: ZakaryaConfig): Promise<ProjectAnswers> {
        return inquirer.prompt<ProjectAnswers>([
            {
                type: 'list',
                name: 'packageManager',
                message: 'Package manager:',
                choices: ['npm', 'yarn', 'pnpm', 'bun'],
                default: 'npm',
            },
            {
                type: 'input',
                name: 'apiBaseUrl',
                message: 'API base URL:',
                default: config.api.baseUrl,
            },
            {
                type: 'confirm',
                name: 'withZod',
                message: 'Include Zod validation schemas?',
                default: config.features.zod,
            },
            {
                type: 'confirm',
                name: 'withZustand',
                message: 'Include Zustand for local state?',
                default: config.features.zustand,
            },
            {
                type: 'confirm',
                name: 'withVitest',
                message: 'Include Vitest for unit testing?',
                default: config.features.vitest,
            },
        ]);
    }

    private defaultAnswers(config: ZakaryaConfig): ProjectAnswers {
        return {
            packageManager: 'npm',
            apiBaseUrl: config.api.baseUrl,
            withZod: config.features.zod,
            withZustand: config.features.zustand,
            withVitest: config.features.vitest,
        };
    }

    // ─── Directory Structure ──────────────────────────────────────────────────

    private async createDirectoryStructure(
        projectDir: string,
        config: ZakaryaConfig
    ): Promise<void> {
        const { srcDir, featuresDir, sharedDir } = config.folders;
        const src = path.join(projectDir, srcDir);

        const dirs = [
            // App Router
            path.join(projectDir, 'app'),
            // Features root
            path.join(src, featuresDir),
            // Shared sub-directories
            path.join(src, sharedDir, 'api'),
            path.join(src, sharedDir, 'errors'),
            path.join(src, sharedDir, 'tanstack'),
            path.join(src, sharedDir, 'constants'),
            path.join(src, sharedDir, 'utils'),
            path.join(src, sharedDir, 'config'),
            path.join(src, sharedDir, 'types'),
        ];

        await Promise.all(dirs.map((d) => fs.ensureDir(d)));
    }

    // ─── Shared Layer ─────────────────────────────────────────────────────────

    private async writeSharedLayer(
        projectDir: string,
        config: ZakaryaConfig
    ): Promise<void> {
        const { srcDir, sharedDir } = config.folders;
        const shared = path.join(projectDir, srcDir, sharedDir);
        const { api, query } = config;

        await this.writeFile(
            path.join(shared, 'api', 'client.ts'),
            apiClientTemplate(api.baseUrl, api.timeout)
        );

        await this.writeFile(
            path.join(shared, 'api', 'endpoints.constants.ts'),
            endpointsTemplate()
        );

        await this.writeFile(
            path.join(shared, 'errors', 'app.error.ts'),
            appErrorTemplate()
        );

        await this.writeFile(
            path.join(shared, 'tanstack', 'query-client.ts'),
            queryClientTemplate(query.staleTime, query.gcTime, query.retry, query.refetchOnWindowFocus)
        );

        await this.writeFile(
            path.join(shared, 'tanstack', 'providers.tsx'),
            queryProviderTemplate()
        );

        // Shared barrel
        await this.writeFile(
            path.join(shared, 'index.ts'),
            `export * from './api/endpoints.constants';\nexport * from './errors/app.error';\nexport * from './tanstack/query-client';\n`
        );
    }

    // ─── App Files ────────────────────────────────────────────────────────────

    private async writeAppFiles(projectDir: string, name: string): Promise<void> {
        const appDir = path.join(projectDir, 'app');

        await this.writeFile(path.join(appDir, 'layout.tsx'), rootLayoutTemplate(name));
        await this.writeFile(path.join(appDir, 'page.tsx'), rootPageTemplate(name));
        await this.writeFile(
            path.join(appDir, 'globals.css'),
            `*, *::before, *::after { box-sizing: border-box; }\nbody { margin: 0; font-family: system-ui, sans-serif; }\n`
        );
    }

    // ─── Config Files ─────────────────────────────────────────────────────────

    private async writeConfigFiles(
        projectDir: string,
        name: string,
        config: ZakaryaConfig
    ): Promise<void> {
        await this.writeFile(path.join(projectDir, 'next.config.ts'), nextConfigTemplate());
        await this.writeFile(path.join(projectDir, 'tsconfig.json'), projectTsConfigTemplate());
        await this.writeFile(
            path.join(projectDir, '.env.local'),
            `NEXT_PUBLIC_API_URL=${config.api.baseUrl}\n`
        );
        await this.writeFile(
            path.join(projectDir, '.env.example'),
            `NEXT_PUBLIC_API_URL=http://localhost:3001/api\n`
        );
        await this.writeFile(
            path.join(projectDir, '.gitignore'),
            [
                '# deps',
                'node_modules',
                '',
                '# next',
                '.next',
                'out',
                '',
                '# env',
                '.env.local',
                '.env*.local',
                '',
                '# zakarya backups',
                '*.zakarya-backup',
            ].join('\n') + '\n'
        );
        await this.writeFile(
            path.join(projectDir, 'package.json'),
            this.buildPackageJson(name, config)
        );
    }

    // ─── Package.json ─────────────────────────────────────────────────────────

    private buildPackageJson(name: string, config: ZakaryaConfig): string {
        const pkg: Record<string, unknown> = {
            name,
            version: '0.1.0',
            private: true,
            scripts: {
                dev: 'next dev',
                build: 'next build',
                start: 'next start',
                lint: 'next lint',
                ...(config.features.vitest && { test: 'vitest', 'test:ui': 'vitest --ui' }),
            },
            dependencies: {
                next: '^15.0.0',
                react: '^19.0.0',
                'react-dom': '^19.0.0',
                axios: '^1.6.0',
                '@tanstack/react-query': '^5.17.0',
                '@tanstack/react-query-devtools': '^5.17.0',
                ...(config.features.zustand && { zustand: '^4.4.0' }),
                ...(config.features.zod && { zod: '^3.22.0' }),
                ...(config.features.reactHookForm && {
                    'react-hook-form': '^7.49.0',
                    '@hookform/resolvers': '^3.3.0',
                }),
            },
            devDependencies: {
                typescript: '^5.3.0',
                '@types/node': '^20.0.0',
                '@types/react': '^19.0.0',
                '@types/react-dom': '^19.0.0',
                eslint: '^8.56.0',
                'eslint-config-next': '^15.0.0',
                ...(config.features.vitest && {
                    vitest: '^1.2.0',
                    '@vitejs/plugin-react': '^4.2.0',
                    '@testing-library/react': '^14.1.0',
                    '@testing-library/jest-dom': '^6.2.0',
                    '@testing-library/user-event': '^14.5.0',
                }),
            },
        };

        return JSON.stringify(pkg, null, 2);
    }

    // ─── Install ──────────────────────────────────────────────────────────────

    private async installDependencies(
        projectDir: string,
        pm: string,
        _config: ZakaryaConfig
    ): Promise<void> {
        const installCmd = pm === 'yarn' ? 'yarn' : pm === 'bun' ? 'bun install' : `${pm} install`;
        const [cmd, ...args] = installCmd.split(' ') as [string, ...string[]];

        try {
            await execa(cmd, args, {
                cwd: projectDir,
                stdio: 'pipe',
            });
        } catch {
            console.warn(
                chalk.yellow(`\n  ⚠ Dependency installation failed. Run \`${installCmd}\` manually inside "${projectDir}".`)
            );
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async writeFile(filePath: string, content: string): Promise<void> {
        await fs.ensureFile(filePath);
        await fs.writeFile(filePath, content, 'utf-8');
    }

    private printSuccessMessage(name: string, _projectDir: string, pm: string): void {
        const runCmd = pm === 'yarn' ? 'yarn dev' : pm === 'bun' ? 'bun dev' : `${pm} run dev`;

        console.log('');
        console.log(chalk.bold.green('🎉 Project ready!'));
        console.log('');
        console.log(`  ${chalk.cyan('cd')} ${name}`);
        console.log(`  ${chalk.cyan(runCmd)}`);
        console.log('');
        console.log(chalk.bold('Add your first feature:'));
        console.log(`  ${chalk.cyan(`zakarya generate feature sales`)}`);
        console.log(`  ${chalk.cyan(`zakarya generate resource products`)}`);
        console.log('');
    }
}

export const projectGenerator = new ProjectGenerator();
