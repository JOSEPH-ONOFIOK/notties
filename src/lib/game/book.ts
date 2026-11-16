import "server-only";
import { query, withTx, type Q } from "../db";
import type { Settings } from "./config";
import { addFragment, getSettings } from "./core";
import { pushFeed } from "./feed";

/**
 * Vlad's Book. A player earns one when BOTH are true:
 *   1. they completed a task marked "gives Vlad's Book" (tasks.gives_book), and
 *   2. they assembled their Nottie.
 * Order doesn't matter: this runs after every task completion and after every forge, and gives
 * the book the moment the second condition is met. One per player, ever. The book is bound to
 * the player: it can't be traded, swapped or pawned. `settings.book_cap` (0 = no limit) caps how
 * many exist in total.
 */
const REASON = "vlad_book";
const idemFor = (userId: string) => `book:${userId}`;

export async function awardBookIfEarned(q: Q, userId: string, settings: Settings): Promise<boolean> {
  const r = (
    await q.query<{ active: boolean; forged: boolean; earned: boolean; has: boolean }>(
      `select (u.status = 'active') as active,
              exists (select 1 from forge_completions f where f.user_id = u.id) as forged,
              exists (select 1 from task_completions c join tasks t on t.id = c.task_id where c.user_id = u.id and t.gives_book) as earned,
              exists (select 1 from fragment_ledger l where l.idem_key = $2) as has
         from users u where u.id = $1`,
      [userId, idemFor(userId)],
    )
  ).rows[0];
  if (!r || !r.active || !r.forged || !r.earned || r.has) return false;

  const cap = Math.max(0, Number(settings.book_cap) || 0);
  if (cap > 0) {
    // Serialise the count-then-give so two players can't both take the last copy.
    await q.query("select pg_advisory_xact_lock(7151)");
    const given = Number((await q.query<{ n: string }>("select count(*)::text as n from fragment_ledger where reason = $1 and delta > 0", [REASON])).rows[0].n);
    if (given >= cap) return false;
  }

  const added = await addFragment(q, userId, "book", 1, REASON, undefined, idemFor(userId));
  if (added) await pushFeed(q, userId, "book", {});
  return added;
}

/**
 * Give the book to everyone who already qualifies. Runs when a task is switched to "gives Vlad's
 * Book", so players who did that task and assembled earlier aren't left out.
 */
export async function backfillBooks() {
  const settings = await getSettings();
  const { rows } = await query<{ id: string }>(
    `select distinct c.user_id as id
       from task_completions c
       join tasks t on t.id = c.task_id and t.gives_book
       join forge_completions f on f.user_id = c.user_id
       join users u on u.id = c.user_id and u.status = 'active'
      where not exists (select 1 from fragment_ledger l where l.idem_key = 'book:' || c.user_id::text)
      order by c.user_id`,
  );
  let given = 0;
  for (const { id } of rows) if (await withTx((q) => awardBookIfEarned(q, id, settings))) given++;
  return { given };
}

/** How many books exist and how many are left under the cap (null = no cap). */
export async function bookStats(settings: Settings) {
  const given = Number((await query<{ n: string }>("select count(*)::text as n from fragment_ledger where reason = $1 and delta > 0", [REASON])).rows[0].n);
  const cap = Math.max(0, Number(settings.book_cap) || 0);
  return { given, cap, left: cap ? Math.max(0, cap - given) : null };
}

/** Everything the promo cards need. `userId` adds that player's progress toward the book. */
export type BookPromoData = { mission: { id: string; title: string } | null; given: number; cap: number; left: number | null; me: { forged: boolean; missionDone: boolean; has: boolean } | null };

export async function bookPromo(settings: Settings, userId?: string): Promise<BookPromoData> {
  const mission: { id: string; title: string } | null = (await query<{ id: string; title: string }>("select id, title from tasks where gives_book and active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()) order by sort, id limit 1")).rows[0] ?? null;
  const stats = await bookStats(settings);
  let me: { forged: boolean; missionDone: boolean; has: boolean } | null = null;
  if (userId) {
    const r = (
      await query<{ forged: boolean; mission_done: boolean; has: boolean }>(
        `select exists (select 1 from forge_completions where user_id = $1) as forged,
                exists (select 1 from task_completions c join tasks t on t.id = c.task_id where c.user_id = $1 and t.gives_book) as mission_done,
                exists (select 1 from fragment_ledger where idem_key = $2) as has`,
        [userId, idemFor(userId)],
      )
    ).rows[0];
    me = { forged: r.forged, missionDone: r.mission_done, has: r.has };
  }
  return { mission, ...stats, me };
}
