import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/** The signed-in player's identity, as X reported it. The DB user is looked up by `id` (X user id). */
export type XUser = { id: string; username: string; name?: string; avatar?: string };

const COOKIE = "nt_session";
const MAX_AGE_S = 30 * 24 * 60 * 60;

// Every server instance must sign with the same key, or a cookie set on one won't verify on
// another (players get bounced back to sign-in). Fall back to keys derived from other secrets that
// every instance shares before resorting to a per-process random key (local dev only).
// Last resort on Vercel: values Vercel sets identically on every function of a project. Only used
// while nothing secret is configured, i.e. guest mode, where anyone can already enter by typing a name.
const vercelStable = process.env.VERCEL ? [process.env.VERCEL_PROJECT_ID, process.env.VERCEL_GIT_REPO_ID, process.env.VERCEL_GIT_REPO_OWNER, process.env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).join("|") : "";
const derivedFrom = process.env.SESSION_SECRET || process.env.X_CLIENT_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.ADMIN_KEY || vercelStable || "";
const secret = process.env.SESSION_SECRET || (derivedFrom ? createHash("sha256").update(`notties-session:${derivedFrom}`).digest("hex") : randomBytes(32).toString("hex"));

const sign = (data: string) => createHmac("sha256", secret).update(data).digest("base64url");

export function seal(value: unknown) {
  const data = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function unseal<T>(token: string | undefined): T | null {
  const [data, sig] = token?.split(".") ?? [];
  if (!data || !sig) return null;
  const want = Buffer.from(sign(data));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
}

export async function getXUser(): Promise<XUser | null> {
  const s = unseal<XUser & { exp: number }>((await cookies()).get(COOKIE)?.value);
  if (!s || s.exp <= Date.now()) return null;
  return { id: s.id, username: s.username, name: s.name, avatar: s.avatar };
}

export function sessionCookie(user: XUser) {
  return {
    name: COOKIE,
    value: seal({ ...user, exp: Date.now() + MAX_AGE_S * 1000 }),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: MAX_AGE_S,
    path: "/",
  };
}

export const SESSION_COOKIE = COOKIE;
export const REF_COOKIE = "nt_ref";
