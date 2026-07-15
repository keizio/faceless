CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"language" text NOT NULL,
	"date" text NOT NULL,
	"topic" text NOT NULL,
	"description" text,
	"hashtags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content_type" text,
	"platform" text,
	"source_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ideas_lang_date_idx" ON "ideas" USING btree ("language","date");