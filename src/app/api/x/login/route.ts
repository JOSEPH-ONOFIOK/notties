import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { OAUTH_COOKIE, X_CLIENT_ID, authorizeUrl, callbackUrl } from "@/lib/x-oauth";
import { REF_COOKIE, seal } from "@/lib/session";

/** Start "Sign in with X": remember a PKCE verifier + state (+ any ?ref code), then go to X. */
export async function GET(request: NextRequest) {
  if (!X_CLIENT_ID) {
    // Guest mode: no X keys yet, so send them to the name-entry page (keeping ?ref and ?next).
    const to = new URL("/enter", request.url);
    for (const k of ["ref", "next"]) {
      const v = request.nextUrl.searchParams.get(k);
      if (v) to.searchParams.set(k, v);
    }
    return NextResponse.redirect(to);
  }

  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const next = request.nextUrl.searchParams.get("next") ?? "/dashboard";

  const res = NextResponse.redirect(authorizeUrl({ redirectUri: callbackUrl(request), state, challenge }));
  res.cookies.set(OAUTH_COOKIE, seal({ state, verifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/api/x",
  });
  const ref = request.nextUrl.searchParams.get("ref") ?? request.cookies.get(REF_COOKIE)?.value;
  if (ref && /^[A-Z0-9]{3,16}$/i.test(ref)) {
    res.cookies.set(REF_COOKIE, ref.toUpperCase(), { httpOnly: true, sameSite: "lax", maxAge: 30 * 86400, path: "/" });
  }
  return res;
}
