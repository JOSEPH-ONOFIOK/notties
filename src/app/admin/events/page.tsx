import { PageTitle, fmtDateTime } from "@/components/ui";
import { DeleteEvent, EventForm, RecurringEditor } from "@/components/admin/More";
import { getSettings } from "@/lib/game/core";
import { eventTimeline, listEvents } from "@/lib/game/events";

export default async function EventsAdmin() {
  const [s, tl, oneOffs] = await Promise.all([getSettings(), eventTimeline(), listEvents()]);
  return (
    <>
      <PageTitle kicker="Admin" title="Events" sub="Everything runs on the server clock, so every player is in the same event at the same time." />
      <div className="card mb-6 p-5">
        <div className="display text-xl">Right now</div>
        {tl.active.length === 0 ? <p className="mt-2 text-sm text-muted">Nothing live.</p> : (
          <ul className="mt-2 space-y-1 text-sm">
            {tl.active.map((e) => (
              <li key={e.key + e.starts_at}>
                <b className="text-accent">{e.name}</b> <span className="text-muted">until {fmtDateTime(e.ends_at)} · {JSON.stringify(e.effects)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="display mt-4 text-sm text-muted">Coming up</div>
        <ul className="mt-1 space-y-1 text-sm">
          {tl.upcoming.map((e) => (
            <li key={e.key + e.starts_at}>
              <b>{e.name}</b> <span className="text-muted">{fmtDateTime(e.starts_at)} to {fmtDateTime(e.ends_at)}{e.recurring ? " · weekly" : ""}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <RecurringEditor initial={s.recurring_events ?? []} />
        <div className="space-y-6">
          <EventForm />
          <div className="card p-5">
            <div className="display text-xl">Scheduled one-offs</div>
            {oneOffs.length === 0 ? <p className="mt-2 text-sm text-muted">None.</p> : (
              <ul className="mt-2 divide-y-2 divide-black/60">
                {oneOffs.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <b>{e.name}</b>
                      <div className="text-xs text-muted">{fmtDateTime(e.starts_at)} to {fmtDateTime(e.ends_at)} · by {e.created_by}</div>
                    </div>
                    <DeleteEvent id={e.id} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
