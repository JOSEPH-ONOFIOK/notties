import Link from "next/link";
import { TbArrowRight } from "react-icons/tb";
import { ForgeBench } from "@/components/ForgeBench";
import { PageTitle, StatusPill } from "@/components/ui";
import { getSettings } from "@/lib/game/core";
import { currentPlayer } from "@/lib/player";
import { walletGate } from "@/lib/game/wallet";

export const metadata = { title: "Forge" };

export default async function Forge() {
  const p = await currentPlayer();
  const [s, gate] = await Promise.all([getSettings(), walletGate(p.id)]);
  return (
    <>
      <PageTitle kicker="Forge" title="Vlad's Lab" sub="Collect all 7 parts and watch your Nottie come together. Fire up the machine once and your GTD spot is locked." right={<StatusPill status={p.forgedAt ? (p.wallet && gate.open ? "gtd" : "assembled") : p.status} />} />
      <ForgeBench playerId={p.id} slots={p.progress.slots} pct={p.progress.pct} complete={p.progress.complete} enabled={s.forge_enabled} suspended={p.accountStatus !== "active"} forgedAt={p.forgedAt} seed={p.nottieSeed} username={p.username} wallet={p.wallet} forgePoints={s.points.forge} gate={gate.tasks} />
      {!p.forgedAt && (
        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          <Tip t="Missing something?" d="Buy it from another player in the Market, or swap." href="/trade" />
          <Tip t="Too many of one thing?" d="Swap your duplicates with other players." href="/trade?tab=swap" />
          <Tip t="Where does my Nottie go?" d="Link your mint wallet before the snapshot." href="/wallet" />
        </div>
      )}
    </>
  );
}

function Tip({ t, d, href }: { t: string; d: string; href: string }) {
  return (
    <Link href={href} className="card p-4 transition hover:-translate-y-1">
      <div className="display">{t}</div>
      <div className="flex items-center gap-1 text-muted">
        {d} <TbArrowRight size={14} />
      </div>
    </Link>
  );
}
