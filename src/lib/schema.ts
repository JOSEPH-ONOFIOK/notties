import "server-only";
import type { Q } from "./db";
import { DEFAULT_SETTINGS } from "./game/config";

export const SCHEMA_SQL = `
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id bigserial primary key,
  x_id text unique not null,
  x_username text not null,
  display_name text,
  avatar_url text,
  ref_code text unique not null,
  referred_by bigint references users(id),
  status text not null default 'active',
  points bigint not null default 0,
  lifetime_points bigint not null default 0,
  next_claim_at timestamptz,
  claims int not null default 0,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists users_username_idx on users (lower(x_username));

create table if not exists wallets (
  id bigserial primary key,
  user_id bigint not null references users(id),
  address text unique not null,
  is_primary boolean not null default true,
  verified_at timestamptz not null default now()
);
create index if not exists wallets_user_idx on wallets (user_id);

create table if not exists wallet_nonces (
  user_id bigint primary key references users(id),
  nonce text not null,
  created_at timestamptz not null default now()
);

create table if not exists inventory (
  user_id bigint not null references users(id),
  type text not null,
  qty int not null default 0 check (qty >= 0),
  primary key (user_id, type)
);

create table if not exists fragment_ledger (
  id bigserial primary key,
  user_id bigint not null references users(id),
  type text not null,
  delta int not null,
  reason text not null,
  ref_id text,
  idem_key text unique,
  created_at timestamptz not null default now()
);
create index if not exists fragment_ledger_user_idx on fragment_ledger (user_id, created_at desc);

create table if not exists crate_claims (
  id bigserial primary key,
  user_id bigint not null references users(id),
  type text not null,
  rarity text not null,
  points int not null default 0,
  idem_key text unique,
  created_at timestamptz not null default now()
);
create index if not exists crate_claims_user_idx on crate_claims (user_id, created_at desc);

create table if not exists point_transactions (
  id bigserial primary key,
  user_id bigint not null references users(id),
  delta bigint not null,
  reason text not null,
  ref_id text,
  idem_key text unique,
  created_at timestamptz not null default now()
);
create index if not exists point_tx_user_idx on point_transactions (user_id, created_at desc);

create table if not exists referrals (
  id bigserial primary key,
  referrer_id bigint not null references users(id),
  referee_id bigint unique not null references users(id),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create index if not exists referrals_referrer_idx on referrals (referrer_id);

create table if not exists tasks (
  id text primary key,
  title text not null,
  description text not null,
  points int not null,
  kind text not null,
  verify text not null,
  link text,
  sort int not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

create table if not exists task_completions (
  id bigserial primary key,
  user_id bigint not null references users(id),
  task_id text not null references tasks(id),
  day date not null,
  created_at timestamptz not null default now(),
  unique (user_id, task_id, day)
);

create table if not exists task_clicks (
  user_id bigint not null references users(id),
  task_id text not null,
  clicked_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

create table if not exists trades (
  id bigserial primary key,
  sender_id bigint not null references users(id),
  recipient_id bigint not null references users(id),
  type text not null,
  qty int not null,
  idem_key text unique,
  created_at timestamptz not null default now()
);
create index if not exists trades_sender_idx on trades (sender_id, created_at desc);
create index if not exists trades_recipient_idx on trades (recipient_id, created_at desc);

create table if not exists forge_completions (
  id bigserial primary key,
  user_id bigint unique not null references users(id),
  recipe jsonb not null,
  nottie_seed int not null,
  created_at timestamptz not null default now()
);

create table if not exists mint_eligibility (
  id bigserial primary key,
  user_id bigint not null references users(id),
  category text not null,
  phase int not null default 1,
  allocation int not null default 1,
  status text not null default 'approved',
  created_at timestamptz not null default now(),
  unique (user_id, category)
);

create table if not exists pawn_sales (
  id bigserial primary key,
  user_id bigint not null references users(id),
  type text not null,
  qty int not null,
  points int not null,
  created_at timestamptz not null default now()
);

create table if not exists risk_events (
  id bigserial primary key,
  user_id bigint references users(id),
  kind text not null,
  detail jsonb,
  severity int not null default 1,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists risk_user_idx on risk_events (user_id, created_at desc);

create table if not exists admin_actions (
  id bigserial primary key,
  admin text not null,
  action text not null,
  target text,
  detail jsonb,
  created_at timestamptz not null default now()
);
-- ── v2: streaks, pity, factions, shop, events, offers, feed, roles, allowlist, snapshots ──
alter table users add column if not exists streak int not null default 0;
alter table users add column if not exists best_streak int not null default 0;
alter table users add column if not exists last_checkin date;
alter table users add column if not exists pity int not null default 0;
alter table users add column if not exists faction text;

alter table crate_claims add column if not exists source text not null default 'timer';
alter table crate_claims add column if not exists event text;

alter table tasks add column if not exists proof_hint text;
-- A task that earns Vlad's Book (together with an assembled Nottie).
alter table tasks add column if not exists gives_book boolean not null default false;

create table if not exists rate_limits (
  key text primary key,
  n int not null,
  reset_at timestamptz not null
);

create table if not exists events (
  id bigserial primary key,
  name text not null,
  kind text not null,
  effects jsonb not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists events_time_idx on events (starts_at, ends_at);

create table if not exists trade_offers (
  id bigserial primary key,
  maker_id bigint not null references users(id),
  give_type text not null,
  give_qty int not null check (give_qty > 0),
  want_type text not null,
  want_qty int not null check (want_qty > 0),
  target_id bigint references users(id),
  status text not null default 'open',
  taker_id bigint references users(id),
  idem_key text unique,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists trade_offers_open_idx on trade_offers (status, created_at desc);

create table if not exists feed (
  id bigserial primary key,
  user_id bigint references users(id),
  kind text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists feed_time_idx on feed (id desc);

create table if not exists admins (
  x_username text primary key,
  role text not null,
  added_by text,
  created_at timestamptz not null default now()
);

create table if not exists allowlist_entries (
  id bigserial primary key,
  address text not null,
  category text not null,
  phase int not null default 2,
  allocation int not null default 1,
  note text,
  added_by text,
  created_at timestamptz not null default now(),
  unique (address, category)
);

create table if not exists snapshots (
  id bigserial primary key,
  label text not null,
  roots jsonb not null,
  counts jsonb not null,
  created_by text,
  created_at timestamptz not null default now()
);
create table if not exists snapshot_entries (
  snapshot_id bigint not null references snapshots(id),
  address text not null,
  phase int not null,
  allocation int not null,
  sources text not null,
  primary key (snapshot_id, address, phase)
);

create table if not exists task_submissions (
  id bigserial primary key,
  user_id bigint not null references users(id),
  task_id text not null references tasks(id),
  proof text not null,
  status text not null default 'pending',
  reviewed_by text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (user_id, task_id)
);

-- ── v3: mailbox, crates from missions, timed rounds ──
-- Free crates waiting to be opened (from mission rewards, recruits, the welcome gift).
alter table users add column if not exists crates int not null default 0;
-- false = the address was pasted in, not proven with a signature.
alter table wallets add column if not exists signed boolean not null default true;
-- How many crates a mission pays on top of its $NOTTIES.
alter table tasks add column if not exists crates int not null default 0;
alter table tasks alter column crates set default 0;

create table if not exists mail (
  id bigserial primary key,
  user_id bigint not null references users(id),
  kind text not null,
  title text not null,
  body text,
  points int not null default 0,
  crates int not null default 0,
  reason text,
  part text,
  read_at timestamptz,
  claimed_at timestamptz,
  idem_key text unique,
  created_at timestamptz not null default now()
);
create index if not exists mail_user_idx on mail (user_id, id desc);

-- Live chat (any player) and announcements (team only).
create table if not exists chat_messages (
  id bigserial primary key,
  channel text not null,
  user_id bigint references users(id),
  author text not null,
  body text not null,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists chat_channel_idx on chat_messages (channel, id desc);

-- Player-to-player market: "sell" = a card listed for $NOTTIES (card held in escrow);
-- "buy" = a $NOTTIES offer for a card (the $NOTTIES held in escrow).
create table if not exists market_listings (
  id bigserial primary key,
  kind text not null,
  user_id bigint not null references users(id),
  type text not null,
  price int not null check (price > 0),
  status text not null default 'open',
  taker_id bigint references users(id),
  idem_key text unique,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists market_open_idx on market_listings (status, kind, type, price);
`;

const TASKS = [
  {
    id: "onboarding",
    title: "Report for trouble",
    description: "Complete onboarding. You're in Robinhood City now. Act natural.",
    points: DEFAULT_SETTINGS.points.onboarding,
    kind: "once",
    verify: "auto",
    link: null,
    sort: 1,
  },
  {
    id: "follow_x",
    title: "Follow the trouble",
    description: "Follow @thenottiesworld on X. That's where the sirens go off first.",
    points: DEFAULT_SETTINGS.points.follow_x,
    kind: "once",
    verify: "link",
    link: "https://x.com/intent/follow?screen_name=thenottiesworld",
    sort: 2,
  },
  {
    id: "read_origin",
    title: "Read the file on Vlad",
    description: "Read the origin story. Know who you're stealing from.",
    points: 15,
    kind: "once",
    verify: "link",
    link: "/wiki",
    sort: 3,
  },
  {
    id: "link_wallet",
    title: "Link a getaway wallet",
    description: "Add your wallet address. It's where your Nottie gets delivered.",
    points: DEFAULT_SETTINGS.points.link_wallet,
    kind: "once",
    verify: "wallet",
    link: "/wallet",
    sort: 4,
  },
  {
    id: "like_post",
    title: "Like this tweet",
    description: "Like our pinned \"Notties Raid is live\" post on X. Final step before your wallet.",
    points: 150,
    kind: "once",
    verify: "link",
    link: "https://x.com/thenottiesworld/status/2122676459995087292",
    sort: 4,
  },
  {
    id: "rt_post",
    title: "Retweet this tweet",
    description: "Repost our pinned \"Notties Raid is live\" post on X. Final step before your wallet.",
    points: 150,
    kind: "once",
    verify: "link",
    link: "https://x.com/thenottiesworld/status/2122676459995087292",
    sort: 4,
  },

  {
    id: "daily_checkin",
    title: "Daily roll call",
    description: "Show up once a day. Vlad counts heads at midnight UTC.",
    points: DEFAULT_SETTINGS.points.daily_checkin,
    kind: "daily",
    verify: "auto",
    link: null,
    sort: 5,
  },
  {
    id: "daily_gift",
    title: "Daily gift",
    description: "Send one of your spare cards to another player today. Someone out there needs it.",
    points: DEFAULT_SETTINGS.points.daily_gift,
    kind: "daily",
    verify: "gift_today",
    link: "/trade",
    sort: 6,
  },
  {
    id: "first_trade",
    title: "Pass it along",
    description: "Send a spare fragment to another player. Sharing is a crime we endorse.",
    points: 20,
    kind: "once",
    verify: "trade",
    link: "/trade",
    sort: 6,
  },
];

/** Bump when the default economy changes enough that live settings should be reset to it, once. */
const ECONOMY_VERSION = 15;
const ECONOMY_KEYS = ["drop_weights", "points", "streak_bonus", "crate_price", "crate_buys_per_day", "crate_buy_cooldown_minutes", "timer_crates", "referral_crates", "market_prices", "wallet_tasks", "referral_qualify_claims", "referral_task"] as const;

export async function SEED(q: Q) {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await q.query(`insert into settings (key, value) values ($1, $2::jsonb) on conflict (key) do nothing`, [key, JSON.stringify(value)]);
  }
  // One-time launch reset (2026-11-21): delete every player except @thenottiesworld so the game
  // starts clean. Guarded by a settings flag so it runs exactly once.
  const reset = (await q.query("select 1 from settings where key = 'reset_users_v1'")).rows.length > 0;
  if (!reset) {
    const gone = "(select id from users where lower(x_username) <> 'thenottiesworld')";
    const jobs = [
      `update users set referred_by = null where referred_by in ${gone}`,
      `delete from referrals where referrer_id in ${gone} or referee_id in ${gone}`,
      `delete from trade_offers where maker_id in ${gone} or taker_id in ${gone} or target_id in ${gone}`,
      `delete from trades where sender_id in ${gone} or recipient_id in ${gone}`,
      `delete from market_listings where user_id in ${gone} or taker_id in ${gone}`,
      ...["feed", "chat_messages", "mail", "task_submissions", "task_completions", "task_clicks", "forge_completions", "mint_eligibility", "pawn_sales", "risk_events", "point_transactions", "fragment_ledger", "crate_claims", "inventory", "wallets", "wallet_nonces"].map((t) => `delete from ${t} where user_id in ${gone}`),
      `delete from users where id in ${gone}`,
    ];
    for (const sql of jobs) await q.query(sql);
    await q.query("insert into settings (key, value) values ('reset_users_v1', 'true'::jsonb) on conflict (key) do nothing");
  }

  // v2 economy ($NOTTIES): bigger rewards, crates bought hourly, rarer Body and Hand & Head.
  // Applied once to existing databases; admin edits after that are kept.
  const ver = Number((await q.query<{ value: unknown }>("select value from settings where key = 'economy_version'")).rows[0]?.value ?? 1);
  if (ver < ECONOMY_VERSION) {
    for (const k of ECONOMY_KEYS) {
      await q.query(`insert into settings (key, value, updated_at) values ($1, $2::jsonb, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`, [k, JSON.stringify(DEFAULT_SETTINGS[k])]);
    }
    await q.query(`insert into settings (key, value) values ('economy_version', $1::jsonb) on conflict (key) do update set value = excluded.value`, [JSON.stringify(ECONOMY_VERSION)]);
    // Built-in task rewards follow the new economy too.
    await q.query("update tasks set points = 100 where id = 'read_origin' and points = 15");
    // v3: the welcome crate is the only free one. Missions pay $NOTTIES only.
    if (ver < 3) await q.query("update tasks set crates = 0");
    // v6: the "comment on the launch post" mission is gone.
    if (ver < 6) await q.query("update tasks set active = false where id = 'comment_post'");
    // v9: missions pay 150 instead of 100.
    if (ver < 9) await q.query("update tasks set points = 150 where points = 100");
    // v10: missions for the second tweet (like, retweet, quote with a ready-made line).
    if (ver < 10) {
      const add = [
        ["like_post2", "Like the new tweet", "Like our latest post on X.", "https://x.com/thenottiesworld/status/2124186158343086332", 5],
        ["rt_post2", "Retweet the new tweet", "Retweet our latest post on X.", "https://x.com/thenottiesworld/status/2124186158343086332", 5],
        ["quote_post2", "Quote the new tweet", "Quote our latest post with the ready-made line (or your own).", "https://x.com/intent/post?text=Vlad%27s+lab+is+leaking+%F0%9F%91%80+Collecting+parts%2C+trading+my+doubles+and+locking+a+free+mint+spot+with+%40thenottiesworld.+Come+cause+trouble+%F0%9F%9F%A2&url=https%3A%2F%2Fx.com%2Fthenottiesworld%2Fstatus%2F2124186158343086332", 5],
      ];
      for (const [id, title, description, link, sort] of add) {
        await q.query(
          "insert into tasks (id, title, description, points, kind, verify, link, sort, active) values ($1,$2,$3,150,'once','link',$4,$5,true) on conflict (id) do nothing",
          [id, title, description, link, sort],
        );
      }
    }
    // v11: the new tweet's missions are timed (24h for full reward), plus a comment mission.
    if (ver < 11) {
      await q.query(
        "insert into tasks (id, title, description, points, kind, verify, link, sort, active) values ('comment_post2', 'Comment on the new tweet', 'Drop a comment on our latest post on X.', 150, 'once', 'link', $1, 5, true) on conflict (id) do nothing",
        ["https://x.com/thenottiesworld/status/2124186158343086332"],
      );
      await q.query("update tasks set starts_at = now(), ends_at = now() + interval '24 hours', active = true where id in ('like_post2', 'rt_post2', 'quote_post2', 'comment_post2')");
    }
    // v12: those missions run 8 hours, and every registered player gets a letter about them.
    if (ver < 12) {
      await q.query("update tasks set ends_at = coalesce(starts_at, now()) + interval '8 hours' where id in ('like_post2', 'rt_post2', 'quote_post2', 'comment_post2')");
      await q.query(
        `insert into mail (user_id, kind, title, body, claimed_at, idem_key)
         select id, 'system', 'A new timed mission is live', 'Like, retweet, quote and comment on our new post. Complete them quick to earn $NOTTIES before the timer runs out.', now(), 'bc:post2:' || id
           from users where status = 'active' on conflict (idem_key) do nothing`,
      );
    }
    // v13: third post (GTD free mint), timed 8h, and everyone gets a letter.
    if (ver < 13) {
      const add = [
        ["like_post3", "Like the free mint post", "Like our \"NOTTIES GTD FREE MINT\" post on X."],
        ["rt_post3", "Retweet the free mint post", "Retweet our \"NOTTIES GTD FREE MINT\" post on X."],
        ["comment_post3", "Drop your wallet on the free mint post", "Reply to our \"NOTTIES GTD FREE MINT\" post with your wallet address."],
      ];
      for (const [id, title, description] of add) {
        await q.query(
          "insert into tasks (id, title, description, points, kind, verify, link, sort, active, starts_at, ends_at) values ($1,$2,$3,150,'once','link',$4,5,true, now(), now() + interval '8 hours') on conflict (id) do nothing",
          [id, title, description, "https://x.com/thenottiesworld/status/2124504031427166217"],
        );
      }
      await q.query(
        `insert into mail (user_id, kind, title, body, claimed_at, idem_key)
         select id, 'system', 'A new timed mission is live', 'Like, retweet and drop your wallet on our new free mint post. Complete them quick to earn $NOTTIES before the timer runs out.', now(), 'bc:post3:' || id
           from users where status = 'active' on conflict (idem_key) do nothing`,
      );
    }
    // v14: free mint post gets a QRT mission; all four close in 12 hours. Letter to everyone.
    if (ver < 14) {
      await q.query(
        "insert into tasks (id, title, description, points, kind, verify, link, sort, active) values ('quote_post3', 'Quote the free mint post', 'Quote our \"NOTTIES GTD FREE MINT\" post with the ready-made line (or your own).', 150, 'once', 'link', $1, 5, true) on conflict (id) do nothing",
        ["https://x.com/intent/post?text=Want+a+NOTTIES+GTD+FREE+MINT%3F+%F0%9F%9F%A2+Earning+%24NOTTIES%2C+opening+crates+and+forging+my+Nottie+on+nottiesraid.fun+with+%40thenottiesworld&url=https%3A%2F%2Fx.com%2Fthenottiesworld%2Fstatus%2F2124504031427166217"],
      );
      await q.query("update tasks set title = 'Comment on the free mint post' where id = 'comment_post3'");
      await q.query("update tasks set starts_at = now(), ends_at = now() + interval '12 hours', active = true where id in ('like_post3', 'rt_post3', 'comment_post3', 'quote_post3')");
      await q.query(
        `insert into mail (user_id, kind, title, body, claimed_at, idem_key)
         select id, 'system', 'A new timed mission is live', 'Comment, like, retweet and quote our free mint post. 12 hours to grab them. Complete them quick to earn $NOTTIES.', now(), 'bc:post3b:' || id
           from users where status = 'active' on conflict (idem_key) do nothing`,
      );
    }
    // v15: retire the earlier tweet missions; wallet steps and referrals now use the free mint post.
    if (ver < 15) {
      await q.query("update tasks set active = false where id in ('like_post', 'rt_post', 'comment_post', 'like_post2', 'rt_post2', 'quote_post2', 'comment_post2')");
      await q.query(`insert into settings (key, value) values ('wallet_tasks', '["follow_x","like_post3","rt_post3"]'::jsonb) on conflict (key) do update set value = excluded.value`);
      await q.query(`insert into settings (key, value) values ('referral_task', '"like_post3"'::jsonb) on conflict (key) do update set value = excluded.value`);
    }
    // v7: the launch tweet is out. Point the missions at it and bring back the comment mission.
    if (ver < 7) {
      await q.query("update tasks set title = 'Follow Notties' where id = 'follow_x'");
      await q.query("update tasks set title = 'Like this tweet', description = 'Like our \"Notties Raid is live\" tweet on X.', link = $1 where id = 'like_post'", ["https://x.com/thenottiesworld/status/2122676459995087292"]);
      await q.query("update tasks set title = 'Retweet this tweet', description = 'Retweet our \"Notties Raid is live\" tweet on X.', link = $1 where id = 'rt_post'", ["https://x.com/thenottiesworld/status/2122676459995087292"]);
      await q.query(
        `insert into tasks (id, title, description, points, kind, verify, link, sort, active) values ('comment_post', 'Comment on this tweet', 'Drop a comment on our \"Notties Raid is live\" tweet on X.', 150, 'once', 'link', $1, 4, true)
         on conflict (id) do update set title = excluded.title, description = excluded.description, link = excluded.link, active = true`,
        ["https://x.com/thenottiesworld/status/2122676459995087292"],
      );
    }
  }
  // 20k $NOTTIES giveaway (2026-11-23): like / retweet / quote, 300 each, 24h timer, letter to everyone.
  // Has its own one-time flag instead of an ECONOMY_VERSION bump, so admin economy edits are kept.
  // The giveaway post link isn't out yet, so the missions point at the X profile for now.
  const giveaway = (await q.query("select 1 from settings where key = 'giveaway_missions_v1'")).rows.length > 0;
  if (!giveaway) {
    const profile = "https://x.com/thenottiesworld";
    const quoteText = "Entering the 20k $NOTTIES giveaway 🟢 Completing missions on nottiesraid.fun with @thenottiesworld";
    const add = [
      ["like_giveaway", "Like the giveaway post", "Like our \"20k $NOTTIES GIVEAWAY\" post on X.", profile],
      ["rt_giveaway", "Retweet the giveaway post", "Retweet our \"20k $NOTTIES GIVEAWAY\" post on X.", profile],
      ["quote_giveaway", "Quote the giveaway post", "Quote our \"20k $NOTTIES GIVEAWAY\" post with the ready-made line (or your own).", `https://x.com/intent/post?text=${encodeURIComponent(quoteText)}`],
    ];
    for (const [id, title, description, link] of add) {
      await q.query(
        "insert into tasks (id, title, description, points, kind, verify, link, sort, active, starts_at, ends_at) values ($1,$2,$3,300,'once','link',$4,4,true, now(), now() + interval '24 hours') on conflict (id) do nothing",
        [id, title, description, link],
      );
    }
    await q.query(
      `insert into mail (user_id, kind, title, body, claimed_at, idem_key)
       select id, 'system', '20k $NOTTIES giveaway missions are live', 'Like, retweet and quote our giveaway post. 300 $NOTTIES each, and 24 hours to grab them.', now(), 'bc:giveaway1:' || id
         from users where status = 'active' on conflict (idem_key) do nothing`,
    );
    await q.query("insert into settings (key, value) values ('giveaway_missions_v1', 'true'::jsonb) on conflict (key) do nothing");
  }
  // The giveaway post is out: point the missions at it (timers untouched) and send everyone a second letter.
  const giveaway2 = (await q.query("select 1 from settings where key = 'giveaway_missions_v2'")).rows.length > 0;
  if (!giveaway2) {
    const post = "https://x.com/thenottiesworld/status/2124871892448469289";
    const quoteText = "Entering the 20k $NOTTIES giveaway 🟢 Completing missions on nottiesraid.fun with @thenottiesworld";
    await q.query("update tasks set link = $1 where id in ('like_giveaway', 'rt_giveaway')", [post]);
    await q.query("update tasks set link = $1 where id = 'quote_giveaway'", [
      `https://x.com/intent/post?text=${encodeURIComponent(quoteText)}&url=${encodeURIComponent(post)}`,
    ]);
    await q.query(
      `insert into mail (user_id, kind, title, body, claimed_at, idem_key)
       select id, 'system', 'The 20k $NOTTIES giveaway post is live: missions updated', 'Like, retweet and quote the giveaway post. 300 $NOTTIES each. Complete the missions before the timer runs out.', now(), 'bc:giveaway2:' || id
         from users where status = 'active' on conflict (idem_key) do nothing`,
    );
    await q.query("insert into settings (key, value) values ('giveaway_missions_v2', 'true'::jsonb) on conflict (key) do nothing");
  }
  // Giveaway comment mission: 300, closes at the same time as the other giveaway missions. Letter to everyone.
  const giveaway3 = (await q.query("select 1 from settings where key = 'giveaway_missions_v3'")).rows.length > 0;
  if (!giveaway3) {
    await q.query(
      `insert into tasks (id, title, description, points, kind, verify, link, sort, active, starts_at, ends_at)
       select 'comment_giveaway', 'Comment on the giveaway post', 'Drop a comment on our "20k $NOTTIES GIVEAWAY" post on X.', 300, 'once', 'link', $1, 4, true,
              now(), coalesce((select ends_at from tasks where id = 'like_giveaway'), now() + interval '24 hours')
       on conflict (id) do nothing`,
      ["https://x.com/thenottiesworld/status/2124871892448469289"],
    );
    await q.query(
      `insert into mail (user_id, kind, title, body, claimed_at, idem_key)
       select id, 'system', 'New giveaway mission: comment on the post', 'Drop a comment on the 20k $NOTTIES giveaway post for another 300 $NOTTIES. It closes with the other giveaway missions, so be quick.', now(), 'bc:giveaway3:' || id
         from users where status = 'active' on conflict (idem_key) do nothing`,
    );
    await q.query("insert into settings (key, value) values ('giveaway_missions_v3', 'true'::jsonb) on conflict (key) do nothing");
  }
  for (const t of TASKS) {
    await q.query(
      `insert into tasks (id, title, description, points, kind, verify, link, sort)
       values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (id) do nothing`,
      [t.id, t.title, t.description, t.points, t.kind, t.verify, t.link, t.sort],
    );
  }
}
