import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FragmentIcon } from "@/components/FragmentIcon";
import { NottieFigure } from "@/components/game/NottieFigure";
import { FACTIONS, FRAGMENT_BY_TYPE, RARITY_COLOR, RARITY_LABEL } from "@/lib/game/config";
import { levelInfo } from "@/lib/game/level";
import { DEFAULT_LOOK, LAYER_ORDER, lookFromSeed } from "@/lib/game/look";
import { sharePull, shareUser } from "@/lib/share";

export const runtime = "nodejs";

let font: Buffer | null = null;
let logo: string | null = null;
async function assets() {
  font ??= await readFile(join(process.cwd(), "public/fonts/BRLNSDB.TTF"));
  logo ??= `data:image/png;base64,${(await readFile(join(process.cwd(), "public/brand/logo.png"))).toString("base64")}`;
  return { font, logo };
}

/** Satori can't read WebP, so OG images use the small PNG copies in public/traits/og. */
const pngCache = new Map<string, string>();
async function traitPngs(srcs: string[]) {
  const map: Record<string, string> = {};
  for (const src of srcs) {
    let uri = pngCache.get(src);
    if (!uri) {
      const file = join(process.cwd(), "public", src.replace(/^\/traits\//, "traits/og/").replace(/\.webp$/, ".png"));
      uri = `data:image/png;base64,${(await readFile(file)).toString("base64")}`;
      pngCache.set(src, uri);
    }
    map[src] = uri;
  }
  return map;
}

const ink = "#000";
const lime = "#cdff00";

function Frame({ children, logo, tag, bg = "#11140c" }: { children: React.ReactNode; logo: string; tag: string; bg?: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: bg, fontFamily: "Berlin", color: "#f4f7eb", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: "radial-gradient(rgba(205,255,0,0.12) 2px, transparent 2.5px)", backgroundSize: "28px 28px" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "32px 48px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={56} height={58} alt="" />
          <span style={{ fontSize: 30, letterSpacing: 1 }}>THE NOTTIES</span>
        </div>
        <span style={{ fontSize: 22, background: lime, color: ink, border: `4px solid ${ink}`, borderRadius: 12, padding: "4px 14px", transform: "rotate(-2deg)" }}>{tag}</span>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", padding: "0 48px 40px" }}>{children}</div>
    </div>
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const { font, logo } = await assets();
  const opts = { width: 1200, height: 630, fonts: [{ name: "Berlin", data: font, weight: 700 as const, style: "normal" as const }], headers: { "Cache-Control": "public, max-age=3600" } };

  if (kind === "pull") {
    const p = await sharePull(id);
    if (!p) return new Response("Not found", { status: 404 });
    const def = FRAGMENT_BY_TYPE[p.type];
    const c = RARITY_COLOR[p.rarity];
    const srcMap = p.type in DEFAULT_LOOK ? await traitPngs([DEFAULT_LOOK[p.type as keyof typeof DEFAULT_LOOK].icon]) : undefined;
    return new ImageResponse(
      (
        <Frame logo={logo} tag={p.event ? p.event.toUpperCase() : "CRATE PULL"}>
          <div style={{ display: "flex", width: 330, height: 440, flexDirection: "column", background: c, border: `6px solid ${ink}`, borderRadius: 28, boxShadow: `0 12px 0 ${ink}`, transform: "rotate(-4deg)", padding: 16 }}>
            <span style={{ display: "flex", alignSelf: "flex-start", fontSize: 22, background: ink, color: c, borderRadius: 999, padding: "2px 14px" }}>{RARITY_LABEL[p.rarity].toUpperCase()}</span>
            <div style={{ display: "flex", flex: 1, margin: "12px 0", alignItems: "center", justifyContent: "center", background: "#141810", border: `5px solid ${ink}`, borderRadius: 20 }}>
              <FragmentIcon type={p.type} size={190} srcMap={srcMap} />
            </div>
            <span style={{ display: "flex", justifyContent: "center", fontSize: 30, background: ink, color: "#fff", borderRadius: 14, padding: "8px 0" }}>{def.name.toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 70, flex: 1 }}>
            <span style={{ fontSize: 34, color: "#b3baa3" }}>@{p.username} just cracked</span>
            <span style={{ fontSize: 92, lineHeight: 0.95, color: c, marginTop: 10 }}>{({ legendary: "A LEGENDARY", epic: "AN EPIC", rare: "A RARE", uncommon: "AN UNCOMMON", common: "A COMMON" } as const)[p.rarity]}</span>
            <span style={{ fontSize: 92, lineHeight: 0.95 }}>{def.name.toUpperCase()}</span>
            <span style={{ fontSize: 30, color: "#b3baa3", marginTop: 26 }}>Come raid Vlad&apos;s lab. Collect 7 parts, build a Nottie.</span>
          </div>
        </Frame>
      ),
      opts,
    );
  }

  const u = await shareUser(id);
  if (!u) return new Response("Not found", { status: 404 });

  if (kind === "nottie") {
    const all = { background: true, shadow: true, body: true, shoes: true, outfit: true, mouth: true, eyes: true, gear: true };
    const seed = u.forged_at && u.seed ? Number(u.seed) : undefined;
    const look = seed ? lookFromSeed(seed) : DEFAULT_LOOK;
    const srcMap = await traitPngs(LAYER_ORDER.map((l) => look[l].src));
    return new ImageResponse(
      (
        <Frame logo={logo} tag={u.forged_at ? "ONE OF US" : "ASSEMBLING"} bg="#151b0c">
          <div style={{ display: "flex", width: 380, height: 480, alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ position: "absolute", width: 380, height: 380, borderRadius: 999, background: "radial-gradient(circle, rgba(205,255,0,0.45), transparent 70%)" }} />
            <NottieFigure have={all} size={330} seed={seed} srcMap={srcMap} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 50, flex: 1 }}>
            <span style={{ fontSize: 34, color: "#b3baa3" }}>@{u.username}</span>
            <span style={{ fontSize: 110, lineHeight: 0.9, color: lime, marginTop: 8 }}>{u.forged_at ? "NOW ONE" : "ALMOST"}</span>
            <span style={{ fontSize: 110, lineHeight: 0.9 }}>{u.forged_at ? "OF US." : "THERE."}</span>
            <span style={{ fontSize: 30, color: "#b3baa3", marginTop: 26 }}>{u.forged_at ? "Assembled a Nottie and locked a guaranteed mint spot." : "Collecting parts in Vlad's lab."}</span>
            <span style={{ display: "flex", alignSelf: "flex-start", marginTop: 26, fontSize: 28, background: lime, color: ink, border: `4px solid ${ink}`, borderRadius: 999, padding: "8px 22px", boxShadow: `0 6px 0 ${ink}` }}>CAUSE $NOTTIES WITH US</span>
          </div>
        </Frame>
      ),
      opts,
    );
  }

  if (kind === "gtd") {
    const u = await shareUser(id);
    if (!u || !u.forged_at) return new Response("Not found", { status: 404 });
    const all = { background: true, shadow: true, body: true, shoes: true, outfit: true, mouth: true, eyes: true, gear: true };
    const look = u.seed ? lookFromSeed(Number(u.seed)) : DEFAULT_LOOK;
    const srcMap = await traitPngs(LAYER_ORDER.map((l) => look[l].src));
    const date = new Date(u.forged_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
    const row = (k: string, v: string, hi = false) => (
      <div style={{ display: "flex", flexDirection: "column", width: 300, background: ink, borderRadius: 18, padding: "16px 20px", boxShadow: "0 6px 0 rgba(0,0,0,.45)" }}>
        <span style={{ fontSize: 16, color: "rgba(255,255,255,.6)", letterSpacing: 2 }}>{k}</span>
        <span style={{ fontSize: 28, color: hi ? lime : "#fff", marginTop: 4 }}>{v}</span>
      </div>
    );
    const dl = new URL(_req.url).searchParams.has("download");
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: lime, fontFamily: "Berlin", color: ink, position: "relative", padding: 56 }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", backgroundImage: "radial-gradient(circle at 28% 50%, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", width: 420 }}>
            <div style={{ display: "flex", flexDirection: "column", width: 400, border: `6px solid ${ink}`, borderRadius: 32, overflow: "hidden", boxShadow: `0 12px 0 ${ink}`, background: "#9aa09a" }}>
              <NottieFigure have={all} size={388} seed={u.seed ? Number(u.seed) : undefined} srcMap={srcMap} />
              <div style={{ display: "flex", justifyContent: "center", background: "rgba(0,0,0,.8)", color: "rgba(255,255,255,.85)", fontSize: 15, padding: 10, letterSpacing: 1 }}>PREVIEW · TRAITS REVEAL AT MINT</div>
            </div>
            <div style={{ display: "flex", position: "absolute", top: -26, right: -40, background: ink, color: lime, fontSize: 40, padding: "8px 22px", borderRadius: 12, transform: "rotate(-8deg)", border: `4px solid ${lime}` }}>GTD SECURED</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", position: "relative", marginLeft: 56, flex: 1, justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} width={48} height={50} alt="" />
              <span style={{ fontSize: 26, background: ink, color: lime, padding: "4px 14px", borderRadius: 10 }}>THE NOTTIES · FREE MINT</span>
            </div>
            <span style={{ fontSize: 112, lineHeight: 0.9, marginTop: 22 }}>NOW ONE</span>
            <span style={{ fontSize: 112, lineHeight: 0.9 }}>OF US.</span>
            <span style={{ fontSize: 30, marginTop: 18, color: "rgba(0,0,0,.75)" }}>@{u.username} · GTD free mint secured · nottiesraid.fun</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 26 }}>
              {row("STATUS", "GTD SECURED", true)}
              {row("MINT PHASE", "1 · GUARANTEED")}
              {row("ASSEMBLED", date)}
              {row("MINT WALLET", u.wallet ? `${u.wallet.slice(0, 6)}…${u.wallet.slice(-4)}` : "NOT ADDED", !!u.wallet)}
            </div>
          </div>
        </div>
      ),
      { ...opts, width: 1500, height: 840, headers: { ...opts.headers, "Cache-Control": "no-store", ...(dl ? { "Content-Disposition": `attachment; filename="notties-gtd-${u.username}.png"` } : {}) } },
    );
  }

  if (kind === "wanted") {
    const lv = levelInfo(u.points);
    const f = FACTIONS.find((x) => x.id === u.faction);
    return new ImageResponse(
      (
        <Frame logo={logo} tag={`RANK #${u.rank}`} bg="#2a1f12">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 430, background: "#e9dcb8", color: "#1c1a12", border: `6px solid ${ink}`, borderRadius: 10, boxShadow: `0 12px 0 ${ink}`, padding: "20px 24px", transform: "rotate(-2deg)" }}>
            <span style={{ fontSize: 88, lineHeight: 1 }}>WANTED</span>
            <span style={{ fontSize: 22, letterSpacing: 4, color: "rgba(0,0,0,.55)" }}>{u.rank === 1 ? "PUBLIC ENEMY #1" : "DEAD OR ALIVE"}</span>
            <div style={{ display: "flex", width: "100%", height: 200, marginTop: 14, alignItems: "center", justifyContent: "center", background: "#c9b98f", border: `5px solid ${ink}` }}>
              {u.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.avatar_url} width={160} height={160} alt="" style={{ borderRadius: 999, border: `5px solid ${ink}` }} />
              ) : (
                <span style={{ display: "flex", width: 160, height: 160, alignItems: "center", justifyContent: "center", borderRadius: 999, background: lime, border: `5px solid ${ink}`, fontSize: 90 }}>{u.username.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <span style={{ fontSize: 46, marginTop: 12 }}>@{u.username.toUpperCase()}</span>
            <span style={{ fontSize: 22, color: "rgba(0,0,0,.6)" }}>for excessive trouble</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 60, flex: 1 }}>
            <span style={{ fontSize: 30, color: "#d9c79a" }}>REWARD</span>
            <span style={{ fontSize: 120, lineHeight: 0.95, color: lime }}>{u.points.toLocaleString()}</span>
            <span style={{ fontSize: 40 }}>$NOTTIES</span>
            <span style={{ fontSize: 30, color: "#d9c79a", marginTop: 24 }}>
              LV {lv.level} · {lv.title.toUpperCase()}
            </span>
            {f && <span style={{ fontSize: 30, color: f.color, marginTop: 6 }}>{f.name.toUpperCase()}</span>}
            <span style={{ fontSize: 26, color: "#d9c79a", marginTop: 18 }}>{u.claims} crates cracked</span>
          </div>
        </Frame>
      ),
      opts,
    );
  }

  return new Response("Not found", { status: 404 });
}
