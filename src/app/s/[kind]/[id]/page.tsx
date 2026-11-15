import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TbArrowRight } from "react-icons/tb";
import { FRAGMENT_BY_TYPE } from "@/lib/game/config";
import { sharePull, shareUser } from "@/lib/share";

export const dynamic = "force-dynamic";

async function load(kind: string, id: string) {
  if (kind === "pull") {
    const p = await sharePull(id);
    if (!p) return null;
    const what = `${({ legendary: "a LEGENDARY", epic: "an Epic", rare: "a Rare", uncommon: "an Uncommon", common: "a" } as const)[p.rarity]} ${FRAGMENT_BY_TYPE[p.type].name}`;
    return { title: `@${p.username} cracked ${what}`, line: `Out of a Portal Crate in Vlad's lab.`, ref: p.ref_code };
  }
  if (kind === "nottie" || kind === "wanted") {
    const u = await shareUser(id);
    if (!u) return null;
    if (kind === "nottie") return { title: u.forged_at ? `@${u.username} is now one of us` : `@${u.username} is assembling a Nottie`, line: "Collect 8 parts. Build a Nottie. Lock a guaranteed mint spot.", ref: u.ref_code };
    return { title: `WANTED: @${u.username}`, line: `Rank #${u.rank} with ${u.points.toLocaleString()} TROUBLE.`, ref: u.ref_code };
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string; id: string }> }): Promise<Metadata> {
  const { kind, id } = await params;
  const d = await load(kind, id);
  if (!d) return { title: "The Notties" };
  const img = `/api/og/${kind}/${id}`;
  return {
    title: d.title,
    description: d.line,
    openGraph: { title: d.title, description: d.line, images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: d.title, description: d.line, images: [img] },
  };
}

export default async function SharePage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const d = await load(kind, id);
  if (!d) notFound();
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-4 py-12 text-center">
      <Link href={`/?ref=${d.ref}`}>
        <Image src="/brand/logo.png" alt="The Notties" width={64} height={66} className="anim-float" />
      </Link>
      <h1 className="display ink-text mt-4 text-4xl text-white sm:text-5xl">{d.title}</h1>
      <p className="mt-2 text-muted">{d.line}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/og/${kind}/${id}`} alt={d.title} width={1200} height={630} className="card mt-6 h-auto w-full" />
      <Link href={`/?ref=${d.ref}`} className="btn btn-accent btn-xl mt-8">
        Play The Notties <TbArrowRight size={22} strokeWidth={2.8} />
      </Link>
      <p className="mt-3 text-xs text-muted">Joining through this page counts as their recruit.</p>
    </main>
  );
}
