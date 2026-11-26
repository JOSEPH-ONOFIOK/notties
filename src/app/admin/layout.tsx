import Image from "next/image";
import Link from "next/link";
import { adminIdentity } from "@/lib/game/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await adminIdentity();
  if (!admin)
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <Image src="/brand/logo.png" alt="" width={56} height={58} className="mx-auto" />
        <h1 className="display mt-4 text-3xl">Vlad&apos;s office</h1>
        <p className="mt-2 text-sm text-muted">Admins only. Sign in with an X account listed in ADMIN_X_USERNAMES, or open /api/admin/key?key=… with the ADMIN_KEY.</p>
        <Link href="/" className="btn btn-ghost mt-6">
          Back to the city
        </Link>
      </main>
    );

  const tabs = [
    ["/admin", "Overview"],
    ["/admin/players", "Players"],
    ["/admin/bots", "Bots"],
    ["/admin/risk", "Review"],
    ["/admin/economy", "Economy"],
    ["/admin/tasks", "Tasks"],
    ["/admin/events", "Events"],
    ["/admin/mint", "Mint"],
    ["/admin/team", "Team"],
    ["/chat?tab=announce", "Announce"],
  ];
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
          <Link href="/admin" className="mr-3 flex items-center gap-2">
            <Image src="/brand/logo.png" alt="" width={30} height={31} />
            <span className="display text-lg">Vlad&apos;s office</span>
          </Link>
          <nav className="flex flex-wrap gap-1">
            {tabs.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-raised hover:text-text">
                {label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto text-xs text-muted">
            {admin.name} · <span className="text-accent">{admin.role}</span>
          </span>
          <Link href="/dashboard" className="text-xs text-accent hover:underline">
            player view
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
