type ProductCategoryQueryResult = Pick<ProductCategory, 'id' | 'name' | 'description'>;
type ProductCategoryQueryPost = {
  name: string;
  description: string;
};
