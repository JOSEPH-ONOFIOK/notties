import "server-only";
import { randomBytes } from "node:crypto";
import { getAddress, isAddress, verifyMessage } from "viem";
import { GameError, one, query, withTx } from "../db";
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

export async function linkWallet(userId: string, address: string, signature: `0x${string}`) {
  if (!isAddress(address)) throw new GameError("Invalid address");
  const addr = getAddress(address);

  return withTx(async (q) => {
    const settings = await getSettings(q);
    const u = await requireActive(q, userId);
    const n = (await q.query<{ nonce: string; created_at: string }>("select nonce, created_at from wallet_nonces where user_id = $1", [userId])).rows[0];
    if (!n || Date.now() - new Date(n.created_at).getTime() > 10 * 60_000) throw new GameError("Nonce expired. Try again.");

    const ok = await verifyMessage({ address: addr, message: walletMessage({ username: u.x_username, address: addr, nonce: n.nonce }), signature }).catch(() => false);
    if (!ok) throw new GameError("Signature didn't verify");

    const owner = (await q.query<{ user_id: string }>("select user_id from wallets where address = $1", [addr])).rows[0];
    if (owner && owner.user_id !== userId) {
      await logRisk(q, userId, "wallet_reuse", { address: addr, other_user: owner.user_id }, 2);
      throw new GameError("That wallet is already linked to another player");
    }

    await q.query("update wallets set is_primary = false where user_id = $1", [userId]);
    await q.query(
      "insert into wallets (user_id, address, is_primary) values ($1,$2,true) on conflict (address) do update set is_primary = true, verified_at = now()",
      [userId, addr],
    );
    await q.query("delete from wallet_nonces where user_id = $1", [userId]);
    await completeTask(q, userId, "link_wallet", settings).catch(() => {});
    return { address: addr };
  });
}

export async function listWallets(userId: string) {
  return (await query<{ address: string; is_primary: boolean; verified_at: string }>("select address, is_primary, verified_at from wallets where user_id = $1 order by is_primary desc, verified_at desc", [userId])).rows;
}

export async function setPrimary(userId: string, address: string) {
  if (!isAddress(address)) throw new GameError("Invalid address");
  const addr = getAddress(address);
  const w = await one("select 1 from wallets where user_id = $1 and address = $2", [userId, addr]);
  if (!w) throw new GameError("Not your wallet");
  await withTx(async (q) => {
    await q.query("update wallets set is_primary = false where user_id = $1", [userId]);
    await q.query("update wallets set is_primary = true where user_id = $1 and address = $2", [userId, addr]);
  });
}
