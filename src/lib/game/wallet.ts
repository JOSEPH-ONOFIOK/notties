import "server-only";
import { randomBytes } from "node:crypto";
import { getAddress, isAddress, verifyMessage } from "viem";
import { GameError, one, query, withTx, type Q } from "../db";
import { getSettings, logRisk, requireActive } from "./core";
import { completeTask } from "./tasks";

export const walletMessage = (p: { username: string; address: string; nonce: string }) =>
  [
    "The Notties: link this wallet to your player account.",
    "",
    `X: @${p.username}`,
    `Wallet: ${p.address}`,
    `Nonce: ${p.nonce}`,
    "",
    "Signing costs nothing and sends no transaction.",
  ].join("\n");

export async function issueNonce(userId: string) {
  const nonce = randomBytes(16).toString("hex");
  await query("insert into wallet_nonces (user_id, nonce) values ($1,$2) on conflict (user_id) do update set nonce = excluded.nonce, created_at = now()", [userId, nonce]);
  return nonce;
}

/** Accepts checksummed, lowercase or mixed-case input; returns the checksummed address. */
export function cleanAddress(raw: string) {
  const a = raw.trim();
  if (!isAddress(a, { strict: false })) throw new GameError("That doesn't look like a wallet address. It should start with 0x and be 42 characters long.");
  return getAddress(a.toLowerCase());
}

/**
 * Save a pasted address without a signature. This is the path that works on any phone, with no
 * wallet app. If someone later proves ownership of the same address with a signature, the signed
 * link wins (see linkWallet), so pasting someone else's address can't lock them out.
 */
export async function submitWallet(userId: string, address: string) {
  const addr = cleanAddress(address);
  return withTx(async (q) => {
    const settings = await getSettings(q);
    await requireActive(q, userId);
    await requireWalletOpen(q, userId);
    const owner = (await q.query<{ user_id: string }>("select user_id from wallets where address = $1", [addr])).rows[0];
    if (owner && owner.user_id !== userId) {
      await logRisk(q, userId, "wallet_reuse", { address: addr, other_user: owner.user_id, signed: false }, 2);
      throw new GameError("That wallet is already linked to another player");
    }
    await q.query("update wallets set is_primary = false where user_id = $1", [userId]);
    await q.query("insert into wallets (user_id, address, is_primary, signed) values ($1,$2,true,false) on conflict (address) do update set is_primary = true", [userId, addr]);
    await completeTask(q, userId, "link_wallet", settings).catch(() => {});
    return { address: addr };
  });
}

export async function linkWallet(userId: string, address: string, signature: `0x${string}`) {
  if (!isAddress(address, { strict: false })) throw new GameError("Invalid address");
  const addr = getAddress(address.toLowerCase());

  return withTx(async (q) => {
    const settings = await getSettings(q);
    const u = await requireActive(q, userId);
    await requireWalletOpen(q, userId);
    const n = (await q.query<{ nonce: string; created_at: string }>("select nonce, created_at from wallet_nonces where user_id = $1", [userId])).rows[0];
    if (!n || Date.now() - new Date(n.created_at).getTime() > 10 * 60_000) throw new GameError("Nonce expired. Try again.");

    const ok = await verifyMessage({ address: addr, message: walletMessage({ username: u.x_username, address: addr, nonce: n.nonce }), signature }).catch(() => false);
    if (!ok) throw new GameError("Signature didn't verify");

    const owner = (await q.query<{ user_id: string; signed: boolean }>("select user_id, signed from wallets where address = $1", [addr])).rows[0];
    if (owner && owner.user_id !== userId) {
      await logRisk(q, userId, "wallet_reuse", { address: addr, other_user: owner.user_id, took_over: !owner.signed }, 2);
      // A signature beats a pasted address: the real owner takes it back.
      if (owner.signed) throw new GameError("That wallet is already linked to another player");
      await q.query("delete from wallets where address = $1", [addr]);
    }

    await q.query("update wallets set is_primary = false where user_id = $1", [userId]);
    await q.query(
      "insert into wallets (user_id, address, is_primary, signed) values ($1,$2,true,true) on conflict (address) do update set is_primary = true, signed = true, verified_at = now()",
      [userId, addr],
    );
    await q.query("delete from wallet_nonces where user_id = $1", [userId]);
    await completeTask(q, userId, "link_wallet", settings).catch(() => {});
    return { address: addr };
  });
}

export async function listWallets(userId: string) {
  return (await query<{ address: string; is_primary: boolean; verified_at: string; signed: boolean }>("select address, is_primary, verified_at, signed from wallets where user_id = $1 order by is_primary desc, verified_at desc", [userId])).rows;
}

export async function setPrimary(userId: string, address: string) {
  const addr = cleanAddress(address);
  const w = await one("select 1 from wallets where user_id = $1 and address = $2", [userId, addr]);
  if (!w) throw new GameError("Not your wallet");
  await withTx(async (q) => {
    await q.query("update wallets set is_primary = false where user_id = $1", [userId]);
    await q.query("update wallets set is_primary = true where user_id = $1 and address = $2", [userId, addr]);
  });
}

/**
 * Wallets open last: a player must have built their Nottie AND finished the wallet missions
 * (settings.wallet_tasks, e.g. follow + like + comment). Inactive missions don't count against them.
 */
export async function walletGate(userId: string, q?: Q) {
  const run = q ? q.query.bind(q) : query;
  const settings = await getSettings(q);
  const forged = (await run("select 1 from forge_completions where user_id = $1", [userId])).rows.length > 0;
  const ids = settings.wallet_tasks;
  const tasks = ids.length
    ? (await run<{ id: string; title: string; link: string | null; done: boolean }>(
        `select t.id, t.title, t.link, exists (select 1 from task_completions c where c.user_id = $1 and c.task_id = t.id) as done
           from tasks t where t.active and t.id = any($2::text[]) order by t.sort, t.id`,
        [userId, ids],
      )).rows
    : [];
  return { forged, tasks, open: forged && tasks.every((t) => t.done) };
}

async function requireWalletOpen(q: Q, userId: string) {
  const g = await walletGate(userId, q);
  if (!g.forged) throw new GameError("Build your Nottie first. Wallets open once it's assembled.");
  const left = g.tasks.filter((t) => !t.done);
  if (left.length) throw new GameError(`Finish these missions first: ${left.map((t) => t.title).join(", ")}`);
}
