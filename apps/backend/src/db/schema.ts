import type { BrandKit, IdeaItem } from "@faceless/shared";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
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

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "deduction",
  "refund",
  "bonus",
  "adjustment",
]);

export const speechStyleEnum = pgEnum("speech_style", [
  "formal",
  "casual",
  "humorous",
  "professional",
  "friendly",
  "persuasive",
  "inspirational",
  "educational",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  plan: text("plan").default("free").notNull(),
  language: text("language").default("en").notNull(),
  credits: integer("credits").default(1000).notNull(),
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
    brandKit: jsonb("brand_kit").$type<BrandKit>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("projects_user_idx").on(table.userId)],
);

export const avatars = pgTable(
  "avatars",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    age: integer("age"),
    gender: text("gender"),
    speechStyle: speechStyleEnum("speech_style"),
    referenceImageUrl: text("reference_image_url"),
    characterSheetUrl: text("character_sheet_url"),
    portraitUrl: text("portrait_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("avatars_user_idx").on(table.userId)],
);

export const contents = pgTable(
  "contents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "set null" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    avatarId: uuid("avatar_id").references(() => avatars.id, {
      onDelete: "set null",
    }),
    type: contentTypeEnum("type").notNull(),
    platform: platformEnum("platform").default("generic").notNull(),
    aspectRatio: text("aspect_ratio"),
    language: text("language").default("en").notNull(),
    status: contentStatusEnum("status").default("draft").notNull(),
    title: text("title"),
    prompt: text("prompt").notNull(),
    script: text("script"),
    caption: text("caption"),
    templateId: text("template_id"),
    templateInputs: jsonb("template_inputs").$type<Record<string, unknown>>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("contents_project_idx").on(table.projectId),
    index("contents_user_idx").on(table.userId),
    index("contents_template_idx").on(table.templateId),
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
  contentId: uuid("content_id").references(() => contents.id, {
    onDelete: "cascade",
  }),
  avatarId: uuid("avatar_id").references(() => avatars.id, {
    onDelete: "cascade",
  }),
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

export const ideas = pgTable(
  "ideas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    language: text("language").notNull(),
    ideas: jsonb("ideas").$type<IdeaItem[]>().notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ideas_user_idx").on(table.userId),
    index("ideas_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    link: text("link"),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("notifications_user_idx").on(table.userId, table.createdAt)],
);

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: creditTransactionTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason").notNull(),
    referenceId: text("reference_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("credits_user_idx").on(table.userId),
    index("credits_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  contents: many(contents),
  avatars: many(avatars),
  notifications: many(notifications),
  creditTransactions: many(creditTransactions),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  contents: many(contents),
}));

export const avatarsRelations = relations(avatars, ({ one, many }) => ({
  user: one(users, { fields: [avatars.userId], references: [users.id] }),
  contents: many(contents),
}));

export const contentsRelations = relations(contents, ({ one, many }) => ({
  project: one(projects, {
    fields: [contents.projectId],
    references: [projects.id],
  }),
  user: one(users, { fields: [contents.userId], references: [users.id] }),
  avatar: one(avatars, {
    fields: [contents.avatarId],
    references: [avatars.id],
  }),
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

export const creditTransactionsRelations = relations(
  creditTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [creditTransactions.userId],
      references: [users.id],
    }),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
