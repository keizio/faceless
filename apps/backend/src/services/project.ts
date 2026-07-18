import { db } from "../db";
import { projects, contents, mediaAssets } from "../db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import type { BrandKit } from "@faceless/shared";

export class ProjectService {
  async listProjects(userId: string, limit = 50, offset = 0) {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(projects)
      .where(eq(projects.userId, userId));

    const total = totalResult?.count ?? 0;

    const result = await db
      .select({
        id: projects.id,
        userId: projects.userId,
        name: projects.name,
        description: projects.description,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        contentsCount: sql<number>`count(${contents.id})`.mapWith(Number),
      })
      .from(projects)
      .leftJoin(contents, eq(contents.projectId, projects.id))
      .where(eq(projects.userId, userId))
      .groupBy(projects.id)
      .orderBy(desc(projects.updatedAt))
      .limit(limit)
      .offset(offset);

    const projectIds = result.map((p) => p.id);
    const thumbnailsByProject = new Map<string, string[]>();
    if (projectIds.length > 0) {
      const recentContents = await db
        .select({ projectId: contents.projectId, contentId: contents.id })
        .from(contents)
        .where(inArray(contents.projectId, projectIds))
        .orderBy(desc(contents.createdAt));

      const contentIds = recentContents.map((c) => c.contentId);
      if (contentIds.length > 0) {
        const media = await db
          .select()
          .from(mediaAssets)
          .where(inArray(mediaAssets.contentId, contentIds))
          .orderBy(mediaAssets.createdAt);

        const firstMediaPerContent = new Map<string, string>();
        for (const m of media) {
          if (m.contentId && !firstMediaPerContent.has(m.contentId) && (m.type === "image" || m.type === "video")) {
            firstMediaPerContent.set(m.contentId, m.url);
          }
        }

        for (const rc of recentContents) {
          if (!rc.projectId) continue;
          const url = firstMediaPerContent.get(rc.contentId);
          if (url) {
            const list = thumbnailsByProject.get(rc.projectId) ?? [];
            if (list.length < 3) {
              list.push(url);
              thumbnailsByProject.set(rc.projectId, list);
            }
          }
        }
      }
    }

    return {
      projects: result.map((p) => ({
        ...p,
        contentThumbnails: thumbnailsByProject.get(p.id) ?? [],
      })),
      total,
    };
  }

  async createProject(
    userId: string,
    data: { name: string; description?: string },
  ) {
    const [project] = await db
      .insert(projects)
      .values({ userId, name: data.name, description: data.description })
      .returning();
    return project;
  }

  async getProject(userId: string, id: string) {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .limit(1);

    if (!project) throw new Error("Project not found");

    const projectContents = await db
      .select()
      .from(contents)
      .where(eq(contents.projectId, id))
      .orderBy(contents.createdAt);

    const contentIds = projectContents.map((c) => c.id);
    const mediaByContent = new Map<string, { url: string; type: string }>();
    if (contentIds.length > 0) {
      const allMedia = await db
        .select()
        .from(mediaAssets)
        .where(inArray(mediaAssets.contentId, contentIds))
        .orderBy(mediaAssets.createdAt);
      for (const m of allMedia) {
        if (m.contentId && !mediaByContent.has(m.contentId) && (m.type === "image" || m.type === "video")) {
          mediaByContent.set(m.contentId, { url: m.url, type: m.type });
        }
      }
    }

    const contentsWithMedia = projectContents.map((c) => ({
      ...c,
      thumbnailUrl: mediaByContent.get(c.id)?.url ?? null,
    }));

    return { ...project, contents: contentsWithMedia };
  }

  async updateProject(userId: string, id: string, data: { name?: string; description?: string }) {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();

    if (!project) throw new Error("Project not found");
    return project;
  }

  async deleteProject(userId: string, id: string) {
    await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
  }

  async getBrandKit(userId: string, projectId: string): Promise<BrandKit> {
    const [project] = await db
      .select({ brandKit: projects.brandKit })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);

    if (!project) throw new Error("Project not found");
    return project.brandKit ?? {};
  }

  async updateBrandKit(
    userId: string,
    projectId: string,
    data: Partial<BrandKit>,
  ): Promise<BrandKit> {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);

    if (!project) throw new Error("Project not found");

    const [updated] = await db
      .update(projects)
      .set({ brandKit: data as BrandKit })
      .where(eq(projects.id, projectId))
      .returning({ brandKit: projects.brandKit });

    return updated.brandKit ?? {};
  }
}
