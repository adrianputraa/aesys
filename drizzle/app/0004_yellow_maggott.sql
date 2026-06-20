CREATE TABLE "category" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"unit" text NOT NULL,
	"base_currency_id" integer NOT NULL,
	"base_price" double precision NOT NULL,
	"minimum_order" integer DEFAULT 1 NOT NULL,
	"maximum_order" integer,
	"stock" integer DEFAULT 0 NOT NULL,
	"created_by" integer,
	"last_updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "item_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "item_category" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "item_category_unique" UNIQUE("item_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "item_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"item_id" integer NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "item_media_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "item_price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"item_id" integer NOT NULL,
	"price" double precision NOT NULL,
	"currency_id" integer NOT NULL,
	"changed_by" integer,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "item_price_history_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_base_currency_id_currency_id_fk" FOREIGN KEY ("base_currency_id") REFERENCES "public"."currency"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_last_updated_by_user_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_category" ADD CONSTRAINT "item_category_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_category" ADD CONSTRAINT "item_category_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_media" ADD CONSTRAINT "item_media_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_price_history" ADD CONSTRAINT "item_price_history_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_price_history" ADD CONSTRAINT "item_price_history_currency_id_currency_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currency"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_price_history" ADD CONSTRAINT "item_price_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;