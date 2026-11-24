"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { FACTIONS } from "@/lib/game/config";
import { fx } from "@/lib/fx";
import { sfx } from "@/lib/sfx";

/** `compact` = narrow side column (2×2 grid, no bottom margin). */
export function FactionPicker({ compact = false }: { compact?: boolean } = {}) {
  const router = useRouter();
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function join() {
    if (!pick) return;
    setBusy(true);
    setErr(null);
    try {
      await api("/api/faction", { faction: pick });
      sfx.levelUp();
      fx.burst({ count: 120, power: 14, colors: [FACTIONS.find((f) => f.id === pick)!.color, "#fff", "#000"] });
      router.refresh();
    } catch (e) {
      sfx.error();
      setErr(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className={`card p-5 sm:p-6 ${compact ? "" : "mb-6"}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="display inline-block -rotate-2 rounded-md border-[3px] border-black bg-accent px-2 py-0.5 text-xs tracking-[0.2em] text-black shadow-[0_3px_0_#000]">Pick a gang</div>
          <h2 className={`display ink-text mt-2 text-white ${compact ? "text-2xl" : "text-3xl"}`}>Who are you rolling with?</h2>
          <p className="text-sm text-muted">Your gang&apos;s $NOTTIES adds up on the Most Wanted board. You pick once, so choose wisely.</p>
        </div>
      </div>
      <ul className={`mt-4 grid grid-cols-2 gap-3 ${compact ? "" : "sm:grid-cols-4"}`}>
        {FACTIONS.map((f) => {
          const on = pick === f.id;
          return (
            <li key={f.id}>
              <button
                onClick={() => {
                  sfx.click();
                  setPick(f.id);
                }}
                className={`block w-full overflow-hidden rounded-2xl border-[3px] border-black text-left transition ${on ? "-translate-y-1.5 shadow-[0_8px_0_#000]" : "shadow-[0_5px_0_#000] hover:-translate-y-0.5"}`}
                style={{ background: on ? f.color : "var(--surface)" }}
                aria-pressed={on}
              >
                <div className={`relative bg-raised ${compact ? "aspect-[16/10]" : "aspect-square"}`}>
                  <Image src={f.img} alt="" fill sizes="200px" className={`object-cover ${compact ? "object-[center_25%]" : ""}`} />
                </div>
                <div className={`p-2.5 ${on ? "text-black" : ""}`}>
                  <div className="display">{f.name}</div>
                  <div className={`text-xs ${on ? "text-black/70" : "text-muted"}`}>{f.motto}</div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={join} disabled={!pick || busy} className="btn btn-accent">
          {busy ? "Joining…" : pick ? `Join ${FACTIONS.find((f) => f.id === pick)?.name}` : "Pick one"}
        </button>
        {err && <span className="text-sm text-error">{err}</span>}
      </div>
    </div>
  );
}
