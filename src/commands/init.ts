/**
 * `zakarya init <n>` — alias for `zakarya create`
 */

import type { Command } from 'commander';
import { projectGenerator } from '../generators/project.generator';
import type { ZakaryaConfig } from '../config/config.types';

export function initCommand(program: Command, config: ZakaryaConfig): void {
  program
    .command('init <n>')
    .description('Alias for `zakarya create <n>`')
    .option('-y, --yes', 'Skip prompts and use defaults', false)
    .option('-f, --force', 'Overwrite existing files', false)
    .option('--api-url <url>', 'Override API base URL', config.api.baseUrl)
    .action(async (name: string, options: { yes: boolean; force: boolean; apiUrl: string }) => {
      const mergedConfig: ZakaryaConfig = {
        ...config,
        api: { ...config.api, baseUrl: options.apiUrl },
      };

      await projectGenerator.generate({
        name,
        cwd: process.cwd(),
        yes: options.yes,
        config: mergedConfig,
      });
    });
}
