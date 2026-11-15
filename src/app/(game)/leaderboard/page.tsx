import Link from "next/link";
import { Avatar } from "@/components/Nav";
import { Coin } from "@/components/game/Coin";
import { PageTitle } from "@/components/ui";
import { POINTS_NAME } from "@/lib/game/config";
import { levelInfo } from "@/lib/game/level";
import { leaderboard, type Board, type BoardRow } from "@/lib/game/leaderboard";
import { currentPlayer } from "@/lib/player";
import { factionBoard } from "@/lib/game/social";
import { ShareCard } from "@/components/CopyButton";
import Image from "next/image";

export const metadata = { title: "Most Wanted" };

const BOARDS: { id: Board; label: string; unit: string; crime: string }[] = [
  { id: "points", label: POINTS_NAME, unit: POINTS_NAME, crime: "Excessive trouble" },
  { id: "forges", label: "First assembled", unit: "", crime: "Unauthorised assembly" },
  { id: "claims", label: "Crates", unit: "crates", crime: "Crate looting" },
  { id: "referrals", label: "Recruiters", unit: "recruits", crime: "Gang recruitment" },
  { id: "tasks", label: "Missions", unit: "missions", crime: "Mischief" },
];

export default async function Leaderboard({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const [p, sp] = await Promise.all([currentPlayer(), searchParams]);
  const gangs = sp.board === "gangs";
  const b = BOARDS.find((x) => x.id === sp.board) ?? BOARDS[0];
  const [rows, factions] = await Promise.all([gangs ? Promise.resolve([]) : leaderboard(b.id, 50), gangs ? factionBoard() : Promise.resolve([])]);
  const me = rows.find((r) => r.id === p.id);
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);
  const fmt = (r: BoardRow) => (b.id === "forges" ? new Date(r.value * 1000).toLocaleDateString() : r.value.toLocaleString());

  return (
    <>
      <PageTitle
        kicker="Leaderboard"
        title="Most Wanted"
        sub="The city's biggest troublemakers. Validated activity only: accounts under review drop off until they're cleared."
        right={
          <div className="card px-5 py-3 text-center">
            <div className="display text-[10px] tracking-widest text-muted">Your rank</div>
            <div className="display ink-text text-4xl leading-none text-white">{me ? `#${me.rank}` : "—"}</div>
            <ShareCard kind="wanted" id={p.id} text="I'm on the Most Wanted board in Robinhood City. Come cause trouble with @thenottiesworld" label="My poster" className="btn btn-ghost mt-2 !min-h-[36px] !px-3 text-xs" />
          </div>
        }
      />

      <div className="mb-8 flex flex-wrap gap-2">
        {BOARDS.map((x) => (
          <Link key={x.id} href={`/leaderboard?board=${x.id}`} className={`display rounded-full border-[3px] border-black px-4 py-2 text-sm tracking-wider shadow-[0_3px_0_#000] transition hover:-translate-y-0.5 ${!gangs && b.id === x.id ? "bg-accent text-black" : "bg-raised text-muted"}`}>
            {x.label}
          </Link>
        ))}
        <Link href="/leaderboard?board=gangs" className={`display rounded-full border-[3px] border-black px-4 py-2 text-sm tracking-wider shadow-[0_3px_0_#000] transition hover:-translate-y-0.5 ${gangs ? "bg-accent text-black" : "bg-raised text-muted"}`}>
          Gangs
        </Link>
      </div>

      {gangs ? (
        <ol className="grid gap-4 sm:grid-cols-2">
          {factions.map((f, i) => {
            const top = factions[0]?.trouble || 1;
            return (
              <li key={f.id} className={`card overflow-hidden ${p.faction === f.id ? "ring-4 ring-accent" : ""}`}>
                <div className="flex items-center gap-4 p-4">
                  <span className="display w-8 text-4xl text-white/30">{i + 1}</span>
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-[3px] border-black" style={{ background: f.color }}>
                    <Image src={f.img} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="display text-2xl" style={{ color: f.color }}>
                      {f.name}
                    </div>
                    <div className="text-xs text-muted">{f.motto}</div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-black bg-black/60">
                      <div className="h-full" style={{ width: `${(f.trouble / top) * 100}%`, background: f.color }} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 border-t-[3px] border-black text-center text-xs">
                  {[
                    ["TROUBLE", f.trouble.toLocaleString()],
                    ["Members", f.members],
                    ["Assembled", f.forged],
                    ["Crates", f.crates.toLocaleString()],
                  ].map(([k, v]) => (
                    <div key={k as string} className="border-r-2 border-black/60 py-2 last:border-0">
                      <div className="display text-base">{v}</div>
                      <div className="text-muted">{k}</div>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      ) : rows.length === 0 ? (
        <div className="card p-8 text-center text-muted">Nobody&apos;s wanted yet. Be the first.</div>
      ) : (
        <>
          {/* wanted posters: 2nd, 1st, 3rd */}
          <div className="mb-8 grid grid-cols-3 items-end gap-2 sm:gap-6">
            {[top[1], top[0], top[2]].map((r, i) =>
              r ? <Poster key={r.id} r={r} first={i === 1} crime={b.crime} value={fmt(r)} unit={b.unit} me={r.id === p.id} /> : <div key={i} />,
            )}
          </div>

          {rest.length > 0 && (
            <ol className="card divide-y-[3px] divide-black overflow-hidden">
              {rest.map((r) => (
                <li key={r.id} className={`flex items-center gap-3 px-4 py-3 ${r.id === p.id ? "bg-accent/15" : ""}`}>
                  <span className="display w-10 text-2xl text-muted">{r.rank}</span>
                  <Avatar src={r.avatar} name={r.username} size={36} />
                  <span className="display min-w-0 flex-1 truncate">
                    @{r.username}
                    {r.forged && <span className="ml-2 rounded-full border-2 border-black bg-accent px-1.5 py-0.5 text-[9px] text-black">one of us</span>}
                  </span>
                  <span className="display tabular-nums text-accent">{fmt(r)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </>
  );
}

function Poster({ r, first, crime, value, unit, me }: { r: BoardRow; first: boolean; crime: string; value: string; unit: string; me: boolean }) {
  const lv = levelInfo(r.value > 0 && unit === POINTS_NAME ? r.value : 0);
  return (
    <div className={`paper relative flex flex-col items-center p-2 text-center sm:p-4 ${first ? "-translate-y-4 rotate-0 sm:scale-105" : r.rank === 2 ? "-rotate-2" : "rotate-2"} ${me ? "ring-4 ring-accent" : ""}`} style={{ background: "#e9dcb8" }}>
      <span className="tape" style={{ background: "rgba(0,0,0,.25)" }} />
      <div className="display text-2xl leading-none tracking-wider sm:text-5xl">Wanted</div>
      <div className="display text-[9px] tracking-[0.2em] text-black/60 sm:text-xs">{first ? "Public Enemy #1" : `Rank #${r.rank}`}</div>
      <div className="relative mt-2 w-full overflow-hidden rounded border-[3px] border-black bg-[#c9b98f] p-2 sm:mt-3">
        <div className="mx-auto w-fit" style={{ filter: "sepia(.5) contrast(1.1)" }}>
          <Avatar src={r.avatar} name={r.username} size={first ? 96 : 72} />
        </div>
        {r.forged && <span className="display absolute right-1 top-1 rotate-6 rounded border-2 border-black bg-accent px-1 text-[9px] text-black">One of us</span>}
      </div>
      <div className="display mt-2 w-full truncate text-sm sm:text-xl">@{r.username}</div>
      <div className="hidden text-[11px] italic text-black/60 sm:block">for {crime}</div>
      <div className="mt-1 inline-flex items-center gap-1 rounded-full border-2 border-black bg-black px-2 py-0.5">
        {unit === POINTS_NAME && <Coin size={14} />}
        <span className="display text-xs text-accent sm:text-sm">
          {value} {unit !== POINTS_NAME ? unit : ""}
        </span>
      </div>
      {unit === POINTS_NAME && <div className="mt-1 hidden text-[10px] font-bold uppercase tracking-wider text-black/50 sm:block">Lv {lv.level} · {lv.title}</div>}
    </div>
  );
}
