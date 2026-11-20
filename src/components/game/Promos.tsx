import Link from "next/link";

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
          {["Collect all 7 parts from crates and trades", "Assemble your Nottie in Vlad's Lab", "Your free, guaranteed mint spot is booked"].map((s, i) => (
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
