import Image from "next/image";
import { FragmentIcon } from "@/components/FragmentIcon";
import { PageTitle, RarityPill } from "@/components/ui";
import { BRAND, FRAGMENTS, ORIGINAL_FOUR, TEASERS } from "@/lib/game/config";
import { currentPlayer } from "@/lib/player";

export const metadata = { title: "Showroom" };

export default async function Showroom() {
  const p = await currentPlayer();
  return (
    <>
      <PageTitle kicker="Showroom" title="The City" sub={`${BRAND.supply.toLocaleString()} Notties came through the portal. Here are a few that slipped out. Final traits stay sealed until reveal.`} />

      {/* your nottie */}
      <div className="card relative mb-6 overflow-hidden p-6">
        <div className="relative grid items-center gap-6 sm:grid-cols-[140px_1fr]">
          <div className="relative mx-auto aspect-square w-[140px] overflow-hidden rounded-2xl border border-border bg-raised">
            {p.forgedAt && p.nottieSeed ? <Image src={TEASERS[p.nottieSeed % TEASERS.length]} alt="Your Nottie preview" fill sizes="140px" className="object-cover" /> : <Image src="/brand/logo.png" alt="" fill sizes="140px" className="object-contain p-6 opacity-30 grayscale" />}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Your Nottie</div>
            <div className="display mt-1 text-3xl">{p.forgedAt ? "Assembled. Sealed. Waiting for mint." : `${p.progress.pct}% assembled`}</div>
            <p className="mt-1 text-sm text-muted">{p.forgedAt ? "This is a stand-in. The real traits reveal when the collection does." : "Keep hunting. The silhouette fills in as you slot fragments."}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {p.progress.slots.map((s) => (
                <li key={s.type} className={`grid h-9 w-9 place-items-center rounded-lg ${s.done ? "bg-raised" : "bg-raised/40"}`} style={s.done ? {} : { filter: "grayscale(1) opacity(.35)" }} title={s.type}>
                  <FragmentIcon type={s.type} size={24} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>


      <section className="mb-8">
        <h2 className="display mb-3 text-2xl">Teasers from the portal</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TEASERS.map((src, i) => (
            <li key={src} className="card group relative aspect-square overflow-hidden">
              <Image src={src} alt={`Nottie teaser ${i + 1}`} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/90 to-transparent p-3 text-[11px] uppercase tracking-widest text-muted">Unrevealed · #{String(i + 1).padStart(4, "0")}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="display mb-3 text-2xl">The original four</h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ORIGINAL_FOUR.map((c) => (
            <li key={c.name} className="card overflow-hidden">
              <div className="relative aspect-square bg-raised">
                <Image src={c.img} alt={c.name} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
              </div>
              <div className="p-3">
                <div className="display text-xl">{c.name}</div>
                <div className="text-xs text-muted">{c.line}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="display mb-3 text-2xl">Traits you&apos;re collecting</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FRAGMENTS.map((f) => (
            <li key={f.type} className="card flex items-center gap-3 p-3">
              <FragmentIcon type={f.type} size={40} />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{f.name}</div>
                <RarityPill rarity={f.rarity} />
              </div>
            </li>
          ))}
        </ul>
      </section>

    </>
  );
}
