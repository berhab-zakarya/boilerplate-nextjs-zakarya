#!/usr/bin/env node

/**
 * zakarya — Production-grade frontend framework generator
 * Entry point: registers all top-level commands and bootstraps the CLI.
 */

import { Command } from 'commander';
import { createCommand } from './commands/create';
import { initCommand } from './commands/init';
import { generateCommand } from './commands/generate';
import { doctorCommand } from './commands/doctor';
import { displayBanner } from './utils/banner';
import { resolveConfig } from './config/config.resolver';
import { ZakaryaConfig } from './config/config.types';
import { readPackageVersion } from './utils/package';

async function bootstrap(): Promise<void> {
  displayBanner();

  const version = readPackageVersion();
  const config: ZakaryaConfig = await resolveConfig();

  const program = new Command();

  program
    .name('zakarya')
    .description(
      'Production-grade frontend framework generator.\n' +
        'Generates Next.js (App Router) projects with TanStack Query,\n' +
        'Axios, TypeScript strict mode, and feature-based architecture.'
    )
    .version(version, '-v, --version', 'Output the current version')
    .helpOption('-h, --help', 'Display help for command');

  // ── Top-level commands ────────────────────────────────────────────────────
  createCommand(program, config);
  initCommand(program, config);
  generateCommand(program, config);
  doctorCommand(program);

  // ── Global error handler ──────────────────────────────────────────────────
  program.exitOverride((err) => {
    if (err.code !== 'commander.helpDisplayed' && err.code !== 'commander.version') {
      process.stderr.write(`\nError: ${err.message}\n`);
      process.exit(1);
    }
  });

  await program.parseAsync(process.argv);
}

bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`\nFatal: ${message}\n`);
  process.exit(1);
});
