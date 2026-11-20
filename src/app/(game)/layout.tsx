import { FxLayer } from "@/components/FxLayer";
import { Nav } from "@/components/Nav";
import { currentPlayer } from "@/lib/player";
import { IntroStory } from "@/components/game/IntroStory";
import { getSettings } from "@/lib/game/core";
import { LiveBar } from "@/components/game/LiveBar";
import { MusicPlayer } from "@/components/game/MusicPlayer";
import { ChatDock } from "@/components/game/ChatDock";
import { ClaimBanner } from "@/components/game/ClaimBanner";
import { eventTimeline } from "@/lib/game/events";
import { readFeed } from "@/lib/game/feed";

export const dynamic = "force-dynamic";

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const [player, settings, timeline, feed] = await Promise.all([currentPlayer(), getSettings(), eventTimeline(), readFeed(0, 20)]);

  return (
    <div className="min-h-dvh pb-28 transition-[padding] duration-300 lg:pb-0 lg:pr-[var(--dock,0px)]">
      <div className="sticky top-0 z-40">
        <ClaimBanner until={settings.claim_deadline} label={settings.claim_label} />
        <Nav player={player} />
        <LiveBar initial={timeline} feed={feed} />
      </div>
      <MusicPlayer />
      <ChatDock me={player.username} canPost={player.accountStatus === "active"} />
      <IntroStory playerId={player.id} username={player.username} cooldownMinutes={settings.crate_cooldown_minutes} cratePrice={settings.crate_price} timerOn={!!settings.timer_crates} />
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
