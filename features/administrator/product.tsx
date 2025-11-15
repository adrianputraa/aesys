'use client';
import { TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { BoxesIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dispatch, SetStateAction, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProductQuery } from './product/query';
import { ProductsTable } from './product/data-table';
import { columns } from './product/columns';

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
  const [category, setCategory] = useState('0');
  const [counts, setCounts] = useState({
    product: 0,
    category: 0,
  });

  const { data: products, isPending, isError } = useProductQuery();

  return (
    <TabsContent value="products">
      <div className="grid grid-cols-2 lg:flex items-center gap-2">
        <Button variant="outline">
          <PlusIcon />
          Add Product
        </Button>

        <SelectCategory selected={category} setSelected={setCategory} className="w-full lg:w-[200px]" />

        <p className="col-span-2 text-sm text-muted-foreground text-nowrap">
          {counts.product} products in {counts.category} categories
        </p>
      </div>

      <div>
        <ProductsTable columns={columns} data={products?.data ?? []} />
      </div>
    </TabsContent>
  );
};

export { ProductContent, ProductTrigger };
