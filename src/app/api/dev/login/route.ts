import { NextResponse, type NextRequest } from "next/server";
import { upsertUser } from "@/lib/game/core";
import { guestMode } from "@/lib/guest";
import { REF_COOKIE, sessionCookie } from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { verifyTurnstile } from "@/lib/turnstile";

/**
 * Enter without X: available in development, and in production while guest mode is on
 * (X OAuth not configured yet). /api/dev/login?u=robin
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && !guestMode()) return new NextResponse("Not found", { status: 404 });
  const raw = request.nextUrl.searchParams.get("u") ?? "";
  const u = raw.replace(/^@/, "").replace(/[^a-z0-9_]/gi, "").slice(0, 15);
  if (u.length < 2) return NextResponse.redirect(new URL("/enter?e=name", request.url));
  if (process.env.NODE_ENV === "production") {
    const ip = clientIp(request);
    if (!(await rateLimit(`enter:${ip}`, 10, 10 * 60_000))) return NextResponse.redirect(new URL("/enter?e=slow", request.url));
    if (!(await verifyTurnstile(request.nextUrl.searchParams.get("cf-turnstile-response"), ip))) return NextResponse.redirect(new URL("/enter?e=bot", request.url));
  }
  const ref = request.nextUrl.searchParams.get("ref") ?? request.cookies.get(REF_COOKIE)?.value ?? null;
  const x = { id: `guest-${u.toLowerCase()}`, username: u, name: u, avatar: undefined };
  const { created } = await upsertUser(x, ref);
  const next = request.nextUrl.searchParams.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : created ? "/dashboard?welcome=1" : "/dashboard";
  const res = NextResponse.redirect(new URL(dest, request.url));
  res.cookies.set(sessionCookie(x));
  res.cookies.delete(REF_COOKIE);
  return res;
}
