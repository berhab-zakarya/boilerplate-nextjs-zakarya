/**
 * CLI Banner
 */

import chalk from 'chalk';

export function displayBanner(): void {
    const lines = [
        '',
        '  ╔══════════════════════════════════════════╗',
        '  ║                                          ║',
        '  ║    ███████   █████   ██   ██  ██   ██    ║',
        '  ║       ███   ██   ██  ██  ██    ██ ██     ║',
        '  ║      ███    ███████  █████     ███       ║',
        '  ║     ███     ██   ██  ██  ██     ██       ║',
        '  ║    ███████  ██   ██  ██   ██    ██       ║',
        '  ║                                          ║',
        '  ║   Frontend Framework Generator  v1.0.0   ║',
        '  ║   Next.js · TanStack Query · TypeScript  ║',
        '  ╚══════════════════════════════════════════╝',
        '',
    ];

    console.log(chalk.cyan(lines.join('\n')));
}
