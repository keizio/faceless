import { Hono } from "hono";
import { verifyFirebaseToken } from "../middleware/auth";
import { NotificationService } from "../services/notification";
import type { AppEnv } from "../app";

export const notificationRoutes = new Hono<AppEnv>();

notificationRoutes.use("*", verifyFirebaseToken);

notificationRoutes.get("/", async (c) => {
  const userId = c.get("userId");
  const limit = Number(c.req.query("limit")) || 20;
  const offset = Number(c.req.query("offset")) || 0;
  const service = new NotificationService();
  const data = await service.list(userId, limit, offset);
  return c.json({ notifications: data });
});

notificationRoutes.get("/unread-count", async (c) => {
  const userId = c.get("userId");
  const service = new NotificationService();
  const count = await service.getUnreadCount(userId);
  return c.json({ count });
});

notificationRoutes.patch("/:id/read", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const service = new NotificationService();
  await service.markAsRead(userId, id);
  return c.json({ success: true });
});

notificationRoutes.post("/read-all", async (c) => {
  const userId = c.get("userId");
  const service = new NotificationService();
  await service.markAllAsRead(userId);
  return c.json({ success: true });
});