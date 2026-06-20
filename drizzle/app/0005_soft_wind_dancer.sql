CREATE TABLE "shipping_company" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"website" text,
	"base_currency_id" integer NOT NULL,
	"min_weight_kg" double precision,
	"min_volume_m3" double precision,
	"created_by" integer,
	"last_updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_company_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "shipping_plan" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"shipping_company_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"destination" text NOT NULL,
	"estimated_days_min" integer,
	"estimated_days_max" integer,
	"rate_metric" text NOT NULL,
	"pricing_mode" text NOT NULL,
	"include_import_tax" boolean DEFAULT false NOT NULL,
	"include_export_tax" boolean DEFAULT false NOT NULL,
	"include_handling_fee" boolean DEFAULT false NOT NULL,
	"include_insurance" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"last_updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_plan_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "shipping_rate" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" integer NOT NULL,
	"from_qty" double precision DEFAULT 0 NOT NULL,
	"to_qty" double precision,
	"price" double precision NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_rate_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "weight_grams" double precision;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "length_cm" double precision;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "width_cm" double precision;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "height_cm" double precision;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "hs_code" text;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "country_of_origin" text;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "fragile" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "hazardous" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shipping_company" ADD CONSTRAINT "shipping_company_base_currency_id_currency_id_fk" FOREIGN KEY ("base_currency_id") REFERENCES "public"."currency"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_company" ADD CONSTRAINT "shipping_company_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_company" ADD CONSTRAINT "shipping_company_last_updated_by_user_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_plan" ADD CONSTRAINT "shipping_plan_shipping_company_id_shipping_company_id_fk" FOREIGN KEY ("shipping_company_id") REFERENCES "public"."shipping_company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_plan" ADD CONSTRAINT "shipping_plan_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_plan" ADD CONSTRAINT "shipping_plan_last_updated_by_user_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_rate" ADD CONSTRAINT "shipping_rate_plan_id_shipping_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."shipping_plan"("id") ON DELETE cascade ON UPDATE no action;