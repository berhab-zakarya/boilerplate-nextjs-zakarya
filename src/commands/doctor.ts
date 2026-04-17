/**
 * `zakarya doctor`
 *
 * Validates the current project's architectural health:
 *   - Checks for cross-feature imports (violation of isolation rules)
 *   - Verifies shared layer integrity
 *   - Validates zakarya.config.json schema
 *   - Reports missing required files
 */

import type { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';

interface DiagnosticResult {
    passed: number;
    warnings: string[];
    errors: string[];
}

export function doctorCommand(program: Command): void {
    program
        .command('doctor')
        .description('Validate project architecture and report violations')
        .option('--root <path>', 'Project root directory', process.cwd())
        .action(async (options: { root: string }) => {
            const projectRoot = path.resolve(options.root);
            const spinner = ora('Running architecture diagnostics...').start();

            const result: DiagnosticResult = { passed: 0, warnings: [], errors: [] };

            try {
                await checkConfigExists(projectRoot, result);
                await checkSharedLayerIntegrity(projectRoot, result);
                await checkCrossFeatureImports(projectRoot, result);
                await checkFeatureStructures(projectRoot, result);
                await checkEndpointRegistrations(projectRoot, result);

                spinner.stop();
                printDoctorReport(result);
            } catch (err) {
                spinner.fail('Doctor encountered an unexpected error');
                throw err;
            }
        });
}

// ─── Checks ──────────────────────────────────────────────────────────────────

async function checkConfigExists(
    root: string,
    result: DiagnosticResult
): Promise<void> {
    const configPath = path.join(root, 'zakarya.config.json');

    if (await fs.pathExists(configPath)) {
        result.passed++;
    } else {
        result.warnings.push('zakarya.config.json not found. Run `zakarya create` first or add a config file.');
    }
}

async function checkSharedLayerIntegrity(
    root: string,
    result: DiagnosticResult
): Promise<void> {
    const required = [
        'src/shared/api/client.ts',
        'src/shared/api/endpoints.constants.ts',
        'src/shared/errors/app.error.ts',
        'src/shared/tanstack/query-client.ts',
        'src/shared/tanstack/providers.tsx',
    ];

    for (const rel of required) {
        const full = path.join(root, rel);
        if (await fs.pathExists(full)) {
            result.passed++;
        } else {
            result.errors.push(`Missing required shared file: ${rel}`);
        }
    }
}

async function checkCrossFeatureImports(
    root: string,
    result: DiagnosticResult
): Promise<void> {
    const featuresDir = path.join(root, 'src', 'features');

    if (!(await fs.pathExists(featuresDir))) return;

    const featureDirs = await fs.readdir(featuresDir);
    const featureNames = featureDirs.filter((d) =>
        fs.statSync(path.join(featuresDir, d)).isDirectory()
    );

    for (const featureName of featureNames) {
        const featureFiles = await glob('**/*.{ts,tsx}', {
            cwd: path.join(featuresDir, featureName),
            absolute: true,
        });

        for (const file of featureFiles) {
            const content = await fs.readFile(file, 'utf-8');
            const relFile = path.relative(root, file);

            for (const otherFeature of featureNames) {
                if (otherFeature === featureName) continue;

                const illegalImportPattern = new RegExp(
                    `from ['\"\`]@/features/${otherFeature}|from ['\"\`]\.\.\/\.\.\/${otherFeature}`
                );

                if (illegalImportPattern.test(content)) {
                    result.errors.push(
                        `Cross-feature import violation in ${relFile}:\n` +
                        `    Feature "${featureName}" imports from feature "${otherFeature}".\n` +
                        `    Move shared logic to src/shared/ instead.`
                    );
                } else {
                    result.passed++;
                    break;
                }
            }
        }
    }
}

async function checkFeatureStructures(
    root: string,
    result: DiagnosticResult
): Promise<void> {
    const featuresDir = path.join(root, 'src', 'features');

    if (!(await fs.pathExists(featuresDir))) return;

    const featureDirs = (await fs.readdir(featuresDir)).filter((d) =>
        fs.statSync(path.join(featuresDir, d)).isDirectory()
    );

    const requiredSubDirs = ['types', 'services', 'queries', 'mutations', 'hooks'];

    for (const feat of featureDirs) {
        const featDir = path.join(featuresDir, feat);

        for (const sub of requiredSubDirs) {
            if (await fs.pathExists(path.join(featDir, sub))) {
                result.passed++;
            } else {
                result.warnings.push(
                    `Feature "${feat}" is missing the "${sub}/" sub-directory. Run: zakarya generate feature ${feat} --force`
                );
            }
        }

        // Check for barrel
        if (await fs.pathExists(path.join(featDir, 'index.ts'))) {
            result.passed++;
        } else {
            result.warnings.push(`Feature "${feat}" is missing index.ts barrel file.`);
        }
    }
}

async function checkEndpointRegistrations(
    root: string,
    result: DiagnosticResult
): Promise<void> {
    const endpointsFile = path.join(root, 'src', 'shared', 'api', 'endpoints.constants.ts');

    if (!(await fs.pathExists(endpointsFile))) return;

    const content = await fs.readFile(endpointsFile, 'utf-8');

    if (content.includes('[zakarya:inject:endpoints]')) {
        result.passed++;
    } else {
        result.warnings.push(
            'endpoints.constants.ts is missing the [zakarya:inject:endpoints] marker. ' +
            'Auto-registration of new endpoints will not work.'
        );
    }
}

// ─── Report ───────────────────────────────────────────────────────────────────

function printDoctorReport(result: DiagnosticResult): void {
    const total = result.passed + result.warnings.length + result.errors.length;

    console.log('');
    console.log(chalk.bold('zakarya doctor — Architecture Health Report'));
    console.log('─'.repeat(50));
    console.log('');

    if (result.errors.length === 0 && result.warnings.length === 0) {
        console.log(chalk.green.bold(`✓ All ${result.passed} checks passed. Architecture is healthy.`));
    } else {
        if (result.errors.length > 0) {
            console.log(chalk.red.bold(`✖ ${result.errors.length} error(s):`));
            for (const err of result.errors) {
                console.log(chalk.red(`  • ${err}`));
            }
            console.log('');
        }

        if (result.warnings.length > 0) {
            console.log(chalk.yellow.bold(`⚠ ${result.warnings.length} warning(s):`));
            for (const warn of result.warnings) {
                console.log(chalk.yellow(`  • ${warn}`));
            }
            console.log('');
        }

        console.log(
            chalk.gray(
                `  ${result.passed} of ${total} checks passed.`
            )
        );
    }

    console.log('');
}
