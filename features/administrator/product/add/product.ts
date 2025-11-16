import z from 'zod';

const addProductSchema = z.object({
  name: z.string().min(1, 'Product name is required.'),
  description: z.string().min(1, 'Product description is required.'),
  price: z.string().min(1, 'Product have a price'),
  stock: z.number().min(0),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  categoryId: z.number().min(0).nullable(),
});

type AddProductSchema = z.infer<typeof addProductSchema>;

export { addProductSchema };
export type { AddProductSchema };
