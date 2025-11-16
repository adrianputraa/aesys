'use client';

import { ColumnDef } from '@tanstack/react-table';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: () => <div className="text-left">Name</div>,
  },
  {
    accessorKey: 'stock',
    header: () => <div className="text-center">Stock</div>,
    cell: ({ row }) => <div className="text-center">{parseFloat(row.getValue('stock'))}</div>,
  },
  {
    accessorKey: 'status',
    header: () => <div className="text-center">Status</div>,
    cell: ({ row }) => <div className="text-center">{row.getValue('status')}</div>,
  },
  {
    accessorKey: 'price',
    header: () => <div className="text-right">Price</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('price'));
      const formatted = new Intl.NumberFormat('id', {
        style: 'currency',
        currency: 'IDR',
      }).format(amount);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
];
