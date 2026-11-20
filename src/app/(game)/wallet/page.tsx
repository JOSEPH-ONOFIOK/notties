import { WalletLink } from "@/components/WalletLink";
import { PageTitle } from "@/components/ui";
import Link from "next/link";
import { TbCheck, TbExternalLink, TbLock } from "react-icons/tb";
import { listWallets, walletGate } from "@/lib/game/wallet";
import { currentPlayer } from "@/lib/player";

export const metadata = { title: "Wallet" };

export default async function Wallet() {
  const p = await currentPlayer();
  const [wallets, gate] = await Promise.all([listWallets(p.id), walletGate(p.id)]);
  return (
    <>
      <PageTitle kicker="Wallet" title="Getaway wallet" sub="The last step. Once your Nottie is built and you've followed, liked and commented, paste your wallet here to lock your free mint." />
      {!gate.open && wallets.length === 0 ? (
        <div className="card mx-auto max-w-xl p-6">
          <div className="display flex items-center gap-2 text-2xl">
            <TbLock size={26} className="text-warn" /> Wallets open last
          </div>
          <p className="mt-1 text-sm text-muted">To lock your free mint spot, finish these steps in order:</p>
          <ol className="mt-4 space-y-2">
            <li className={`flex items-center gap-3 rounded-xl border-2 p-3 ${gate.forged ? "border-accent" : "border-border"}`}>
              <span className={`display grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-black text-xs ${gate.forged ? "bg-accent text-black" : "bg-black text-muted"}`}>{gate.forged ? <TbCheck size={15} strokeWidth={3} /> : 1}</span>
              <span className="flex-1">Build your Nottie ({p.progress.have}/{p.progress.need} parts)</span>
              {!gate.forged && (
                <Link href="/forge" className="btn btn-ghost !min-h-[36px] !px-3 text-xs">
                  Go
                </Link>
              )}
            </li>
            {gate.tasks.map((t, i) => (
              <li key={t.id} className={`flex items-center gap-3 rounded-xl border-2 p-3 ${t.done ? "border-accent" : "border-border"}`}>
                <span className={`display grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-black text-xs ${t.done ? "bg-accent text-black" : "bg-black text-muted"}`}>{t.done ? <TbCheck size={15} strokeWidth={3} /> : i + 2}</span>
                <span className="flex-1">{t.title}</span>
                {!t.done && (
                  <Link href="/tasks" className="btn btn-ghost !min-h-[36px] !px-3 text-xs">
                    Do it <TbExternalLink size={13} />
                  </Link>
                )}
              </li>
            ))}
            <li className="flex items-center gap-3 rounded-xl border-2 border-border p-3 opacity-60">
              <span className="display grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-black bg-black text-xs text-muted">{gate.tasks.length + 2}</span>
              <span className="flex-1">Submit your wallet</span>
              <TbLock size={18} />
            </li>
          </ol>
        </div>
      ) : (
        <WalletLink wallets={wallets} suspended={p.accountStatus !== "active"} />
      )}
    </>
  );
}
