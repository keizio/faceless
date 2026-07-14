import { db } from "../db";
import { projects, contents } from "../db/schema";
import { eq, and } from "drizzle-orm";

export class ProjectService {
  async listProjects(userId: string) {
    return db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(projects.updatedAt);
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

    return { ...project, contents: projectContents };
  }

  async deleteProject(userId: string, id: string) {
    await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
  }
}
