import path from 'path';
import fs from 'fs-extra';
import { ZakaryaConfig, DEFAULT_CONFIG } from './config.types';

const CONFIG_FILENAME = 'zakarya.config.json';

/**
 * Resolves active config by deep-merging zakarya.config.json (if present)
 * over the built-in DEFAULT_CONFIG.
 */
export async function resolveConfig(cwd: string = process.cwd()): Promise<ZakaryaConfig> {
    const configPath = path.join(cwd, CONFIG_FILENAME);

    if (!(await fs.pathExists(configPath))) {
        return DEFAULT_CONFIG;
    }

    try {
        const raw: unknown = await fs.readJson(configPath);
        return deepMerge(DEFAULT_CONFIG, raw as Partial<ZakaryaConfig>);
    } catch {
        console.warn(`[zakarya] Warning: could not parse ${CONFIG_FILENAME}, using defaults.`);
        return DEFAULT_CONFIG;
    }
}

/**
 * Writes an initial zakarya.config.json to disk.
 */
export async function writeConfig(config: ZakaryaConfig, targetDir: string): Promise<void> {
    const configPath = path.join(targetDir, CONFIG_FILENAME);
    await fs.writeJson(configPath, config, { spaces: 2 });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deepMerge<T>(base: T, override: Partial<T>): T {
    const result = { ...(base as Record<string, unknown>) } as Record<string, unknown>;

    for (const key of Object.keys(override as Record<string, unknown>)) {
        const baseVal = (base as Record<string, unknown>)[key];
        const overrideVal = (override as Record<string, unknown>)[key];

        if (
            overrideVal !== undefined &&
            typeof baseVal === 'object' &&
            baseVal !== null &&
            !Array.isArray(baseVal) &&
            typeof overrideVal === 'object' &&
            overrideVal !== null &&
            !Array.isArray(overrideVal)
        ) {
            result[key] = deepMerge(baseVal, overrideVal as Partial<typeof baseVal>);
        } else if (overrideVal !== undefined) {
            result[key] = overrideVal;
        }
    }

    return result as T;
}
