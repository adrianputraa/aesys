CREATE TABLE "permission" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"value" text NOT NULL,
	"base_role" text NOT NULL,
	"last_updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permission_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "permission_value_unique" UNIQUE("value")
);
--> statement-breakpoint
CREATE TABLE "permission_user" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"permission_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"effect" text NOT NULL,
	"last_updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permission_user_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "permission_user_unique" UNIQUE("permission_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "permission" ADD CONSTRAINT "permission_last_updated_by_user_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_user" ADD CONSTRAINT "permission_user_permission_id_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_user" ADD CONSTRAINT "permission_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_user" ADD CONSTRAINT "permission_user_last_updated_by_user_id_fk" FOREIGN KEY ("last_updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;