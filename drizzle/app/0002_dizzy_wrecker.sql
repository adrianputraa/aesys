CREATE TABLE "currency" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"rate" double precision NOT NULL,
	"is_base" boolean DEFAULT false NOT NULL,
	"last_updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "currency_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "currency_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "currency_rate_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"currency_id" integer NOT NULL,
	"rate" double precision NOT NULL,
	"source" text NOT NULL,
	"changed_by" integer,
	"recorded_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "currency_rate_history_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "currency" ADD CONSTRAINT "currency_last_updated_by_user_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_rate_history" ADD CONSTRAINT "currency_rate_history_currency_id_currency_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currency"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_rate_history" ADD CONSTRAINT "currency_rate_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;