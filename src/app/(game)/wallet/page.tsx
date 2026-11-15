import { WalletLink } from "@/components/WalletLink";
import { PageTitle } from "@/components/ui";
import { listWallets } from "@/lib/game/wallet";
import { currentPlayer } from "@/lib/player";

export const metadata = { title: "Wallet" };

export default async function Wallet() {
  const p = await currentPlayer();
  const wallets = await listWallets(p.id);
  return (
    <>
      <PageTitle kicker="Wallet" title="Getaway wallet" sub="Your Nottie mints to the primary wallet on this page. Link it before the allowlist snapshot. Signing proves ownership. No transaction, no gas." />
      <WalletLink wallets={wallets} suspended={p.accountStatus !== "active"} />
    </>
  );
}
