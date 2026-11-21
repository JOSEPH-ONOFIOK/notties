import { NextResponse, type NextRequest } from "next/server";

/**
 * Referral links: whenever someone lands on any page with ?ref=CODE, remember the code for 30
 * days so it's applied when they sign in later, whichever page or button they use. Only runs on
 * requests that carry ?ref (see matcher), so normal traffic never touches it.
 */
export function proxy(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  const res = NextResponse.next();
  if (ref && /^[A-Za-z0-9]{3,16}$/.test(ref) && !request.cookies.get("nt_ref")) {
    res.cookies.set("nt_ref", ref.toUpperCase(), { httpOnly: true, sameSite: "lax", maxAge: 30 * 86400, path: "/" });
  }
  return res;
}

export const config = {
  matcher: [{ source: "/((?!api|_next|.*\\..*).*)", has: [{ type: "query", key: "ref" }] }],
};
