CREATE TABLE "shipping_plan_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" integer NOT NULL,
	"changes" jsonb NOT NULL,
	"reason" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipping_plan_event_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "is_pre_order" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shipping_plan_event" ADD CONSTRAINT "shipping_plan_event_plan_id_shipping_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."shipping_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_plan_event" ADD CONSTRAINT "shipping_plan_event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;