/**
 * Feature Templates
 *
 * Each export is a function returning the template string for that file.
 * Templates use {{VARIABLE}} syntax consumed by TemplateEngine.
 *
 * Context keys used across templates:
 *   pascal          — SalesOrder
 *   camel           — salesOrder
 *   kebab           — sales-order
 *   snake           — sales_order
 *   screamingSnake  — SALES_ORDER
 *   singularPascal  — SaleOrder
 *   singularCamel   — saleOrder
 *   pluralPascal    — SaleOrders
 *   pluralCamel     — saleOrders
 *   endpointBase    — /sales-orders  (passed in by generator)
 *   withZustand     — true/false
 *   withZod         — true/false
 */

// ─── types/{{singularPascal}}.types.ts ────────────────────────────────────────

export const typeTemplate = (): string => `
/**
 * {{singularPascal}} Domain Types
 *
 * All types for the {{camel}} feature live here.
 * Do NOT import types from other features — use shared/types if needed.
 */

export interface {{singularPascal}} {
  id: string;
  createdAt: string;
  updatedAt: string;
  // TODO: add your {{singularPascal}}-specific fields here
}

export interface {{singularPascal}}Draft {
  // TODO: fields required to create a new {{singularPascal}}
}

export interface {{singularPascal}}UpdatePayload {
  id: string;
  // TODO: fields allowed to update
}

export interface {{singularPascal}}Filters {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: keyof {{singularPascal}};
  sortOrder?: 'asc' | 'desc';
}

export interface {{pluralPascal}}Response {
  data: {{singularPascal}}[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
`.trimStart();

// ─── services/{{camel}}.service.ts ────────────────────────────────────────────

export const serviceTemplate = (): string => `
/**
 * {{singularPascal}} Service
 *
 * This is the ONLY place where API calls for the {{camel}} feature are made.
 * Uses the shared Axios client — never instantiate Axios directly here.
 */

import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints.constants';
import type {
  {{singularPascal}},
  {{singularPascal}}Draft,
  {{singularPascal}}UpdatePayload,
  {{singularPascal}}Filters,
  {{pluralPascal}}Response,
} from '../types/{{singularPascal}}.types';

const BASE = ENDPOINTS.{{screamingSnake}}_BASE;

export const {{camel}}Service = {
  /**
   * Fetch a paginated list of {{pluralCamel}}.
   */
  getAll: async (filters?: {{singularPascal}}Filters): Promise<{{pluralPascal}}Response> => {
    const { data } = await apiClient.get<{{pluralPascal}}Response>(BASE, { params: filters });
    return data;
  },

  /**
   * Fetch a single {{singularCamel}} by ID.
   */
  getById: async (id: string): Promise<{{singularPascal}}> => {
    const { data } = await apiClient.get<{{singularPascal}}>(`${BASE}/${id}`);
    return data;
  },

  /**
   * Create a new {{singularCamel}}.
   */
  create: async (payload: {{singularPascal}}Draft): Promise<{{singularPascal}}> => {
    const { data } = await apiClient.post<{{singularPascal}}>(BASE, payload);
    return data;
  },

  /**
   * Update an existing {{singularCamel}}.
   */
  update: async ({ id, ...payload }: {{singularPascal}}UpdatePayload): Promise<{{singularPascal}}> => {
    const { data } = await apiClient.patch<{{singularPascal}}>(`${BASE}/${id}`, payload);
    return data;
  },

  /**
   * Delete a {{singularCamel}} by ID.
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },
} as const;
`.trimStart();

// ─── queries/{{camel}}.keys.ts ────────────────────────────────────────────────

export const queryKeysTemplate = (): string => `
/**
 * {{singularPascal}} Query Keys
 *
 * Centralized, typed query key factory for TanStack Query.
 * All {{camel}} queries/mutations reference keys from here.
 */

import type { {{singularPascal}}Filters } from '../types/{{singularPascal}}.types';

export const {{camel}}Keys = {
  /** Base key for all {{camel}} queries */
  all: ['{{kebab}}'] as const,

  /** All list variants */
  lists: () => [...{{camel}}Keys.all, 'list'] as const,

  /** Specific list with filters */
  list: (filters?: {{singularPascal}}Filters) =>
    [...{{camel}}Keys.lists(), { filters }] as const,

  /** All detail variants */
  details: () => [...{{camel}}Keys.all, 'detail'] as const,

  /** Single item detail */
  detail: (id: string) => [...{{camel}}Keys.details(), id] as const,
} as const;
`.trimStart();

// ─── queries/{{camel}}.queries.ts ─────────────────────────────────────────────

export const queriesTemplate = (): string => `
/**
 * {{singularPascal}} Query Options
 *
 * TanStack Query queryOptions factories.
 * Compose these inside hooks — never call useQuery directly in components.
 */

import { queryOptions, infiniteQueryOptions } from '@tanstack/react-query';
import { {{camel}}Service } from '../services/{{camel}}.service';
import { {{camel}}Keys } from './{{camel}}.keys';
import type { {{singularPascal}}Filters } from '../types/{{singularPascal}}.types';

/**
 * Query options for fetching a paginated list of {{pluralCamel}}.
 */
export const {{camel}}ListQueryOptions = (filters?: {{singularPascal}}Filters) =>
  queryOptions({
    queryKey: {{camel}}Keys.list(filters),
    queryFn: () => {{camel}}Service.getAll(filters),
    staleTime: 60_000,
  });

/**
 * Query options for fetching a single {{singularCamel}} by ID.
 */
export const {{camel}}DetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: {{camel}}Keys.detail(id),
    queryFn: () => {{camel}}Service.getById(id),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
`.trimStart();

// ─── mutations/{{camel}}.mutations.ts ─────────────────────────────────────────

export const mutationsTemplate = (): string => `
/**
 * {{singularPascal}} Mutations
 *
 * TanStack Query mutation factories.
 * Each mutation handles cache invalidation automatically.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { {{camel}}Service } from '../services/{{camel}}.service';
import { {{camel}}Keys } from '../queries/{{camel}}.keys';
import type {
  {{singularPascal}}Draft,
  {{singularPascal}}UpdatePayload,
} from '../types/{{singularPascal}}.types';

/**
 * Create a new {{singularCamel}}.
 */
export function useCreate{{singularPascal}}Mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {{singularPascal}}Draft) => {{camel}}Service.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {{camel}}Keys.lists() });
    },
  });
}

/**
 * Update an existing {{singularCamel}}.
 */
export function useUpdate{{singularPascal}}Mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {{singularPascal}}UpdatePayload) => {{camel}}Service.update(payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: {{camel}}Keys.lists() });
      queryClient.setQueryData({{camel}}Keys.detail(updated.id), updated);
    },
  });
}

/**
 * Delete a {{singularCamel}}.
 */
export function useDelete{{singularPascal}}Mutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {{camel}}Service.delete(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: {{camel}}Keys.lists() });
      queryClient.removeQueries({ queryKey: {{camel}}Keys.detail(id) });
    },
  });
}
`.trimStart();

// ─── hooks/use{{pascal}}List.ts ───────────────────────────────────────────────

export const listHookTemplate = (): string => `
/**
 * use{{pluralPascal}} hook
 *
 * Composes query options + useQuery for listing {{pluralCamel}}.
 * This is what components import — never useQuery directly.
 */

import { useQuery } from '@tanstack/react-query';
import { {{camel}}ListQueryOptions } from '../queries/{{camel}}.queries';
import type { {{singularPascal}}Filters } from '../types/{{singularPascal}}.types';

export function use{{pluralPascal}}(filters?: {{singularPascal}}Filters) {
  return useQuery({{camel}}ListQueryOptions(filters));
}
`.trimStart();

// ─── hooks/use{{singularPascal}}.ts ──────────────────────────────────────────

export const detailHookTemplate = (): string => `
/**
 * use{{singularPascal}} hook
 *
 * Fetches a single {{singularCamel}} by ID.
 */

import { useQuery } from '@tanstack/react-query';
import { {{camel}}DetailQueryOptions } from '../queries/{{camel}}.queries';

export function use{{singularPascal}}(id: string) {
  return useQuery({{camel}}DetailQueryOptions(id));
}
`.trimStart();

// ─── index.ts (barrel) ───────────────────────────────────────────────────────

export const indexTemplate = (): string => `
/**
 * {{singularPascal}} Feature — Public API
 *
 * Only export what consumers of this feature need.
 * Internal implementation details remain private.
 */

// Types
export type {
  {{singularPascal}},
  {{singularPascal}}Draft,
  {{singularPascal}}UpdatePayload,
  {{singularPascal}}Filters,
  {{pluralPascal}}Response,
} from './types/{{singularPascal}}.types';

// Hooks (primary interface for components)
export { use{{pluralPascal}} } from './hooks/use{{pluralPascal}}';
export { use{{singularPascal}} } from './hooks/use{{singularPascal}}';

// Mutations
export {
  useCreate{{singularPascal}}Mutation,
  useUpdate{{singularPascal}}Mutation,
  useDelete{{singularPascal}}Mutation,
} from './mutations/{{camel}}.mutations';

// Query options (for prefetching in loaders/server components)
export {
  {{camel}}ListQueryOptions,
  {{camel}}DetailQueryOptions,
} from './queries/{{camel}}.queries';

// Query keys (for targeted invalidation from other features via shared/)
export { {{camel}}Keys } from './queries/{{camel}}.keys';
`.trimStart();
