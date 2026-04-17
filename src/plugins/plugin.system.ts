/**
 * Plugin System
 *
 * Plugins extend zakarya's generation capabilities.
 * A plugin is a Node.js module that exports a ZakaryaPlugin object.
 *
 * Plugin contract:
 *   - name: unique identifier
 *   - version: semver string
 *   - setup(ctx): called once at CLI bootstrap
 *   - generators?: additional generators the plugin provides
 *   - hooks?: lifecycle hooks into the core generation pipeline
 *
 * Example plugin (zakarya-plugin-auth):
 *
 *   export default {
 *     name: 'auth',
 *     version: '1.0.0',
 *     setup(ctx) {
 *       ctx.registerGenerator('login-flow', loginFlowGenerator);
 *       ctx.registerGenerator('register-flow', registerFlowGenerator);
 *     },
 *     hooks: {
 *       afterFeatureGenerated(feature, ctx) {
 *         if (feature.name === 'auth') ctx.run('setup-auth-routes');
 *       },
 *     },
 *   };
 *
 * Usage:
 *   zakarya create my-app --plugins auth,payments
 *
 * Discovery:
 *   Plugins are resolved in order:
 *     1. Local ./zakarya-plugins/<n>/index.ts  (monorepo plugins)
 *     2. node_modules/zakarya-plugin-<n>
 *     3. node_modules/@zakarya/<n>
 */

import type { ZakaryaConfig } from '../config/config.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PluginContext {
  config: ZakaryaConfig;
  projectRoot: string;
  registerGenerator(name: string, generator: PluginGenerator): void;
  log(message: string): void;
}

export interface PluginGenerator {
  description: string;
  generate(opts: Record<string, unknown>): Promise<void>;
}

export interface LifecycleHooks {
  beforeProjectCreated?(ctx: PluginContext): Promise<void>;
  afterProjectCreated?(ctx: PluginContext): Promise<void>;
  beforeFeatureGenerated?(featureName: string, ctx: PluginContext): Promise<void>;
  afterFeatureGenerated?(featureName: string, ctx: PluginContext): Promise<void>;
}

export interface ZakaryaPlugin {
  name: string;
  version: string;
  setup(ctx: PluginContext): void | Promise<void>;
  hooks?: LifecycleHooks;
}

// ─── PluginRegistry ───────────────────────────────────────────────────────────

export class PluginRegistry {
  private plugins = new Map<string, ZakaryaPlugin>();
  private generators = new Map<string, PluginGenerator>();

  register(plugin: ZakaryaPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered.`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  registerGenerator(name: string, generator: PluginGenerator): void {
    this.generators.set(name, generator);
  }

  getPlugin(name: string): ZakaryaPlugin | undefined {
    return this.plugins.get(name);
  }

  getGenerator(name: string): PluginGenerator | undefined {
    return this.generators.get(name);
  }

  allPlugins(): ZakaryaPlugin[] {
    return Array.from(this.plugins.values());
  }
}

// ─── PluginLoader ─────────────────────────────────────────────────────────────

export class PluginLoader {
  private registry: PluginRegistry;

  constructor() {
    this.registry = new PluginRegistry();
  }

  /**
   * Load and initialize all plugins declared in config.plugins.
   */
  async loadAll(config: ZakaryaConfig, projectRoot: string): Promise<PluginRegistry> {
    for (const pluginConf of config.plugins) {
      const plugin = await this.resolve(pluginConf.name, projectRoot);

      if (!plugin) {
        console.warn(`[zakarya] Plugin "${pluginConf.name}" could not be resolved. Skipping.`);
        continue;
      }

      this.registry.register(plugin);

      const ctx = this.buildContext(config, projectRoot);
      await plugin.setup(ctx);
    }

    return this.registry;
  }

  /**
   * Resolve a plugin module by name using the discovery chain.
   */
  private async resolve(name: string, projectRoot: string): Promise<ZakaryaPlugin | null> {
    const candidates = [
      `${projectRoot}/zakarya-plugins/${name}/index`,
      `zakarya-plugin-${name}`,
      `@zakarya/${name}`,
    ];

    for (const candidate of candidates) {
      try {
        const mod = await import(candidate) as { default?: ZakaryaPlugin };
        const plugin = mod.default ?? (mod as unknown as ZakaryaPlugin);
        if (plugin && typeof plugin.setup === 'function') {
          return plugin;
        }
      } catch {
        // Not found at this path, try next
      }
    }

    return null;
  }

  private buildContext(config: ZakaryaConfig, projectRoot: string): PluginContext {
    return {
      config,
      projectRoot,
      registerGenerator: (name, gen) => this.registry.registerGenerator(name, gen),
      log: (msg) => console.log(`  [plugin] ${msg}`),
    };
  }
}

export const pluginLoader = new PluginLoader();
