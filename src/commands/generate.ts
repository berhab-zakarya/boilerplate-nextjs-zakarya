/**
 * `zakarya generate <type> <n>` command
 *
 * Supported types:
 *   feature  — isolated feature module (types/services/queries/mutations/hooks)
 *   resource — full CRUD feature with smart domain presets
 */

import type { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { featureGenerator } from '../generators/feature.generator';
import { resourceGenerator } from '../generators/resource.generator';
import type { ZakaryaConfig } from '../config/config.types';



export function generateCommand(program: Command, config: ZakaryaConfig): void {
  const gen = program
    .command('generate')
    .alias('g')
    .description(
      'Generate architecture components.\n\n' +
        'Sub-commands:\n' +
        '  feature <n>   — Full feature module (types/service/queries/mutations/hooks)\n' +
        '  resource <n>  — Full CRUD resource with smart domain presets\n\n' +
        'Examples:\n' +
        '  zakarya generate feature sales\n' +
        '  zakarya g feature salesOrder\n' +
        '  zakarya generate resource products\n' +
        '  zakarya g resource orders --force'
    );

  // ── zakarya generate feature <n> ──────────────────────────────────────────
  gen
    .command('feature <n>')
    .description('Generate a full isolated feature module')
    .option('-f, --force', 'Overwrite existing files without confirmation', false)
    .option('--root <path>', 'Project root directory', process.cwd())
    .action(async (name: string, options: { force: boolean; root: string }) => {
      const projectRoot = path.resolve(options.root);

      await assertInsideProject(projectRoot, config);

      await featureGenerator.generate({
        projectRoot,
        featureName: name,
        force: options.force,
        config,
      });
    });

  // ── zakarya generate resource <n> ─────────────────────────────────────────
  gen
    .command('resource <n>')
    .description('Generate a full CRUD resource with smart domain defaults')
    .option('-f, --force', 'Overwrite existing files without confirmation', false)
    .option('--root <path>', 'Project root directory', process.cwd())
    .action(async (name: string, options: { force: boolean; root: string }) => {
      const projectRoot = path.resolve(options.root);

      await assertInsideProject(projectRoot, config);

      await resourceGenerator.generate({
        projectRoot,
        resourceName: name,
        force: options.force,
        config,
      });
    });
}

/**
 * Warn if the user is not inside a zakarya project.
 * Checks for zakarya.config.json or src/ directory.
 */
async function assertInsideProject(
  projectRoot: string,
  config: ZakaryaConfig
): Promise<void> {
  const configExists = await fs.pathExists(path.join(projectRoot, 'zakarya.config.json'));
  const srcExists = await fs.pathExists(path.join(projectRoot, config.folders.srcDir));

  if (!configExists && !srcExists) {
    console.warn(
      chalk.yellow(
        `\n  ⚠ Warning: No zakarya.config.json or "${config.folders.srcDir}/" directory found in:\n` +
          `    ${projectRoot}\n\n` +
          `  Are you inside a zakarya project?\n` +
          `  Files will still be generated but paths may be incorrect.\n`
      )
    );
  }
}
