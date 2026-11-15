import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/** `/api/admin/key?key=…` sets the admin cookie (when it matches ADMIN_KEY) and opens /admin. */
export async function GET(request: NextRequest) {
  const key = process.env.ADMIN_KEY;
  const got = request.nextUrl.searchParams.get("key") ?? "";
  const ok = !!key && key.length === got.length && timingSafeEqual(Buffer.from(key), Buffer.from(got));
  const res = NextResponse.redirect(new URL(ok ? "/admin" : "/?admin=denied", request.url));
  if (ok) res.cookies.set("nt_admin", got, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 12 * 3600, path: "/" });
  return res;
}
