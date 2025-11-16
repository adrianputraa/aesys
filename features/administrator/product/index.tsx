'use client';

import { TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { BoxesIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProductCategoryQuery, useProductQuery } from '../product/query';
import { ProductsTable } from '../product/data-table';
import { columns } from '../product/columns';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';

const ProductTrigger = () => {
  return (
    <TabsTrigger value="products">
      <BoxesIcon />
      Products
    </TabsTrigger>
  );
};

const SelectCategory = ({
  selected,
  setSelected,
  className = '',
}: {
  selected: string;
  setSelected: Dispatch<SetStateAction<string>>;
  className?: string;
}) => {
  return (
    <Select value={selected} onValueChange={setSelected}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">All</SelectItem>
      </SelectContent>
    </Select>
  );
};

const ProductContent = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);

  const { data: products } = useProductQuery({
    name: debouncedQuery.trim(),
  });

  const { data: categories } = useProductCategoryQuery();
  const [category, setCategory] = useState('0');
  const [counts, setCounts] = useState({
    product: 0,
    category: 0,
  });

  useEffect(() => {
    if (products) {
      setCounts((prev) => ({ ...prev, product: products.length }));
    }

    if (categories) {
      setCounts((prev) => ({ ...prev, category: categories.length }));
    }
  }, [products, categories]);

  return (
    <TabsContent value="products" className="space-y-2">
      <div className="grid grid-cols-2 lg:flex items-center gap-2">
        <Link href="/admin/product/add" prefetch>
          <Button variant="outline">
            <PlusIcon />
            Add Product
          </Button>
        </Link>

        <SelectCategory selected={category} setSelected={setCategory} className="w-full lg:w-[200px]" />
        <Input placeholder="Search product name" value={query} onChange={(e) => setQuery(e.target.value)} />
        <p className="col-span-2 text-sm text-muted-foreground text-nowrap">
          {counts.product} products in {counts.category} categories
        </p>
      </div>

      <div>
        <ProductsTable columns={columns} data={products ?? []} />
      </div>
    </TabsContent>
  );
};

export { ProductContent, ProductTrigger };
