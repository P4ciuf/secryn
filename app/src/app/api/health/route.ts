import { NextResponse } from "next/server";
import { withErrorHandler } from "@/errors/apiWrapper";

/**
 * GET /api/health
 *
 * Simple liveness probe — returns 200 while the server is running.
 * Does not verify database connectivity.
 */
export const GET = withErrorHandler(async () => {
  return NextResponse.json({ status: "ok" }, { status: 200 });
});
