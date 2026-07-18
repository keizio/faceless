ALTER TABLE "contents" DROP CONSTRAINT "contents_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "contents" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contents" ADD CONSTRAINT "contents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;