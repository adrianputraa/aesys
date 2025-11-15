import { relations } from "drizzle-orm/relations";
import { users, productCategories, products } from "./schema";

export const productCategoriesRelations = relations(productCategories, ({one, many}) => ({
	user: one(users, {
		fields: [productCategories.createdBy],
		references: [users.id]
	}),
	products: many(products),
}));

export const usersRelations = relations(users, ({many}) => ({
	productCategories: many(productCategories),
	products_updatedBy: many(products, {
		relationName: "products_updatedBy_users_id"
	}),
	products_createdBy: many(products, {
		relationName: "products_createdBy_users_id"
	}),
}));

export const productsRelations = relations(products, ({one}) => ({
	user_updatedBy: one(users, {
		fields: [products.updatedBy],
		references: [users.id],
		relationName: "products_updatedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [products.createdBy],
		references: [users.id],
		relationName: "products_createdBy_users_id"
	}),
	productCategory: one(productCategories, {
		fields: [products.categoryId],
		references: [productCategories.id]
	}),
}));