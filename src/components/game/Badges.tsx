import type { IconType } from "react-icons";
import { TbArrowsExchange, TbBook, TbBox, TbBoxMultiple, TbClipboardCheck, TbCoin, TbDiamond, TbFlame, TbFlask2, TbGift, TbHome, TbLock, TbUsers } from "react-icons/tb";
import type { Badge } from "@/lib/game/social";

const ICONS: Record<string, IconType> = { box: TbBox, boxes: TbBoxMultiple, book: TbBook, diamond: TbDiamond, flask: TbFlask2, flame: TbFlame, home: TbHome, gift: TbGift, swap: TbArrowsExchange, users: TbUsers, clipboard: TbClipboardCheck, coin: TbCoin };

export function Badges({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-end justify-between">
        <h2 className="display text-2xl">Badges</h2>
        <span className="display text-sm text-accent">
          {earned}/{badges.length}
        </span>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {badges.map((b) => {
          const I = ICONS[b.icon] ?? TbBox;
          return (
            <li key={b.id} className="group flex flex-col items-center text-center" title={b.how}>
              <div className={`relative grid h-14 w-14 place-items-center rounded-2xl border-[3px] border-black shadow-[0_4px_0_#000] transition group-hover:-translate-y-1 ${b.earned ? "-rotate-3 bg-accent text-black" : "bg-raised text-white/25"}`}>
                <I size={26} strokeWidth={2.2} />
                {!b.earned && <TbLock size={14} className="absolute -bottom-1 -right-1 rounded-full border-2 border-black bg-raised p-0.5 text-muted" />}
              </div>
              <div className={`display mt-2 text-[11px] leading-tight ${b.earned ? "" : "text-muted"}`}>{b.name}</div>
              <div className="text-[10px] leading-tight text-muted">{b.how}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
