import Image from "next/image";
import Link from "next/link";
import { Countdown } from "../Countdown";
import { CopyButton } from "../CopyButton";
import { PARTS } from "@/lib/game/config";
import type { Standing, War } from "@/lib/game/gangwar";

/** Gang Wars scoreboard for the City page: race bars, countdown, prize and a recruit button. */
export function GangWarCard({ war, board, myGang, myPoints, refLink }: { war: War; board: Standing[]; myGang: string | null; myPoints: number; refLink: string }) {
  const live = war.status === "live";
  const top = Math.max(1, ...board.map((b) => b.points));
  const winner = board.find((b) => b.id === war.winner);
  const mine = board.find((b) => b.id === myGang);
  return (
    <section className="card relative overflow-hidden p-4 sm:p-6" style={{ background: "radial-gradient(ellipse at 20% 0%, #3a1010 0%, #151910 60%)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="display inline-block -rotate-1 rounded-md border-[3px] border-black bg-[#ff5d4d] px-2 py-0.5 text-xs tracking-[0.2em] text-white">{live ? "⚔️ Live now" : "🏆 Final result"}</div>
          <h2 className="display mt-2 text-3xl leading-none sm:text-4xl">Gang Wars</h2>
        </div>
        {live ? (
          <div className="text-right">
            <div className="display text-[10px] tracking-widest text-muted">Ends in</div>
            <Countdown until={war.ends_at} readyText="Ending…" className="display text-2xl text-accent" plain />
          </div>
        ) : (
          winner && <div className="display rounded-full border-[3px] border-black px-3 py-1 text-black" style={{ background: winner.color }}>{winner.name} won</div>
        )}
      </div>
      <p className="mt-2 text-sm text-muted">
        Every $NOTTIES you earn and every <b>Lab Escape</b> point counts for your gang. The winning gang splits <b className="text-accent">{war.airdrop.toLocaleString()} $NOTTIES</b> evenly + everyone gets <b className="text-accent">all {PARTS.length} parts</b> to assemble.
      </p>
      <ul className="mt-4 space-y-2">
        {board.map((g, i) => (
          <li key={g.id} className={`flex items-center gap-3 rounded-xl border-2 p-2 ${g.id === myGang ? "border-accent" : "border-black"} bg-black/30`}>
            <span className="display w-5 text-center text-sm text-muted">{i + 1}</span>
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-black" style={{ background: g.color }}>
              <Image src={g.img} alt="" fill sizes="36px" className="object-cover" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="display truncate text-sm">
                  {g.name}
                  {g.id === myGang && <span className="text-accent"> · you</span>}
                </span>
                <span className="display shrink-0 text-sm tabular-nums">{g.points.toLocaleString()}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full border-2 border-black bg-black/60">
                <div className="h-full transition-[width] duration-700" style={{ width: `${Math.max(2, (g.points / top) * 100)}%`, background: g.color }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      {live && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            {mine ? (
              <>
                You&apos;ve scored <b className="text-accent">{myPoints.toLocaleString()}</b> for {mine.name}. Recruit friends to your gang!
              </>
            ) : (
              <>Pick a gang to join the war.</>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={refLink} label="Copy recruit link" className="btn btn-accent !min-h-[40px] text-sm" />
            <Link href="/play" className="btn btn-ghost !min-h-[40px] text-sm">
              🎮 Play for points
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
