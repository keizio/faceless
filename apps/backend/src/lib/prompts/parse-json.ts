import type { z } from "zod";

export function parseJsonResponse<T>(text: string, schema?: z.ZodType<T>): T {
  const raw = text.trim();

  let jsonStr = raw;

  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  } else {
    const braceStart = raw.indexOf("{");
    const bracketStart = raw.indexOf("[");

    if (braceStart !== -1 && (bracketStart === -1 || braceStart < bracketStart)) {
      const braceEnd = raw.lastIndexOf("}");
      if (braceEnd > braceStart) {
        jsonStr = raw.slice(braceStart, braceEnd + 1);
      }
    } else if (bracketStart !== -1) {
      const bracketEnd = raw.lastIndexOf("]");
      if (bracketEnd > bracketStart) {
        jsonStr = raw.slice(bracketStart, bracketEnd + 1);
      }
    }
  }

  let parsed: T;
  try {
    parsed = JSON.parse(jsonStr) as T;
  } catch {
    throw new Error(`Failed to parse JSON response. Raw text: ${raw.slice(0, 500)}`);
  }

  if (schema) {
    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new Error(`JSON response failed schema validation: ${result.error.message}`);
    }
    return result.data;
  }

  return parsed;
}
