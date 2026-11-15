import Link from "next/link";
import { FaXTwitter } from "react-icons/fa6";
import { RARITY_COLOR, RARITY_LABEL, STATUS_LABEL, type PlayerStatus, type Rarity } from "@/lib/game/config";
import { Coin } from "./game/Coin";

export function Pill({ children, tone = "muted", className = "" }: { children: React.ReactNode; tone?: "accent" | "muted" | "warn" | "error"; className?: string }) {
  const t = {
    accent: "bg-accent text-black",
    muted: "bg-raised text-muted",
    warn: "bg-warn text-black",
    error: "bg-[#ff6b5b] text-black",
  }[tone];
  return <span className={`display inline-flex items-center gap-1 rounded-full border-[3px] border-black px-2.5 py-0.5 text-[11px] tracking-wider shadow-[0_2px_0_#000] ${t} ${className}`}>{children}</span>;
}

export function RarityPill({ rarity }: { rarity: Rarity }) {
  const c = RARITY_COLOR[rarity];
  return (
    <span className="display inline-flex items-center gap-1 rounded-full border-2 border-black px-2 py-px text-[10px] tracking-wider text-black" style={{ background: c }}>
      {RARITY_LABEL[rarity]}
    </span>
  );
}

export function StatusPill({ status }: { status: PlayerStatus }) {
  const tone = status === "assembled" || status === "gtd" || status === "minted" ? "accent" : status === "ready" ? "warn" : "muted";
  return <Pill tone={tone}>{STATUS_LABEL[status]}</Pill>;
}

export function Stat({ label, value, hint, accent = false, icon }: { label: string; value: React.ReactNode; hint?: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className={`card p-4 ${accent ? "card-lime" : ""}`}>
      <div className={`display flex items-center gap-1.5 text-[11px] tracking-widest ${accent ? "text-black/70" : "text-muted"}`}>
        {icon}
        {label}
      </div>
      <div className={`display mt-1 text-3xl leading-none ${accent ? "text-black" : ""}`}>{value}</div>
      {hint && <div className={`mt-1 text-xs ${accent ? "font-semibold text-black/70" : "text-muted"}`}>{hint}</div>}
    </div>
  );
}

export function PageTitle({ kicker, title, sub, right }: { kicker?: React.ReactNode; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 anim-rise">
      <div>
        {kicker && <div className="display inline-block -rotate-2 rounded-md border-[3px] border-black bg-accent px-2 py-0.5 text-xs tracking-[0.2em] text-black shadow-[0_3px_0_#000]">{kicker}</div>}
        <h1 className="display ink-text mt-2 text-4xl leading-[0.95] text-white sm:text-6xl">{title}</h1>
        {sub && <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Points({ n, size = "md" }: { n: number; size?: "sm" | "md" | "lg" }) {
  const s = { sm: ["text-sm", 18], md: ["text-base", 22], lg: ["text-2xl", 30] }[size] as [string, number];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border-[3px] border-black bg-black/50 py-1 pl-1 pr-3 shadow-[0_3px_0_#000] ${s[0]}`}>
      <Coin size={s[1]} />
      <span className="display tabular-nums text-accent">{n.toLocaleString()}</span>
    </span>
  );
}

export function Empty({ title, body, cta }: { title: string; body?: string; cta?: { href: string; label: string } }) {
  return (
    <div className="card flex flex-col items-center p-8 text-center">
      <div className="display text-2xl">{title}</div>
      {body && <p className="mt-2 max-w-sm text-sm text-muted">{body}</p>}
      {cta && (
        <Link href={cta.href} className="btn btn-accent mt-4">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export function ProgressBar({ pct, className = "", tall = false }: { pct: number; className?: string; tall?: boolean }) {
  const p = Math.min(100, Math.max(0, pct));
  return (
    <div className={`relative w-full overflow-hidden rounded-full border-[3px] border-black bg-black/60 ${tall ? "h-6" : "h-4"} ${className}`} role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
      <div className="relative h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${p}%` }}>
        <div className="absolute inset-x-1 top-0.5 h-1/3 rounded-full bg-white/50" />
      </div>
      {tall && <span className="display absolute inset-0 grid place-items-center text-[11px] text-white mix-blend-difference">{p}%</span>}
    </div>
  );
}

export function XGlyph() {
  return <FaXTwitter size={15} aria-hidden />;
}

export const fmtDate = (iso: string | Date) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
export const fmtDateTime = (iso: string | Date) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
