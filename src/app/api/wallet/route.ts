import { handler, json } from "@/lib/api";
import { cleanAddress, issueNonce, linkWallet, listWallets, setPrimary, submitWallet, walletMessage } from "@/lib/game/wallet";
import { GameError } from "@/lib/db";

export const GET = handler({ name: "wallet" }, async (user) => ({ wallets: await listWallets(user.id) }));

export const POST = handler({ name: "wallet", limit: [20, 60_000] }, async (user, req) => {
  const b = await json<{ action?: "nonce" | "link" | "primary" | "submit"; address?: string; signature?: `0x${string}` }>(req);
  if (!b.address) throw new GameError("Enter your wallet address");
  const address = cleanAddress(b.address);
  if (b.action === "submit") return { result: await submitWallet(user.id, address) };
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
