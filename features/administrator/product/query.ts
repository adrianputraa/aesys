'use client';

import { handleFetch } from '@/lib/api';
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
      const result = await handleFetch<Product[]>('/api/products', {
        method: 'GET',
      });

      return result || [];
    },
  });
};
