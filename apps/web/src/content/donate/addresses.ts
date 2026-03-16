export type DonateAddress = {
  network: string;
  symbol: string;
  address: string;
  note?: string;
  /** URI scheme for QR code generation (e.g. "monero:", "bitcoin:") */
  uriScheme: string;
};

/**
 * Donation addresses — ordered by audience relevance (privacy-first).
 *
 * TODO: Replace placeholder addresses with real ones before launch.
 * Each address should also be added to the PGP-signed proof bundle
 * at /donate-proof/v1/addresses.txt.
 */
export const donateAddresses: DonateAddress[] = [
  {
    network: "Monero",
    symbol: "XMR",
    address:
      "89aJ9N9dYcXPPDFChangerExampleYwR9FoJ8jCQ4fVQk3v7eML6zvQxR1VdAayhE2qkGgKV9Yv7QzYt8fYXs5U7nYmxnq6Gr3m",
    note: "Preferred. Private by default.",
    uriScheme: "monero:",
  },
  {
    network: "Bitcoin",
    symbol: "BTC",
    address: "bc1qpdfchangerexample8h4x4n7qk0r6xw2f6f0p7m3q9a",
    note: "Native SegWit (bc1q).",
    uriScheme: "bitcoin:",
  },
  {
    network: "Ethereum",
    symbol: "ETH",
    address: "0x7E57f6BfA3f8e7864A6f5F0469C88b3d4A58cB2E",
    note: "ERC-20 tokens accepted on mainnet.",
    uriScheme: "ethereum:",
  },
];

/** Returns true if any address looks like a placeholder */
export function hasPlaceholderAddresses(): boolean {
  return donateAddresses.some(
    (a) => a.address.includes("Example") || a.address.includes("example"),
  );
}
