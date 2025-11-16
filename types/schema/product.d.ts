type ProductStatus = 'ACTIVE' | 'INACTIVE';

type Product = {
  id: number;
  name: string;
  description: string;
  price: string;
  stock: number;
  sku: string;
  barcode: string | null;
  status: ProductStatus;
  categoryId: number | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type ProductCategory = {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
};
