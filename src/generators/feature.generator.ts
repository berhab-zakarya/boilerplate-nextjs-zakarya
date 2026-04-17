import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs-extra';
import { namingEngine, NamingVariants } from '../engine/naming.engine';
import { templateEngine } from '../engine/template.engine';
import { injectionEngine } from '../engine/injection.engine';
import { SafetySystem } from '../safety/safety.system';
import {
    typeTemplate,
    serviceTemplate,
    queryKeysTemplate,
    queriesTemplate,
    mutationsTemplate,
    listHookTemplate,
    detailHookTemplate,
    indexTemplate,
} from '../templates/feature/feature.templates';
import type { ZakaryaConfig } from '../config/config.types';

export interface FeatureGeneratorOptions {
    /** Absolute path to the project root */
    projectRoot: string;
    /** Feature name as typed by the user (e.g. "sales", "salesOrder") */
    featureName: string;
    /** Whether to force-overwrite existing files */
    force: boolean;
    /** Resolved zakarya config */
    config: ZakaryaConfig;
}

interface GeneratedFile {
    path: string;
    status: 'written' | 'skipped';
}

/**
 * FeatureGenerator
 *
 * Generates a complete, isolated feature module under
 * src/features/<featureName>/ with the following sub-directories:
 *
 *   types/        — domain types
 *   services/     — Axios service (API calls only)
 *   queries/      — TanStack Query keys + queryOptions factories
 *   mutations/    — TanStack Query mutation hooks
 *   hooks/        — Composed query hooks (what components import)
 *   index.ts      — Public barrel export
 */
export class FeatureGenerator {
    private safety: SafetySystem;

    constructor() {
        this.safety = new SafetySystem();
    }

    async generate(opts: FeatureGeneratorOptions): Promise<void> {
        const spinner = ora(`Generating feature: ${chalk.cyan(opts.featureName)}`).start();

        try {
            const variants = namingEngine.derive(opts.featureName);
            const featureDir = this.resolveFeatureDir(opts);
            const context = this.buildContext(variants, opts);

            spinner.text = 'Creating feature directories...';
            await this.createDirectories(featureDir);

            spinner.text = 'Generating feature files...';
            const files = await this.generateFiles(featureDir, variants, context, opts.force);

            spinner.text = 'Registering endpoint...';
            await this.registerEndpoint(opts, variants);

            spinner.text = 'Updating feature barrel...';
            await this.updateFeaturesBarrel(opts, variants);

            spinner.succeed(chalk.green(`Feature "${variants.pascal}" generated successfully!`));
            this.printSummary(files, featureDir, opts.projectRoot);
        } catch (err) {
            spinner.fail(chalk.red(`Failed to generate feature: ${opts.featureName}`));
            throw err;
        }
    }

    // ─── Private ─────────────────────────────────────────────────────────────────

    private resolveFeatureDir(opts: FeatureGeneratorOptions): string {
        const { srcDir, featuresDir } = opts.config.folders;
        const variants = namingEngine.derive(opts.featureName);
        return path.join(opts.projectRoot, srcDir, featuresDir, variants.kebab);
    }

    private buildContext(variants: NamingVariants, opts: FeatureGeneratorOptions) {
        const endpointBase = `/${variants.kebab}`;

        return {
            // All naming variants
            pascal: variants.pascal,
            camel: variants.camel,
            kebab: variants.kebab,
            snake: variants.snake,
            screamingSnake: variants.screamingSnake,
            singularPascal: variants.singularPascal,
            singularCamel: variants.singularCamel,
            pluralPascal: variants.pluralPascal,
            pluralCamel: variants.pluralCamel,
            // Feature config
            endpointBase,
            withZustand: opts.config.features.zustand ? 'true' : '',
            withZod: opts.config.features.zod ? 'true' : '',
        };
    }

    private async createDirectories(featureDir: string): Promise<void> {
        const dirs = ['types', 'services', 'queries', 'mutations', 'hooks', 'components'];
        await Promise.all(dirs.map((d) => fs.ensureDir(path.join(featureDir, d))));
    }

    private async generateFiles(
        featureDir: string,
        variants: NamingVariants,
        context: Record<string, string>,
        force: boolean
    ): Promise<GeneratedFile[]> {
        const fileDefs: Array<{ relativePath: string; template: () => string }> = [
            {
                relativePath: `types/${variants.singularPascal}.types.ts`,
                template: typeTemplate,
            },
            {
                relativePath: `services/${variants.camel}.service.ts`,
                template: serviceTemplate,
            },
            {
                relativePath: `queries/${variants.camel}.keys.ts`,
                template: queryKeysTemplate,
            },
            {
                relativePath: `queries/${variants.camel}.queries.ts`,
                template: queriesTemplate,
            },
            {
                relativePath: `mutations/${variants.camel}.mutations.ts`,
                template: mutationsTemplate,
            },
            {
                relativePath: `hooks/use${variants.pluralPascal}.ts`,
                template: listHookTemplate,
            },
            {
                relativePath: `hooks/use${variants.singularPascal}.ts`,
                template: detailHookTemplate,
            },
            {
                relativePath: 'index.ts',
                template: indexTemplate,
            },
        ];

        const results: GeneratedFile[] = [];

        for (const def of fileDefs) {
            const filePath = path.join(featureDir, def.relativePath);
            const content = templateEngine.render(def.template(), context);
            const status = await this.safety.safeWrite(filePath, content, force);
            results.push({ path: filePath, status });
        }

        return results;
    }

    /**
     * Register the feature's base endpoint in shared/api/endpoints.constants.ts
     */
    private async registerEndpoint(
        opts: FeatureGeneratorOptions,
        variants: NamingVariants
    ): Promise<void> {
        const { srcDir, sharedDir } = opts.config.folders;
        const endpointsFile = path.join(
            opts.projectRoot,
            srcDir,
            sharedDir,
            'api',
            'endpoints.constants.ts'
        );

        if (!(await fs.pathExists(endpointsFile))) return;

        await injectionEngine.registerEndpoint(
            endpointsFile,
            variants.screamingSnake,
            `/${variants.kebab}`
        );
    }

    /**
     * Add the new feature to the top-level features/index.ts barrel.
     */
    private async updateFeaturesBarrel(
        opts: FeatureGeneratorOptions,
        variants: NamingVariants
    ): Promise<void> {
        const { srcDir, featuresDir } = opts.config.folders;
        const barrelPath = path.join(opts.projectRoot, srcDir, featuresDir, 'index.ts');
        const exportStatement = `export * as ${variants.camel}Feature from './${variants.kebab}';`;

        await injectionEngine.appendToBarrel(barrelPath, exportStatement);
    }

    private printSummary(
        files: GeneratedFile[],
        featureDir: string,
        projectRoot: string
    ): void {
        console.log('');
        console.log(chalk.bold('Generated files:'));

        for (const f of files) {
            const rel = path.relative(projectRoot, f.path);
            const icon = f.status === 'written' ? chalk.green('✓') : chalk.yellow('~');
            const label = f.status === 'skipped' ? chalk.dim('(skipped)') : '';
            console.log(`  ${icon} ${rel} ${label}`);
        }

        console.log('');
        console.log(chalk.bold('Usage:'));
        console.log(
            chalk.gray(`  // In your components:`) +
            `\n  import { use${namingEngine.derive(path.basename(featureDir)).pluralPascal} } from '@/features/${path.basename(featureDir)}';`
        );
        console.log('');
    }
}

export const featureGenerator = new FeatureGenerator();
