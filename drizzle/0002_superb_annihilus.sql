CREATE TABLE `product_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`createdBy` integer,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`price` numeric DEFAULT '0' NOT NULL,
	`sku` text,
	`barcode` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`width` numeric DEFAULT '0' NOT NULL,
	`height` numeric DEFAULT '0' NOT NULL,
	`length` numeric DEFAULT '0' NOT NULL,
	`weight` numeric DEFAULT '0' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP,
	`deletedAt` text,
	`categoryId` integer,
	`createdBy` integer NOT NULL,
	`updatedBy` integer NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `product_categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_barcode_unique` ON `products` (`barcode`);