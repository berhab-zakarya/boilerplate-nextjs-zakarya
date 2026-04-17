/**
 * zakarya.config.json — schema & TypeScript types
 */

export interface ZakaryaApiConfig {
    /** Base URL written into shared/api/client.ts */
    baseUrl: string;
    /** Request timeout in milliseconds */
    timeout: number;
    /** Whether to include auth interceptors by default */
    withAuth: boolean;
}

export interface ZakaryaQueryConfig {
    /** Default staleTime for all queries (ms) */
    staleTime: number;
    /** Default gcTime for all queries (ms) */
    gcTime: number;
    /** Whether to retry failed queries */
    retry: boolean | number;
    /** Refetch on window focus */
    refetchOnWindowFocus: boolean;
}

export interface ZakaryaFolderConfig {
    /** Root source directory relative to project root */
    srcDir: string;
    /** Features folder name */
    featuresDir: string;
    /** Shared folder name */
    sharedDir: string;
}

export interface ZakaryaPluginConfig {
    name: string;
    options?: Record<string, unknown>;
}

export interface ZakaryaFeatureToggles {
    /** Include Zustand in shared layer */
    zustand: boolean;
    /** Include Zod validation schemas */
    zod: boolean;
    /** Include React Hook Form */
    reactHookForm: boolean;
    /** Include i18n setup */
    i18n: boolean;
    /** Include Storybook setup */
    storybook: boolean;
    /** Include Playwright e2e */
    playwright: boolean;
    /** Include Vitest unit tests */
    vitest: boolean;
}

export interface ZakaryaConfig {
    /** Schema version for forward compatibility */
    version: string;
    api: ZakaryaApiConfig;
    query: ZakaryaQueryConfig;
    folders: ZakaryaFolderConfig;
    features: ZakaryaFeatureToggles;
    plugins: ZakaryaPluginConfig[];
}

export const DEFAULT_CONFIG: ZakaryaConfig = {
    version: '1',
    api: {
        baseUrl: 'http://localhost:3001/api',
        timeout: 10_000,
        withAuth: true,
    },
    query: {
        staleTime: 60_000,
        gcTime: 300_000,
        retry: 1,
        refetchOnWindowFocus: false,
    },
    folders: {
        srcDir: 'src',
        featuresDir: 'features',
        sharedDir: 'shared',
    },
    features: {
        zustand: false,
        zod: true,
        reactHookForm: true,
        i18n: false,
        storybook: false,
        playwright: false,
        vitest: true,
    },
    plugins: [],
};
