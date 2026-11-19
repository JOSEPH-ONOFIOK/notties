"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { TbCheck, TbClipboard, TbShieldCheck } from "react-icons/tb";
import { api, short } from "@/lib/client";
import { useMounted } from "./useMounted";

type W = { address: string; is_primary: boolean; verified_at: string; signed: boolean };

const isAddr = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a.trim());

/**
 * Two ways to give us a mint wallet:
 *  1. Paste the address. Works on any phone, no wallet app needed. This is the main path.
 *  2. Connect a wallet and sign a message (optional, proves ownership). On a phone without a
 *     wallet extension we offer links that reopen this page inside the wallet app's browser.
 */
export function WalletLink({ wallets, suspended }: { wallets: W[]; suspended: boolean }) {
  const router = useRouter();
  const mounted = useMounted();
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const primary = wallets.find((w) => w.is_primary);

  async function save() {
    const a = paste.trim();
    if (!isAddr(a)) return setError("That doesn't look like a wallet address. It should start with 0x and be 42 characters long.");
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await api("/api/wallet", { action: "submit", address: a });
      setOk(`Saved ${short(a)}. That's your mint wallet.`);
      setPaste("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the wallet");
    } finally {
      setBusy(false);
    }
  }

  async function pasteFromClipboard() {
    try {
      setPaste((await navigator.clipboard.readText()).trim());
    } catch {
      setError("Couldn't read the clipboard. Long-press the box and paste instead.");
    }
  }

  async function makePrimary(a: string) {
    setBusy(true);
    try {
      await api("/api/wallet", { action: "primary", address: a });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div className="card p-5 sm:p-6">
          <div className="display text-2xl">{primary ? "Change your mint wallet" : "Add your mint wallet"}</div>
          <p className="mt-1 text-sm text-muted">Paste your wallet address (it starts with 0x). Copy it from MetaMask, Trust Wallet, Rabby or any EVM wallet. No signing and no gas.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <input
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="0x…"
                inputMode="text"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="!pr-12 font-mono text-sm"
                aria-label="Wallet address"
              />
              <button type="button" onClick={pasteFromClipboard} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-raised hover:text-accent" aria-label="Paste from clipboard" title="Paste">
                <TbClipboard size={18} />
              </button>
            </div>
            <button onClick={save} disabled={busy || suspended || !paste.trim()} className="btn btn-accent shrink-0">
              {busy ? "Saving…" : "Save wallet"}
            </button>
          </div>
          {error && (
            <div className="mt-3 text-sm font-bold text-error" role="alert">
              {error}
            </div>
          )}
          {ok && <div className="mt-3 text-sm font-bold text-accent">{ok}</div>}
        </div>

        {mounted && <SignWithWallet wallets={wallets} suspended={suspended} />}
      </div>

      <aside className="card h-fit p-5 sm:p-6">
        <div className="display text-2xl">Your wallets</div>
        {wallets.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None yet. Your Nottie needs somewhere to live.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {wallets.map((w) => (
              <li key={w.address} className={`rounded-xl border-2 p-3 text-sm ${w.is_primary ? "border-accent" : "border-border"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono">{short(w.address)}</span>
                  {w.is_primary ? (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Mint wallet</span>
                  ) : (
                    <button onClick={() => makePrimary(w.address)} disabled={busy} className="text-xs text-muted underline hover:text-accent">
                      use this one
                    </button>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted" suppressHydrationWarning>
                  {w.signed ? (
                    <>
                      <TbShieldCheck size={14} className="text-accent" /> verified with a signature
                    </>
                  ) : (
                    "added by address"
                  )}{" "}
                  · {new Date(w.verified_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted">Your Nottie mints to the mint wallet. A wallet can only belong to one player.</p>
      </aside>
    </div>
  );
}

/** Optional: prove you own the wallet by signing a message. */
function SignWithWallet({ wallets, suspended }: { wallets: W[]; suspended: boolean }) {
  const router = useRouter();
  const { address, isConnected, connector } = useAccount();
  const { connectors, connectAsync, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const hasProvider = typeof window !== "undefined" && "ethereum" in window;
  const verified = wallets.some((w) => w.signed && w.address.toLowerCase() === address?.toLowerCase());

  async function link() {
    if (!address) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { message } = await api<{ message: string }>("/api/wallet", { action: "nonce", address });
      const signature = await signMessageAsync({ message });
      await api("/api/wallet", { action: "link", address, signature });
      setOk(`Verified ${short(address)}. That's your mint wallet.`);
      router.refresh();
    } catch (e) {
      const m = e instanceof Error ? e.message : "Linking failed";
      setError(/rejected|denied/i.test(m) ? "You cancelled the signature in your wallet." : m);
    } finally {
      setBusy(false);
    }
  }

  const here = typeof window !== "undefined" ? window.location.href : "";
  const host = typeof window !== "undefined" ? window.location.host + window.location.pathname : "";
  const deepLinks = [
    { name: "MetaMask", href: `https://metamask.app.link/dapp/${host}` },
    { name: "Trust Wallet", href: `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(here)}` },
    { name: "Coinbase Wallet", href: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(here)}` },
  ];

  return (
    <div className="card p-5 sm:p-6">
      <div className="display text-xl">Or verify with your wallet app</div>
      <p className="mt-1 text-sm text-muted">Optional. Signing a free message proves the wallet is yours. No transaction, no gas.</p>

      {!hasProvider ? (
        <>
          <p className="mt-4 text-sm">No wallet found in this browser. Open this page inside your wallet app:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {deepLinks.map((d) => (
              <a key={d.name} href={d.href} className="btn btn-ghost !min-h-[44px] text-sm">
                {d.name}
              </a>
            ))}
          </div>
        </>
      ) : !isConnected ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {connectors.map((c) => (
            <button key={c.uid} onClick={() => connectAsync({ connector: c }).catch((e) => setError(e instanceof Error ? e.message : "Couldn't connect"))} disabled={connecting} className="btn btn-ghost !min-h-[44px] text-sm">
              {c.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.icon} alt="" width={18} height={18} />
              )}
              {c.name === "Injected" ? "Browser wallet" : c.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border-2 border-border bg-raised/50 p-4">
          <div className="text-xs uppercase tracking-widest text-muted">Connected via {connector?.name}</div>
          <div className="mt-1 break-all font-mono text-sm">{address}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-black bg-accent px-3 py-1.5 text-sm font-bold text-black">
                <TbCheck size={16} strokeWidth={3} /> Verified
              </span>
            ) : (
              <button onClick={link} disabled={busy || suspended} className="btn btn-accent">
                {busy ? "Check your wallet…" : "Sign & verify"}
              </button>
            )}
            <button onClick={() => disconnect()} className="btn btn-ghost">
              Disconnect
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-3 text-sm font-bold text-error" role="alert">
          {error}
        </div>
      )}
      {ok && <div className="mt-3 text-sm font-bold text-accent">{ok}</div>}
    </div>
  );
}
