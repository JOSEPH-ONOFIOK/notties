import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/** The signed-in player's identity, as X reported it. The DB user is looked up by `id` (X user id). */
export type XUser = { id: string; username: string; name?: string; avatar?: string };

const COOKIE = "nt_session";
const MAX_AGE_S = 30 * 24 * 60 * 60;

const secret =
  process.env.SESSION_SECRET ||
  (process.env.X_CLIENT_SECRET
    ? createHash("sha256").update(`notties-session:${process.env.X_CLIENT_SECRET}`).digest("hex")
    : randomBytes(32).toString("hex"));

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
