import { NextResponse, type NextRequest } from "next/server";
import { OAUTH_COOKIE, callbackUrl, fetchXUser } from "@/lib/x-oauth";
import { REF_COOKIE, sessionCookie, unseal } from "@/lib/session";
import { upsertUser } from "@/lib/game/core";

export async function GET(request: NextRequest) {
  const fail = (result: string) => {
    const res = NextResponse.redirect(new URL(`/?x=${result}`, request.url));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/x" });
    return res;
  };

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const saved = unseal<{ state: string; verifier: string; next?: string }>(request.cookies.get(OAUTH_COOKIE)?.value);
  if (!code || !saved || params.get("state") !== saved.state) return fail(params.get("error") === "access_denied" ? "cancelled" : "failed");

  try {
    const x = await fetchXUser({ code, verifier: saved.verifier, redirectUri: callbackUrl(request) });
    const ref = request.cookies.get(REF_COOKIE)?.value ?? null;
    const { created } = await upsertUser(x, ref);
    const next = saved.next && saved.next.startsWith("/") ? saved.next : "/dashboard";
    const res = NextResponse.redirect(new URL(created ? `${next}?welcome=1` : next, request.url));
    res.cookies.set(sessionCookie({ id: x.id, username: x.username, name: x.name, avatar: x.avatar }));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/x" });
    res.cookies.delete(REF_COOKIE);
    return res;
  } catch (err) {
    console.error("X sign-in failed:", err);
    return fail("failed");
  }
}
