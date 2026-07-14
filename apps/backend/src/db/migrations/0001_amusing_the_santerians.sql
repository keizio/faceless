CREATE TYPE "public"."speech_style" AS ENUM('formal', 'casual', 'humorous', 'professional', 'friendly', 'persuasive', 'inspirational', 'educational');--> statement-breakpoint
CREATE TABLE "avatars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"age" integer,
	"gender" text,
	"speech_style" "speech_style",
	"reference_image_url" text,
	"character_sheet_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generation_jobs" ALTER COLUMN "content_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "avatar_id" uuid;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "aspect_ratio" text;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD COLUMN "avatar_id" uuid;--> statement-breakpoint
ALTER TABLE "avatars" ADD CONSTRAINT "avatars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "avatars_user_idx" ON "avatars" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_avatar_id_avatars_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."avatars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_avatar_id_avatars_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."avatars"("id") ON DELETE cascade ON UPDATE no action;