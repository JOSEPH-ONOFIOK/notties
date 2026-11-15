import { FxLayer } from "@/components/FxLayer";
import { Nav } from "@/components/Nav";
import { currentPlayer } from "@/lib/player";
import { IntroStory } from "@/components/game/IntroStory";
import { getSettings } from "@/lib/game/core";
import { LiveBar } from "@/components/game/LiveBar";
import { eventTimeline } from "@/lib/game/events";
import { readFeed } from "@/lib/game/feed";

export const dynamic = "force-dynamic";

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const [player, settings, timeline, feed] = await Promise.all([currentPlayer(), getSettings(), eventTimeline(), readFeed(0, 20)]);

  return (
    <div className="min-h-dvh pb-28 lg:pb-0">
      <div className="sticky top-0 z-40">
        <Nav player={player} />
        <LiveBar initial={timeline} feed={feed} />
      </div>
      <IntroStory playerId={player.id} username={player.username} cooldownMinutes={settings.crate_cooldown_minutes} />
      <FxLayer>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
          {player.accountStatus === "suspended" && (
            <div className="card mb-6 border-black bg-[#3a120e] p-4 text-sm text-error">
              <b className="display">Account under review.</b> Crate claims, trades and rewards are paused while the team checks recent activity. If you think this is a mistake, reach out on X.
            </div>
          )}
          {children}
        </main>
      </FxLayer>
    </div>
  );
}
