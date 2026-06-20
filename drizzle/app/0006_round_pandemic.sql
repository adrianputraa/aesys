CREATE TABLE "order" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"order_code" text NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_email" text,
	"buyer_phone" text,
	"buyer_address" text,
	"buyer_country" text,
	"order_currency_id" integer NOT NULL,
	"paid_currency_id" integer NOT NULL,
	"paid_amount" double precision DEFAULT 0 NOT NULL,
	"items_subtotal" double precision DEFAULT 0 NOT NULL,
	"shipping_fee" double precision DEFAULT 0 NOT NULL,
	"grand_total" double precision DEFAULT 0 NOT NULL,
	"shipping_plan_id" integer,
	"shipping_company_name" text,
	"shipping_plan_name" text,
	"destination" text,
	"is_international" boolean DEFAULT false NOT NULL,
	"total_weight_kg" double precision DEFAULT 0 NOT NULL,
	"total_volume_m3" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"notes" text,
	"created_by" integer,
	"last_updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "order_order_code_unique" UNIQUE("order_code")
);
--> statement-breakpoint
CREATE TABLE "order_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"order_id" integer NOT NULL,
	"kind" text NOT NULL,
	"status" text,
	"field" text,
	"old_value" text,
	"new_value" text,
	"reason" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_event_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"order_id" integer NOT NULL,
	"item_id" integer,
	"name_snapshot" text NOT NULL,
	"unit" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" double precision NOT NULL,
	"line_total" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "order_item_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_order_currency_id_currency_id_fk" FOREIGN KEY ("order_currency_id") REFERENCES "public"."currency"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_paid_currency_id_currency_id_fk" FOREIGN KEY ("paid_currency_id") REFERENCES "public"."currency"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_shipping_plan_id_shipping_plan_id_fk" FOREIGN KEY ("shipping_plan_id") REFERENCES "public"."shipping_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_last_updated_by_user_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE set null ON UPDATE no action;