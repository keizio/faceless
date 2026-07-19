import { Hono } from "hono";
import { verifyFirebaseToken } from "../middleware/auth";
import { CreditTransactionService } from "../services/credit-transaction";
import type { AppEnv } from "../app";

export const creditRoutes = new Hono<AppEnv>();

creditRoutes.use("*", verifyFirebaseToken);

creditRoutes.get("/summary", async (c) => {
  const userId = c.get("userId");
  const service = new CreditTransactionService();
  const summary = await service.getUserSummary(userId);
  return c.json(summary);
});

creditRoutes.get("/transactions", async (c) => {
  const userId = c.get("userId");
  const page = c.req.query("page") ? Number(c.req.query("page")) : undefined;
  const limit = c.req.query("limit") ? Number(c.req.query("limit")) : undefined;
  const type = c.req.query("type") || undefined;
  const startDate = c.req.query("startDate") || undefined;
  const endDate = c.req.query("endDate") || undefined;

  const service = new CreditTransactionService();
  const result = await service.getTransactions(userId, {
    page,
    limit,
    type,
    startDate,
    endDate,
  });

  return c.json(result);
});