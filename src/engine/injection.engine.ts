import fs from 'fs-extra';
import path from 'path';
import { SafetySystem } from '../safety/safety.system';

/**
 * InjectionEngine
 *
 * Safely modifies existing generated files (e.g. adding a new endpoint
 * to api.constants.ts, registering a new QueryProvider, etc.)
 * without overwriting user customizations.
 *
 * Strategy:
 *  1. Backup file before any mutation (SafetySystem)
 *  2. Locate a unique injection marker comment
 *  3. Insert the new code block immediately after the marker
 *  4. If code block already exists (idempotency check), skip
 */
export class InjectionEngine {
    private safety: SafetySystem;

    constructor() {
        this.safety = new SafetySystem();
    }

    /**
     * Inject a code block into a file at a marked insertion point.
     *
     * @param filePath  Absolute path to the file
     * @param marker    The comment marker (e.g. "// [zakarya:inject:endpoints]")
     * @param code      Code to insert after the marker
     * @param idempotencyKey  A unique string to detect duplicate injections
     */
    async injectAtMarker(
        filePath: string,
        marker: string,
        code: string,
        idempotencyKey: string
    ): Promise<'injected' | 'already_present' | 'marker_not_found'> {
        if (!(await fs.pathExists(filePath))) {
            throw new Error(`InjectionEngine: file not found: ${filePath}`);
        }

        const content = await fs.readFile(filePath, 'utf-8');

        // Idempotency: skip if key already present
        if (content.includes(idempotencyKey)) {
            return 'already_present';
        }

        // Locate marker
        const markerIndex = content.indexOf(marker);
        if (markerIndex === -1) {
            return 'marker_not_found';
        }

        // Backup before mutation
        await this.safety.backup(filePath);

        // Insert after the marker line
        const markerEnd = content.indexOf('\n', markerIndex) + 1;
        const newContent = content.slice(0, markerEnd) + code + '\n' + content.slice(markerEnd);

        await fs.writeFile(filePath, newContent, 'utf-8');
        return 'injected';
    }

    /**
     * Append a named export to an index barrel file.
     * Handles both "export * from" and "export { X } from" patterns.
     */
    async appendToBarrel(
        barrelPath: string,
        exportStatement: string
    ): Promise<'added' | 'already_present'> {
        let content = '';

        if (await fs.pathExists(barrelPath)) {
            content = await fs.readFile(barrelPath, 'utf-8');
            if (content.includes(exportStatement)) return 'already_present';
            await this.safety.backup(barrelPath);
            content = content.trimEnd() + '\n' + exportStatement + '\n';
        } else {
            await fs.ensureFile(barrelPath);
            content = exportStatement + '\n';
        }

        await fs.writeFile(barrelPath, content, 'utf-8');
        return 'added';
    }

    /**
     * Register a new endpoint constant in shared/api/endpoints.constants.ts.
     */
    async registerEndpoint(
        endpointsFile: string,
        featureKey: string,
        endpointValue: string
    ): Promise<void> {
        const marker = '// [zakarya:inject:endpoints]';
        const idempotencyKey = `${featureKey.toUpperCase()}_BASE`;
        const code = `  ${idempotencyKey}: '${endpointValue}',`;

        const result = await this.injectAtMarker(endpointsFile, marker, code, idempotencyKey);

        if (result === 'marker_not_found') {
            // Fallback: append to end of file before closing brace
            const content = await fs.readFile(endpointsFile, 'utf-8');
            const closingBrace = content.lastIndexOf('}');
            if (closingBrace !== -1) {
                await this.safety.backup(endpointsFile);
                const updated =
                    content.slice(0, closingBrace) +
                    `  ${idempotencyKey}: '${endpointValue}',\n` +
                    content.slice(closingBrace);
                await fs.writeFile(endpointsFile, updated, 'utf-8');
            }
        }
    }

    /**
     * Returns the absolute path to the injection marker file,
     * relative to the project src directory.
     */
    resolveSharedFile(projectRoot: string, srcDir: string, ...segments: string[]): string {
        return path.join(projectRoot, srcDir, ...segments);
    }
}

export const injectionEngine = new InjectionEngine();
