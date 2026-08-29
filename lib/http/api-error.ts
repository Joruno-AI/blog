import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function mutationErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid request",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = error instanceof Error ? error.message : "";
  if (/not found/i.test(message)) {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  if (/already in use|already has|unique constraint|still referenced/i.test(message)) {
    return NextResponse.json(
      { error: "A resource already uses this slug or path." },
      { status: 409 }
    );
  }

  return NextResponse.json({ error: fallback }, { status: 500 });
}
