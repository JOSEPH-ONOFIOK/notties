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
      <PageTitle kicker="Wallet" title="Getaway wallet" sub="Your Nottie mints to the wallet you add here. Add it before the allowlist snapshot. Just paste your address: no signing, no gas." />
      <WalletLink wallets={wallets} suspended={p.accountStatus !== "active"} />
    </>
  );
}
