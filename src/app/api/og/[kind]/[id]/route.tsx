import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FragmentIcon } from "@/components/FragmentIcon";
import { NottieFigure } from "@/components/game/NottieFigure";
import { FACTIONS, FRAGMENT_BY_TYPE, RARITY_COLOR, RARITY_LABEL } from "@/lib/game/config";
import { levelInfo } from "@/lib/game/level";
import { sharePull, shareUser } from "@/lib/share";

export const runtime = "nodejs";

let font: Buffer | null = null;
let logo: string | null = null;
async function assets() {
  font ??= await readFile(join(process.cwd(), "public/fonts/BRLNSDB.TTF"));
  logo ??= `data:image/png;base64,${(await readFile(join(process.cwd(), "public/brand/logo.png"))).toString("base64")}`;
  return { font, logo };
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
    return new ImageResponse(
      (
        <Frame logo={logo} tag={p.event ? p.event.toUpperCase() : "CRATE PULL"}>
          <div style={{ display: "flex", width: 330, height: 440, flexDirection: "column", background: c, border: `6px solid ${ink}`, borderRadius: 28, boxShadow: `0 12px 0 ${ink}`, transform: "rotate(-4deg)", padding: 16 }}>
            <span style={{ display: "flex", alignSelf: "flex-start", fontSize: 22, background: ink, color: c, borderRadius: 999, padding: "2px 14px" }}>{RARITY_LABEL[p.rarity].toUpperCase()}</span>
            <div style={{ display: "flex", flex: 1, margin: "12px 0", alignItems: "center", justifyContent: "center", background: "#141810", border: `5px solid ${ink}`, borderRadius: 20 }}>
              <FragmentIcon type={p.type} size={190} />
            </div>
            <span style={{ display: "flex", justifyContent: "center", fontSize: 30, background: ink, color: "#fff", borderRadius: 14, padding: "8px 0" }}>{def.name.toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 70, flex: 1 }}>
            <span style={{ fontSize: 34, color: "#b3baa3" }}>@{p.username} just cracked</span>
            <span style={{ fontSize: 92, lineHeight: 0.95, color: c, marginTop: 10 }}>{({ legendary: "A LEGENDARY", epic: "AN EPIC", rare: "A RARE", uncommon: "AN UNCOMMON", common: "A COMMON" } as const)[p.rarity]}</span>
            <span style={{ fontSize: 92, lineHeight: 0.95 }}>{def.name.toUpperCase()}</span>
            <span style={{ fontSize: 30, color: "#b3baa3", marginTop: 26 }}>Come raid Vlad&apos;s lab. Collect 8 parts, build a Nottie.</span>
          </div>
        </Frame>
      ),
      opts,
    );
  }

  const u = await shareUser(id);
  if (!u) return new Response("Not found", { status: 404 });

  if (kind === "nottie") {
    const all = { goggles: true, overalls: true, gloves: true, boots: true, tuft: true, goo: true, notebook: true, shard: true };
    return new ImageResponse(
      (
        <Frame logo={logo} tag={u.forged_at ? "ONE OF US" : "ASSEMBLING"} bg="#151b0c">
          <div style={{ display: "flex", width: 380, height: 480, alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ position: "absolute", width: 380, height: 380, borderRadius: 999, background: "radial-gradient(circle, rgba(205,255,0,0.45), transparent 70%)" }} />
            <NottieFigure have={all} size={330} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 50, flex: 1 }}>
            <span style={{ fontSize: 34, color: "#b3baa3" }}>@{u.username}</span>
            <span style={{ fontSize: 110, lineHeight: 0.9, color: lime, marginTop: 8 }}>{u.forged_at ? "NOW ONE" : "ALMOST"}</span>
            <span style={{ fontSize: 110, lineHeight: 0.9 }}>{u.forged_at ? "OF US." : "THERE."}</span>
            <span style={{ fontSize: 30, color: "#b3baa3", marginTop: 26 }}>{u.forged_at ? "Assembled a Nottie and locked a guaranteed mint spot." : "Collecting parts in Vlad's lab."}</span>
            <span style={{ display: "flex", alignSelf: "flex-start", marginTop: 26, fontSize: 28, background: lime, color: ink, border: `4px solid ${ink}`, borderRadius: 999, padding: "8px 22px", boxShadow: `0 6px 0 ${ink}` }}>CAUSE TROUBLE WITH US</span>
          </div>
        </Frame>
      ),
      opts,
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
            <span style={{ fontSize: 40 }}>TROUBLE</span>
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
