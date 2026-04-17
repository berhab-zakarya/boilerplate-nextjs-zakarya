import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';

/**
 * SafetySystem
 *
 * Provides backup-before-overwrite and confirmation gates for all
 * destructive filesystem operations performed by zakarya generators.
 */
export class SafetySystem {
    private readonly backupSuffix = '.zakarya-backup';

    /**
     * Create a timestamped backup copy of a file before mutation.
     * Returns the backup file path.
     */
    async backup(filePath: string): Promise<string> {
        const timestamp = Date.now();
        const backupPath = `${filePath}.${timestamp}${this.backupSuffix}`;
        await fs.copy(filePath, backupPath);
        return backupPath;
    }

    /**
     * Ask the user to confirm before a destructive action.
     * Returns true if confirmed, false otherwise.
     */
    async confirm(message: string, defaultValue = false): Promise<boolean> {
        const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
            {
                type: 'confirm',
                name: 'confirmed',
                message,
                default: defaultValue,
            },
        ]);
        return confirmed;
    }

    /**
     * Safely write a file: if the file exists and `force` is false,
     * ask the user whether to overwrite. Always backs up before overwrite.
     *
     * Returns 'written' | 'skipped'.
     */
    async safeWrite(
        filePath: string,
        content: string,
        force = false
    ): Promise<'written' | 'skipped'> {
        const exists = await fs.pathExists(filePath);

        if (exists && !force) {
            const rel = path.relative(process.cwd(), filePath);
            const shouldOverwrite = await this.confirm(
                `File already exists: ${rel}\n  Overwrite?`,
                false
            );

            if (!shouldOverwrite) {
                return 'skipped';
            }

            await this.backup(filePath);
        }

        await fs.ensureFile(filePath);
        await fs.writeFile(filePath, content, 'utf-8');
        return 'written';
    }

    /**
     * Safely create a directory — no-op if it already exists.
     */
    async safeEnsureDir(dirPath: string): Promise<void> {
        await fs.ensureDir(dirPath);
    }

    /**
     * Remove all backup files created by this session in a directory tree.
     * Call at the end of a successful generation run.
     */
    async cleanupBackups(rootDir: string): Promise<number> {
        const { glob } = await import('glob');
        const pattern = `**/*${this.backupSuffix}`;
        const backups = await glob(pattern, { cwd: rootDir, absolute: true });

        await Promise.all(backups.map((f) => fs.remove(f)));
        return backups.length;
    }
}
