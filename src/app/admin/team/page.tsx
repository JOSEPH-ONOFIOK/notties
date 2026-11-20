import { PageTitle, fmtDate } from "@/components/ui";
import { RemoveRole, RoleForm } from "@/components/admin/More";
import { adminIdentity, can, listAdmins } from "@/lib/game/admin";
import { query } from "@/lib/db";

export default async function Team() {
  const [me, admins, log] = await Promise.all([adminIdentity(), listAdmins(), query<{ admin: string; action: string; target: string | null; created_at: string }>("select admin, action, target, created_at from admin_actions order by id desc limit 40")]);
  const owners = (process.env.ADMIN_X_USERNAMES ?? "").split(",").map((s) => s.trim().replace(/^@/, "")).filter(Boolean);
  return (
    <>
      <PageTitle kicker="Admin" title="Team" sub="Viewers can look. Moderators can suspend, clear flags, fix balances and review proofs. Owners can change everything." />
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <div className="space-y-6">
          {can(me, "owner") && <RoleForm />}
          <div className="card p-5">
            <div className="display text-xl">Members</div>
            <ul className="mt-2 divide-y-2 divide-black/60 text-sm">
              {owners.map((o) => (
                <li key={o} className="flex items-center justify-between py-2">
                  <span>@{o}</span>
                  <span className="text-xs text-accent">owner (env)</span>
                </li>
              ))}
              {admins.map((a) => (
                <li key={a.x_username} className="flex items-center gap-3 py-2">
                  <span className="flex-1">@{a.x_username}</span>
                  <span className="text-xs text-accent">{a.role}</span>
                  <span className="text-xs text-muted">{fmtDate(a.created_at)}</span>
                  {can(me, "owner") && <RemoveRole username={a.x_username} />}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card p-5">
          <div className="display text-xl">Audit log</div>
          <ul className="mt-2 max-h-[520px] divide-y-2 divide-black/60 overflow-auto text-xs">
            {log.rows.map((l, i) => (
              <li key={i} className="flex gap-2 py-1.5">
                <span className="w-32 shrink-0 text-muted">{new Date(l.created_at).toLocaleString()}</span>
                <span className="text-accent">{l.admin}</span>
                <span>{l.action}</span>
                <span className="truncate text-muted">{l.target}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
