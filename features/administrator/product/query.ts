'use client';

import { handleFetch } from '@/lib/api';
import { api } from '@/lib/helpers/query';
import { useQuery } from '@tanstack/react-query';

type ProductQueryOptions = Partial<{
  id: number;
  name: string;
  stock: number;
  status: string;
}>;

export const useProductQuery = (options?: ProductQueryOptions) => {
  const optionalKeys = options ? Object.values(options).map((value) => value) : [];
  return useQuery({
    queryKey: ['product', ...optionalKeys],
    queryFn: async () => {
      const queryUrl = new URL('/api/products', 'http://localhost:3000');
      if (options?.name) {
        queryUrl.searchParams.set('q', options?.name);
      }

      const { data } = await api.get<Product[]>(queryUrl.toString());
      return data || [];
    },
  });
};

export const useProductCategoryQuery = () => {
  return useQuery({
    queryKey: ['productCategory'],
    queryFn: async () => {
      const { data } = await api.get<ProductCategoryQueryResult[]>('/api/categories/product');

      return data ?? [];
    },
  });
};
