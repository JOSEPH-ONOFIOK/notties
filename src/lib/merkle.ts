import { keccak_256 } from "@noble/hashes/sha3";

/**
 * A Merkle tree over wallet addresses that the contract's OpenZeppelin MerkleProof accepts:
 * leaf = keccak256(keccak256(abi.encode(address))), parents hash their two children in sorted
 * order. Works on raw bytes so ~400k wallets build in a few seconds.
 *
 * Shared by the site (src/lib/mint-lists.ts) and scripts/mint-roots.mjs, so the root the owner
 * sets on-chain always matches the proofs the site hands out. Plain TS so Node can run it as is.
 */

const hex = (b: Uint8Array) => {
  let s = "0x";
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
  return s as `0x${string}`;
};

function leafOf(address: string): Uint8Array {
  // abi.encode(address): 12 zero bytes, then the 20 address bytes.
  const word = new Uint8Array(32);
  const h = address.slice(2);
  for (let i = 0; i < 20; i++) word[12 + i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return keccak_256(keccak_256(word));
}

function compare(a: Uint8Array, b: Uint8Array) {
  for (let i = 0; i < 32; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

const pair = new Uint8Array(64);
function parent(a: Uint8Array, b: Uint8Array) {
  const [lo, hi] = compare(a, b) <= 0 ? [a, b] : [b, a];
  pair.set(lo, 0);
  pair.set(hi, 32);
  return keccak_256(pair);
}

export type AddressTree = {
  root: `0x${string}`;
  size: number;
  /** The proof for an address, or null if it isn't in the tree. */
  proof: (address: string) => `0x${string}`[] | null;
};

export function buildTree(addresses: string[]): AddressTree {
  const unique = [...new Set(addresses.map((a) => a.toLowerCase()))].filter((a) => /^0x[0-9a-f]{40}$/.test(a));
  const leaves = unique.map((a) => ({ a, h: leafOf(a) })).sort((x, y) => compare(x.h, y.h));
  const index = new Map<string, number>();
  leaves.forEach((l, i) => index.set(l.a, i));

  // layers[0] is the leaves; each next layer pairs neighbours, carrying an odd one up as is.
  const layers: Uint8Array[][] = [leaves.map((l) => l.h)];
  while (layers[layers.length - 1].length > 1) {
    const below = layers[layers.length - 1];
    const up: Uint8Array[] = [];
    for (let i = 0; i < below.length; i += 2) up.push(i + 1 < below.length ? parent(below[i], below[i + 1]) : below[i]);
    layers.push(up);
  }
  const top = layers[layers.length - 1][0];

  return {
    root: top ? hex(top) : `0x${"0".repeat(64)}`,
    size: leaves.length,
    proof(address) {
      let i = index.get(address.toLowerCase());
      if (i === undefined) return null;
      const out: `0x${string}`[] = [];
      for (let l = 0; l < layers.length - 1; l++) {
        const sibling = i % 2 ? i - 1 : i + 1;
        if (sibling < layers[l].length) out.push(hex(layers[l][sibling]));
        i = Math.floor(i / 2);
      }
      return out;
    },
  };
}
