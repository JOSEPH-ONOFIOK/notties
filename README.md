# The Notties — The Lab

Pre-mint progression game for [The Notties](https://thenotties.xyz), live at [nottiesraid.fun](https://nottiesraid.fun). Instead of a whitelist form, players sign in with X, crack a Portal Crate every 2 hours, collect eight fragment types, trade spares, and assemble a Nottie in the Forge. Assembling books one guaranteed (Phase 1) mint spot per account.

**Loop:** Hunt → Collect → Trade → Assemble → One of Us → Mint

## Run it

```bash
npm install
cp .env.example .env.local   # fill in X keys when you have them
npm run dev
```

**Guest mode:** while `X_CLIENT_ID` is unset, every "Sign in" button goes to `/enter`, where players pick a name (use their X handle) and play straight away, in production as well as locally. It switches off by itself once X keys are set; force it with `GUEST_MODE=on|off`. Guest names aren't verified, so don't build the real allowlist from guest accounts.

No database setup needed locally: an embedded Postgres (PGlite) lives in `.data/`. Shortcut: `http://localhost:3000/api/dev/login?u=robin` signs straight in. Open a second browser profile with `?u=hood` to test trading. `/api/dev/grant?all=1` (dev builds only) hands the signed-in player a full recipe.

## Deploy (Vercel + Neon)

1. Create a Neon (or any Postgres) database, set `DATABASE_URL`.
2. Create an X developer app with OAuth 2.0 (Web App), add `https://<domain>/api/x/callback` as a callback, set `X_CLIENT_ID` / `X_CLIENT_SECRET`.
3. Set `SESSION_SECRET`, `ADMIN_X_USERNAMES` (or `ADMIN_KEY`), `NEXT_PUBLIC_SITE_URL`.
4. Deploy. Tables and default settings/tasks are created on first request.

## Systems

| Area | Where | Notes |
| --- | --- | --- |
| Hunt | `/hunt` · `src/lib/game/hunt.ts` | Server-rolled drops (CSPRNG, weighted), server cooldown, idempotency key per attempt |
| Forge | `/forge` · `game/forge.ts` | One transaction: lock inventory → consume recipe → forge record → GTD eligibility → points |
| Trade | `/trade` · `game/trade.ts` | Direct transfers by X username or player code; atomic; both sides logged; burst flag at 30/hr |
| Tasks | `/tasks` · `game/tasks.ts` | once/daily; verify = auto, link (must open first, 8s min), wallet, trade |
| Pawn Shop | `/inventory` · `game/pawn.ts` | Sell spares for TROUBLE; always keep ≥1 of each |
| Referrals | `/referrals` · `game/referrals.ts` | `/?ref=CODE`; pays after the recruit opens N crates (default 3) |
| Wallet | `/wallet` · `game/wallet.ts` | Injected wallets via wagmi; signed nonce message verified with viem; one wallet → one player |
| Leaderboard | `/leaderboard` | Active accounts only |
| Admin | `/admin` | Kill switches, cooldown, drop weights, prices, recipe, points, tasks, player inspection, suspend/restore, review queue, GTD CSV export, audit log |

| Events | `/admin/events` · `game/events.ts` | Weekly rules (Shard Storm weekends, Double Trouble hour) + one-offs. Evaluated on the server's UTC clock: odds/rewards flip for everyone at the same instant; clients sync their clock to the server |
| Streaks | roll call · `game/tasks.ts` | Consecutive UTC days; reward ladder in settings |
| Lucky meter | `game/hunt.ts` | After N crates without Rare+, the next is Rare or better |
| Bonus crates | `/hunt` · `game/hunt.ts` | Spend TROUBLE; daily cap; doesn't touch the timer |
| Swap board | `/trade` · `game/offers.ts` | Two-sided offers with escrow; atomic fill; cancel returns escrow; pair-farming flag |
| Gangs & badges | `game/social.ts` | One-time faction pick, gang leaderboard; badges derived from activity |
| Live feed | `game/feed.ts`, `/api/feed` | Rare+ pulls, assemblies, swaps, streaks; polled every 10s |
| Share cards | `/api/og/[kind]/[id]`, `/s/[kind]/[id]` | PNG cards (pull, Nottie, wanted poster) with the sharer's referral link |
| Snapshots | `/admin/mint` · `game/admin.ts` | Extra allowlist (partners/communities), freeze → one Merkle root per phase (OpenZeppelin leaf format, same as Hopheads); `/api/proof?address=` |
| Admin roles | `/admin/team` | owner / moderator / viewer; only verified X sign-ins count (guest names never) |

Points are called **TROUBLE**. All balances, inventories and eligibility are decided server-side; the browser only displays results.

### Anti-abuse

- Rate limits live in Postgres (`rate_limits`), so they hold across serverless instances.
- Cloudflare Turnstile on guest sign-in, crate claims and bonus crates when the keys are set.
- Every mutating request runs in a DB transaction with `SELECT … FOR UPDATE` on the player row.
- Idempotency keys on crate claims, trades, forges and pawn sales: a retried request replays the original result instead of paying twice.
- Risk events (`early_claim`, `trade_burst`, `duplicate_forge`, `fast_task`, `wallet_reuse`, `new_x_account`) land in `/admin/risk`. They are signals; a human suspends.
- Suspending a player pauses claims/trades/forge/tasks and revokes GTD until restored. Suspended players are excluded from the leaderboard and the eligibility export.

### Snapshot procedure

1. Overview → turn **Forge** off.
2. Mint → download the CSV (`wallet, phase, allocation, source, x_username`).
3. Build the Merkle tree from that CSV; anyone suspended after export must be removed first.

## Assets

`public/brand`, `public/characters`, `public/notties` mirror the live site's public art. Unreleased artwork and clips are deliberately not on the site (they're being posted on X first).

`/wiki` is the public Field Guide (numbers pulled live from settings). New players see a 5-panel intro the first time they enter; replay it from the menu or with `/dashboard?intro=1`.
