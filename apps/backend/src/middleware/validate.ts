import { Context, Next } from "hono";
import { z } from "zod";
import type { AppEnv } from "../app";

export function validate(schema: z.ZodSchema) {
  return async (c: Context<AppEnv>, next: Next) => {
    try {
      const body = await c.req.json();
      const result = schema.safeParse(body);
      if (!result.success) {
        return c.json(
          { error: "Validation failed", details: result.error.flatten() },
          400,
        );
      }
      c.set("validated", result.data);
      await next();
    } catch {
      return c.json({ error: "Invalid request body" }, 400);
    }
  };
}