ALTER TABLE "contents" ADD COLUMN "template_id" text;--> statement-breakpoint
ALTER TABLE "contents" ADD COLUMN "template_inputs" jsonb;--> statement-breakpoint
CREATE INDEX "contents_template_idx" ON "contents" USING btree ("template_id");