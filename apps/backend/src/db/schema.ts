import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "queued",
  "generating",
  "ready",
  "failed",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "image",
  "slide",
  "video",
  "text",
]);

export const platformEnum = pgEnum("platform", [
  "tiktok",
  "instagram",
  "facebook",
  "twitter",
  "generic",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "active",
  "completed",
  "failed",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  plan: text("plan").default("free").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("projects_user_idx").on(table.userId)],
);

export const contents = pgTable(
  "contents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: contentTypeEnum("type").notNull(),
    platform: platformEnum("platform").default("generic").notNull(),
    status: contentStatusEnum("status").default("draft").notNull(),
    title: text("title"),
    prompt: text("prompt").notNull(),
    script: text("script"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("contents_project_idx").on(table.projectId),
    index("contents_user_idx").on(table.userId),
  ],
);

export const contentVersions = pgTable(
  "content_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    outputUrl: text("output_url"),
    thumbnailUrl: text("thumbnail_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("versions_content_idx").on(table.contentId)],
);

export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentId: uuid("content_id")
    .notNull()
    .references(() => contents.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  jobType: text("job_type").notNull(),
  status: jobStatusEnum("status").default("pending").notNull(),
  progress: integer("progress").default(0).notNull(),
  result: jsonb("result").$type<Record<string, unknown>>(),
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("jobs_content_idx").on(table.contentId),
  index("jobs_user_idx").on(table.userId),
  index("jobs_status_idx").on(table.status),
]);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentId: uuid("content_id").references(() => contents.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    url: text("url").notNull(),
    provider: text("provider"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("media_user_idx").on(table.userId),
    index("media_content_idx").on(table.contentId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  contents: many(contents),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  contents: many(contents),
}));

export const contentsRelations = relations(contents, ({ one, many }) => ({
  project: one(projects, {
    fields: [contents.projectId],
    references: [projects.id],
  }),
  user: one(users, { fields: [contents.userId], references: [users.id] }),
  versions: many(contentVersions),
  jobs: many(generationJobs),
  media: many(mediaAssets),
}));

export const contentVersionsRelations = relations(
  contentVersions,
  ({ one }) => ({
    content: one(contents, {
      fields: [contentVersions.contentId],
      references: [contents.id],
    }),
  }),
);

export const generationJobsRelations = relations(
  generationJobs,
  ({ one }) => ({
    content: one(contents, {
      fields: [generationJobs.contentId],
      references: [contents.id],
    }),
    user: one(users, {
      fields: [generationJobs.userId],
      references: [users.id],
    }),
  }),
);

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  content: one(contents, {
    fields: [mediaAssets.contentId],
    references: [contents.id],
  }),
  user: one(users, { fields: [mediaAssets.userId], references: [users.id] }),
}));
