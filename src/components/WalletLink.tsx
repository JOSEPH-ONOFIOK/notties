"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { TbCheck } from "react-icons/tb";
import { api, short } from "@/lib/client";

type W = { address: string; is_primary: boolean; verified_at: string };

export function WalletLink({ wallets, suspended }: { wallets: W[]; suspended: boolean }) {
  const router = useRouter();
  const { address, isConnected, connector } = useAccount();
  const { connectors, connectAsync, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const linked = wallets.some((w) => w.address.toLowerCase() === address?.toLowerCase());

  async function link() {
    if (!address) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { message } = await api<{ message: string }>("/api/wallet", { action: "nonce", address });
      const signature = await signMessageAsync({ message });
      await api("/api/wallet", { action: "link", address, signature });
      setOk(`Linked ${short(address)}. That's your mint wallet.`);
      router.refresh();
    } catch (e) {
      const m = e instanceof Error ? e.message : "Linking failed";
      setError(/rejected|denied/i.test(m) ? "Signature rejected in the wallet." : m);
    } finally {
      setBusy(false);
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
      <div className="card p-6">
        <div className="display text-2xl">Link a wallet</div>
        <p className="mt-1 text-sm text-muted">Connect, then sign a message. No transaction, no gas. The signature proves you control the wallet; the server stores only the address.</p>

        {!isConnected ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {connectors.length === 0 && <p className="text-sm text-warn">No wallet detected. Install MetaMask or Rabby, or open this page inside your wallet app&apos;s browser.</p>}
            {connectors.map((c) => (
              <button key={c.uid} onClick={() => connectAsync({ connector: c }).catch((e) => setError(e.message))} disabled={connecting} className="btn btn-ghost">
                {c.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.icon} alt="" width={18} height={18} />
                )}
                {c.name}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-border bg-raised/50 p-4">
            <div className="text-xs uppercase tracking-widest text-muted">Connected via {connector?.name}</div>
            <div className="mt-1 break-all font-mono text-sm">{address}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {linked ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-black bg-accent px-3 py-1.5 text-sm font-bold text-black">
                  <TbCheck size={16} strokeWidth={3} /> Already linked
                </span>
              ) : (
                <button onClick={link} disabled={busy || suspended} className="btn btn-accent">
                  {busy ? "Waiting for signature…" : "Sign & link this wallet"}
                </button>
              )}
              <button onClick={() => disconnect()} className="btn btn-ghost">
                Disconnect
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="mt-3 text-sm text-error" role="alert">
            {error}
          </div>
        )}
        {ok && <div className="mt-3 text-sm text-accent">{ok}</div>}
      </div>

      <aside className="card p-6">
        <div className="display text-2xl">Your wallets</div>
        {wallets.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None linked yet. Your Nottie needs somewhere to live.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {wallets.map((w) => (
              <li key={w.address} className={`rounded-xl border p-3 text-sm ${w.is_primary ? "border-accent/50" : "border-border"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono">{short(w.address)}</span>
                  {w.is_primary ? (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Mint wallet</span>
                  ) : (
                    <button onClick={() => makePrimary(w.address)} disabled={busy} className="text-xs text-muted underline hover:text-accent">
                      make primary
                    </button>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted" suppressHydrationWarning>
                  verified {new Date(w.verified_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted">The primary wallet is the one exported to the allowlist snapshot. A wallet can only belong to one player.</p>
      </aside>
    </div>
  );
}
