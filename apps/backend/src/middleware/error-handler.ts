import { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error("Unhandled error:", err);

  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  if (err instanceof Error && "status" in err && typeof (err as any).status === "number") {
    return c.json(
      { error: err.message || "An error occurred" },
      (err as any).status as any,
    );
  }

  return c.json({ error: "Internal server error" }, 500);
};
