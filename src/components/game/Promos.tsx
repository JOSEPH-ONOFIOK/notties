import Link from "next/link";
import { TbCheck, TbLock } from "react-icons/tb";
import type { BookPromoData } from "@/lib/game/book";
import { FragmentCard } from "./FragmentCard";

const ORANGE = "#ffb347";

/** Big lime card: the mint costs nothing, assembling books your spot. */
export function FreeMintCard({ cta, className = "" }: { cta?: { href: string; label: string }; className?: string }) {
  return (
    <div className={`card card-lime relative overflow-hidden p-6 text-black sm:p-8 ${className}`}>
      <div className="beams" style={{ ["--beam" as string]: "#ffffff", opacity: 0.3 }} />
      <div className="relative">
        <div className="display inline-block -rotate-2 rounded-md border-[3px] border-black bg-black px-2 py-0.5 text-xs tracking-[0.2em] text-accent">The mint</div>
        <div className="display mt-4 text-7xl leading-[0.85] sm:text-8xl">
          FREE
          <br />
          MINT.
        </div>
        <p className="mt-4 max-w-sm font-semibold text-black/75">It costs nothing. You only cover gas. Assemble your Nottie before mint and your guaranteed spot is locked in.</p>
        <ul className="mt-5 grid gap-2 text-sm font-bold">
          {["Collect all 8 parts from crates and trades", "Assemble your Nottie in Vlad's Lab", "Your free, guaranteed mint spot is booked"].map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className="display grid h-6 w-6 shrink-0 place-items-center rounded-full border-[3px] border-black bg-black text-xs text-accent">{i + 1}</span>
              {s}
            </li>
          ))}
        </ul>
        {cta && (
          <Link href={cta.href} className="btn mt-6 border-black bg-black text-accent">
            {cta.label}
          </Link>
        )}
      </div>
      <div className="stamp absolute right-5 top-5 rotate-12 text-2xl" style={{ background: "#000", color: "#cdff00" }}>
        $0
      </div>
    </div>
  );
}

/**
 * Vlad's Book: the rarest thing in the lab. Shows how to earn it, scarcity (when a cap is set),
 * and, with `data.me`, the player's own progress toward it.
 */
export function BookCard({ data, cta, className = "" }: { data: BookPromoData; cta?: { href: string; label: string }; className?: string }) {
  const me = data.me;
  const soldOut = data.left === 0 && !me?.has;
  const steps = [
    { label: data.mission ? `Finish the mission: ${data.mission.title}` : "Finish a secret mission (dropping soon)", done: !!me?.missionDone, waiting: !data.mission },
    { label: "Assemble your Nottie", done: !!me?.forged, waiting: false },
  ];

  return (
    <div className={`card relative overflow-hidden p-6 sm:p-8 ${className}`} style={{ background: "radial-gradient(ellipse at 70% 30%, #3a2a10 0%, #17130b 70%)" }}>
      <div className="beams" style={{ ["--beam" as string]: ORANGE, opacity: 0.25 }} />
      <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_170px]">
        <div>
          <div className="display inline-block -rotate-2 rounded-md border-[3px] border-black px-2 py-0.5 text-xs tracking-[0.2em] text-black" style={{ background: ORANGE }}>
            Ultra rare · not in any crate
          </div>
          <h3 className="display mt-4 text-5xl leading-[0.9] sm:text-6xl" style={{ color: ORANGE }}>
            Vlad&apos;s Book
          </h3>
          <p className="mt-3 max-w-md text-sm text-white/75">
            The real assembly instructions. Vlad wants it back. It never drops from a crate, it can&apos;t be traded or pawned, and almost nobody will ever hold one. Whoever does, earned it.
          </p>

          {me?.has ? (
            <div className="display mt-5 inline-flex items-center gap-2 rounded-full border-[3px] border-black px-4 py-1.5 text-black shadow-[0_4px_0_#000]" style={{ background: ORANGE }}>
              <TbCheck size={18} strokeWidth={3} /> It&apos;s yours. Vlad is furious.
            </div>
          ) : (
            <ul className="mt-5 grid gap-2 text-sm">
              {steps.map((s, i) => (
                <li key={s.label} className="flex items-center gap-2 font-semibold">
                  <span className="display grid h-6 w-6 shrink-0 place-items-center rounded-full border-[3px] border-black text-xs" style={{ background: s.done ? ORANGE : "#000", color: s.done ? "#000" : ORANGE }}>
                    {s.done ? <TbCheck size={13} strokeWidth={3.5} /> : s.waiting ? <TbLock size={12} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={s.done ? "text-white/50 line-through" : "text-white"}>{s.label}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {cta && !me?.has && (
              <Link href={cta.href} className="btn border-black text-black" style={{ background: ORANGE }}>
                {cta.label}
              </Link>
            )}
            <span className="display text-xs tracking-widest text-white/60">
              {soldOut ? "All copies claimed" : data.left !== null ? `${data.left} of ${data.cap} left` : data.given > 0 ? `${data.given} in the wild` : "None found yet"}
            </span>
          </div>
        </div>
        <div className="mx-auto w-40 rotate-3 sm:w-full">
          <FragmentCard type="book" size="md" locked={false} />
        </div>
      </div>
    </div>
  );
}
