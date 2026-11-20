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
    title: "Like the launch post",
    description: "Like our pinned \"Notties Raid is live\" post on X. Final step before your wallet.",
    points: 100,
    kind: "once",
    verify: "link",
    link: "https://x.com/thenottiesworld",
    sort: 4,
  },
  {
    id: "rt_post",
    title: "Retweet the launch post",
    description: "Repost our pinned \"Notties Raid is live\" post on X. Final step before your wallet.",
    points: 100,
    kind: "once",
    verify: "link",
    link: "https://x.com/thenottiesworld",
    sort: 4,
  },
  {
    id: "comment_post",
    title: "Comment on the launch post",
    description: "Drop a comment on our pinned \"Notties Raid is live\" post. Final step before your wallet.",
    points: 100,
    kind: "once",
    verify: "link",
    link: "https://x.com/thenottiesworld",
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
const ECONOMY_VERSION = 5;
const ECONOMY_KEYS = ["drop_weights", "points", "streak_bonus", "crate_price", "crate_buys_per_day", "crate_buy_cooldown_minutes", "timer_crates", "referral_crates", "market_prices", "wallet_tasks"] as const;

export async function SEED(q: Q) {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await q.query(`insert into settings (key, value) values ($1, $2::jsonb) on conflict (key) do nothing`, [key, JSON.stringify(value)]);
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
  }
  for (const t of TASKS) {
    await q.query(
      `insert into tasks (id, title, description, points, kind, verify, link, sort)
       values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (id) do nothing`,
      [t.id, t.title, t.description, t.points, t.kind, t.verify, t.link, t.sort],
    );
  }
}
