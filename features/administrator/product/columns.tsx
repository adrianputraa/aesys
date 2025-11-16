'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
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
    maxSize: 200,
  },
  {
    id: 'actions',
    minSize: 40,
    cell: ({ row }) => {
      const product = row.original;
      const url = new URL(`/admin/product/${product.id}`, 'http://localhost:3000');

      const clipboardToast = () => {
        toast.info('Copied to clipboard', {
          id: 'copy_to_clipboard',
        });
      };

      const copyProductId = () => {
        navigator.clipboard.writeText(String(product.id));
        clipboardToast();
      };

      const copyProductUrl = () => {
        navigator.clipboard.writeText(url.toString());
        clipboardToast();
      };

      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="ml-auto h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={copyProductId}>Copy Product ID</DropdownMenuItem>
              <DropdownMenuItem onClick={copyProductUrl}>Copy Product URL</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit Product</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
