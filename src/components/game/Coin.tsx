/** The TROUBLE coin: lime coin, black ink, a Notties goggle eye stamped in the middle. */
export function Coin({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="17" r="13" fill="#000" />
      <circle cx="16" cy="15" r="13" fill="#cdff00" stroke="#000" strokeWidth="2.5" />
      <circle cx="16" cy="15" r="9.5" fill="none" stroke="#7fa000" strokeWidth="1.5" />
      <path d="M16 8.5l5.6 3.25v6.5L16 21.5l-5.6-3.25v-6.5z" fill="#9aa08f" stroke="#000" strokeWidth="1.6" />
      <circle cx="16" cy="15" r="3.6" fill="#f4f7eb" stroke="#000" strokeWidth="1.2" />
      <circle cx="16.8" cy="15.4" r="1.6" fill="#000" />
      <path d="M8 9.5a10 10 0 0 1 5-3.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

export function CoinAmount({ n, size = "md", plus = false }: { n: number; size?: "sm" | "md" | "lg" | "xl"; plus?: boolean }) {
  const s = { sm: ["text-sm", 16], md: ["text-lg", 20], lg: ["text-2xl", 26], xl: ["text-4xl", 36] }[size] as [string, number];
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold ${s[0]}`}>
      <Coin size={s[1]} />
      <span className="display tabular-nums">
        {plus ? "+" : ""}
        {n.toLocaleString()}
      </span>
    </span>
  );
}
