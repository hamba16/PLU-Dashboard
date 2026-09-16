import "server-only";
import { NextResponse } from "next/server";
import { AppError } from "@/src/access";
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function failure(error: unknown) {
  if (error instanceof AppError)
    return json({ error: error.message }, error.status);
  const code = (error as { code?: string })?.code;
  if (code === "22P02" || code === "22007" || code === "22008")
    return json({ error: "A filter or identifier is invalid." }, 400);
  if (code === "23505")
    return json(
      { error: "An account or record with those details already exists." },
      409,
    );
  // Never echo database details, credentials, submitted values or provider responses.
  console.error("PLU request failed", {
    type: error instanceof Error ? error.name : "UnknownError",
  });
  return json(
    {
      error:
        "The service is unavailable. Please try again or contact your administrator.",
    },
    503,
  );
}
export async function bodyOf(request: Request) {
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (request.headers.get("origin") !== expected)
    throw new AppError("Request origin is not allowed.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError("JSON is required.", 415);
  const text = await request.text();
  if (text.length > 20000) throw new AppError("Request is too large.", 413);
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new AppError("Invalid request.");
  }
}
