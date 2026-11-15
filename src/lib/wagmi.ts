import { createConfig, http, injected } from "wagmi";
import { mainnet } from "wagmi/chains";

/**
 * Wallet linking only needs a signature, so any injected wallet (MetaMask, Rabby, Rainbow, Coinbase
 * extension, or a wallet's in-app browser on mobile) works. The chain is irrelevant for signing;
 * mainnet is listed so wagmi has something to key on.
 */
export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  multiInjectedProviderDiscovery: true,
  transports: { [mainnet.id]: http() },
  ssr: true,
});
