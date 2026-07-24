import bs58 from "bs58";

/**
 * The slice of the injected Solana wallet API we use. Phantom, Solflare and
 * Backpack all expose this same shape on `window`.
 */
type SolanaProvider = {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signMessage: (message: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array }>;
};

declare global {
  interface Window {
    solana?: SolanaProvider;
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
    backpack?: SolanaProvider;
  }
}

export const getSolanaProvider = (): SolanaProvider | null =>
  window.phantom?.solana ?? window.solana ?? window.solflare ?? window.backpack ?? null;

/** Connects, signs `getMessage(address)`, and returns base58 for the server. */
export const signWithWallet = async (getMessage: (address: string) => Promise<string>) => {
  const provider = getSolanaProvider();
  if (!provider) {
    throw new Error("No Solana wallet found — install Phantom, Solflare or Backpack");
  }
  const { publicKey } = await provider.connect();
  const address = publicKey.toString();
  const message = await getMessage(address);
  const { signature } = await provider.signMessage(new TextEncoder().encode(message), "utf8");
  return { address, signature: bs58.encode(signature) };
};
