import { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  console.error("Unhandled error:", err);

  if ("status" in err && typeof err.status === "number") {
    return c.json(
      { error: err.message || "An error occurred" },
      err.status as any,
    );
  }

  return c.json({ error: "Internal server error" }, 500);
};
