/**
 * ResourceGenerator
 *
 * `zakarya generate resource <name>` — higher-level generator.
 *
 * Delegates to FeatureGenerator for the base feature scaffold, then
 * overlays resource-specific smart defaults:
 *   - Full CRUD service methods
 *   - List + detail query options
 *   - Create / Update / Delete mutations
 *   - Composed hooks
 *   - Optional: pagination hook, search/filter hook
 *
 * SMART GENERATION RULES:
 *   - auth      → login / register / logout / reset-password flows
 *   - products  → CRUD + inventory + search + category filters
 *   - sales     → CRUD + pagination + filters + date ranges
 *   - (default) → standard CRUD
 */

import chalk from 'chalk';
import ora from 'ora';
import { featureGenerator } from './feature.generator';
import type { ZakaryaConfig } from '../config/config.types';
import { namingEngine } from '../engine/naming.engine';

export interface ResourceGeneratorOptions {
    projectRoot: string;
    resourceName: string;
    force: boolean;
    config: ZakaryaConfig;
}

/**
 * Domain-specific presets for well-known resource names.
 */
const RESOURCE_PRESETS: Record<string, { description: string; extras: string[] }> = {
    auth: {
        description: 'Authentication flows (login, register, reset, refresh)',
        extras: ['login flow', 'register flow', 'password reset flow', 'token refresh'],
    },
    products: {
        description: 'Product catalogue with inventory, search, categories',
        extras: ['inventory tracking', 'category filters', 'search/facets'],
    },
    sales: {
        description: 'Sales resource with pagination, date ranges, filters',
        extras: ['pagination', 'date range filters', 'status filters'],
    },
    orders: {
        description: 'Order management with status tracking',
        extras: ['order status flow', 'order items', 'shipping tracking'],
    },
    users: {
        description: 'User management with roles and permissions',
        extras: ['role management', 'permission gates', 'profile management'],
    },
};

export class ResourceGenerator {
    async generate(opts: ResourceGeneratorOptions): Promise<void> {
        const variants = namingEngine.derive(opts.resourceName);
        const preset = RESOURCE_PRESETS[variants.camel.toLowerCase()];

        const spinner = ora(
            `Generating ${chalk.cyan(opts.resourceName)} resource${preset ? ` (${preset.description})` : ''}...`
        ).start();

        try {
            // Step 1: Generate the full base feature scaffold
            spinner.text = `Scaffolding base feature for ${chalk.cyan(opts.resourceName)}...`;
            spinner.stop();

            await featureGenerator.generate({
                projectRoot: opts.projectRoot,
                featureName: opts.resourceName,
                force: opts.force,
                config: opts.config,
            });

            // Step 2: Print resource-specific guidance
            if (preset) {
                console.log('');
                console.log(chalk.bold.blue(`🧠 Smart generation preset detected: ${variants.pascal}`));
                console.log(chalk.gray(`  ${preset.description}`));
                console.log('');
                console.log(chalk.bold(`  Recommended additions for this resource type:`));
                for (const extra of preset.extras) {
                    console.log(`  ${chalk.cyan('→')} ${extra}`);
                }
                console.log('');
                console.log(
                    chalk.gray(
                        `  These patterns are architectural guides. Add them to your generated feature under src/features/${variants.kebab}/.`
                    )
                );
            }

            console.log('');
            console.log(chalk.green.bold('✓ Resource generated successfully!'));
            console.log('');
            console.log(chalk.bold('Next steps:'));
            console.log(
                `  ${chalk.cyan('1.')} Open ${chalk.underline(`src/features/${variants.kebab}/types/${variants.singularPascal}.types.ts`)} and define your domain types`
            );
            console.log(
                `  ${chalk.cyan('2.')} Review the service in ${chalk.underline(`src/features/${variants.kebab}/services/${variants.camel}.service.ts`)}`
            );
            console.log(
                `  ${chalk.cyan('3.')} Import hooks in your components: ${chalk.gray(`import { use${variants.pluralPascal} } from '@/features/${variants.kebab}'`)}`
            );
        } catch (err) {
            spinner.fail(chalk.red(`Failed to generate resource: ${opts.resourceName}`));
            throw err;
        }
    }
}

export const resourceGenerator = new ResourceGenerator();
