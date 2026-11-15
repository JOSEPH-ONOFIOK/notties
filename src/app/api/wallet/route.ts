import { handler, json } from "@/lib/api";
import { issueNonce, linkWallet, listWallets, setPrimary, walletMessage } from "@/lib/game/wallet";
import { GameError } from "@/lib/db";
import { getAddress, isAddress } from "viem";

export const GET = handler({ name: "wallet" }, async (user) => ({ wallets: await listWallets(user.id) }));

export const POST = handler({ name: "wallet", limit: [20, 60_000] }, async (user, req) => {
  const b = await json<{ action?: "nonce" | "link" | "primary"; address?: string; signature?: `0x${string}` }>(req);
  if (!b.address || !isAddress(b.address)) throw new GameError("Invalid address");
  const address = getAddress(b.address);
  if (b.action === "nonce") {
    const nonce = await issueNonce(user.id);
    return { message: walletMessage({ username: user.x_username, address, nonce }) };
  }
  if (b.action === "link") {
    if (!b.signature) throw new GameError("Missing signature");
    return { result: await linkWallet(user.id, address, b.signature) };
  }
  if (b.action === "primary") {
    await setPrimary(user.id, address);
    return {};
  }
  throw new GameError("Unknown action");
});
