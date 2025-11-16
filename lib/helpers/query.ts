'use client';

import { QueryClient, useMutation } from '@tanstack/react-query';

const api = {
  get: <T>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body }),
  put: <T>(url: string, body?: unknown) => request<T>(url, { method: 'PUT', body }),
  patch: <T>(url: string, body?: unknown) => request<T>(url, { method: 'PATCH', body }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
};

async function request<T>(url: string, config: { method: string; body?: unknown }) {
  const res = await fetch(url, {
    method: config.method,
    body: config.body ? JSON.stringify(config.body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);

    throw {
      code: res.status,
      message: err?.message ?? res.statusText,
      data: null,
    } satisfies ApiResponse<T>;
  }

  return (await res.json()) as ApiResponse<T>;
}

export const parseApiError = (err: unknown): string => {
  if (!err) return 'Unknown error.';

  if (typeof err === 'object' && err !== null) {
    const maybe = err as Partial<ApiResponse<unknown>>;

    if (typeof maybe.message === 'string') {
      return maybe.message;
    }
  }

  // fallback for e.g. thrown strings
  if (typeof err === 'string') {
    return err;
  }

  return 'Unexpected error.';
};

const invalidateQuery = (queryClient: QueryClient, updateKeys: string | string[]) => {
  if (Array.isArray(updateKeys)) {
    queryClient.invalidateQueries({
      predicate: (query) => {
        const [key] = query.queryKey;
        return updateKeys.includes(key as string);
      },
    });
  } else {
    queryClient.invalidateQueries({
      queryKey: [updateKeys],
    });
  }
};

export { api, invalidateQuery };
