CREATE TABLE "app_catalog" (
	"id" integer PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"source_file" text,
	"uploaded_by" text,
	"counts" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
