import "server-only";
import { NextResponse } from "next/server";
import { GameError } from "./db";
import { getUserByXId, upsertUser, type UserRow } from "./game/core";
import { getXUser } from "./session";

export { rateLimit } from "./ratelimit";
import { rateLimit } from "./ratelimit";

export async function requireUser(): Promise<UserRow> {
  const x = await getXUser();
  if (!x) throw new GameError("Sign in with X first", 401);
  let u = await getUserByXId(x.id);
  if (!u && x.id.startsWith("guest-")) {
    await upsertUser({ id: x.id, username: x.username, name: x.name, avatar: x.avatar });
    u = await getUserByXId(x.id);
  }
  if (!u) throw new GameError("Sign in with X first", 401);
  return u;
}

/** Wrap a route handler: auth + rate limit + GameError → JSON. */
export function handler<T>(opts: { limit?: [number, number]; name: string }, fn: (user: UserRow, req: Request) => Promise<T>) {
  return async (req: Request) => {
    try {
      const user = await requireUser();
      if (opts.limit && !(await rateLimit(`${opts.name}:${user.id}`, opts.limit[0], opts.limit[1]))) throw new GameError("Too many requests. Breathe.", 429);
      const data = await fn(user, req);
      return NextResponse.json({ ok: true, ...data });
    } catch (e) {
      if (e instanceof GameError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
      console.error(`[${opts.name}]`, e);
      return NextResponse.json({ ok: false, error: "Something broke in the lab. Try again." }, { status: 500 });
    }
  };
}

export async function json<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new GameError("Bad JSON");
  }
}
