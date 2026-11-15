import Image from "next/image";
import Link from "next/link";
import { TbArrowRight } from "react-icons/tb";
import { redirect } from "next/navigation";
import { guestMode } from "@/lib/guest";
import { getXUser } from "@/lib/session";
import { TurnstileField } from "@/components/game/Turnstile";
import { dbMissingOnServerless } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Enter the Lab" };

export default async function Enter({ searchParams }: { searchParams: Promise<{ ref?: string; next?: string; e?: string }> }) {
  const sp = await searchParams;
  if (!guestMode()) redirect(`/api/x/login${sp.ref ? `?ref=${encodeURIComponent(sp.ref)}` : ""}`);
  if (await getXUser()) redirect(sp.next && sp.next.startsWith("/") ? sp.next : "/dashboard");

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-16">
      <Image src="/brand/hero-img-night-v2.webp" alt="" fill priority className="object-cover opacity-40" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/70 via-bg/60 to-bg" />

      <div className="card relative w-full max-w-md p-8 anim-rise">
        <Link href="/" className="mx-auto block w-fit">
          <Image src="/brand/logo.png" alt="The Notties" width={64} height={66} className="anim-float" />
        </Link>
        <h1 className="display mt-4 text-center text-4xl">Enter the Lab</h1>
        <p className="mt-2 text-center text-sm text-muted">X sign-in opens soon. For now, pick a name and start causing trouble. Use your X handle so your progress follows you.</p>

        {dbMissingOnServerless() && (
          <div className="mt-5 rounded-xl border-[3px] border-black bg-warn p-3 text-left text-sm text-black">
            <b className="display">Setup not finished.</b> This deployment has no database connected, so sign-ins can&apos;t stick yet. Site owner: in Vercel, add a Postgres database (Storage → Neon) and redeploy.
          </div>
        )}
        <form action="/api/dev/login" method="get" className="mt-6 space-y-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">@</span>
            <input name="u" required minLength={2} maxLength={16} pattern="@?[A-Za-z0-9_]{2,15}" placeholder="your_x_handle" autoComplete="username" autoCapitalize="off" autoCorrect="off" spellCheck={false} className="pl-8" aria-label="Name" autoFocus />
          </div>
          {sp.ref && <input type="hidden" name="ref" value={sp.ref} />}
          {sp.next && <input type="hidden" name="next" value={sp.next} />}
          <TurnstileField />
          {sp.e === "name" && <p className="text-sm text-error">2–15 letters, numbers or underscores.</p>}
          {sp.e === "bot" && <p className="text-sm text-error">The bot check didn&apos;t pass. Give it another go.</p>}
          {sp.e === "slow" && <p className="text-sm text-error">Too many tries from this network. Wait a few minutes.</p>}
          <button className="btn btn-accent w-full text-base anim-glow">
            Start hunting <TbArrowRight size={20} strokeWidth={2.6} />
          </button>
        </form>

        {sp.ref && <p className="mt-4 text-center text-xs text-accent">Recruited by code {sp.ref.toUpperCase()}. The referral sticks.</p>}
        <p className="mt-6 text-center text-[11px] uppercase tracking-widest text-muted">Preview mode · progress may reset when X sign-in launches</p>
      </div>
    </main>
  );
}
