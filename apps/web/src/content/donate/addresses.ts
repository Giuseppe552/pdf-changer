export type DonateAddress = {
  network: "Bitcoin" | "Ethereum" | "Monero";
  symbol: "BTC" | "ETH" | "XMR";
  address: string;
  note?: string;
};

export const donateAddresses: DonateAddress[] = [
  {
    network: "Bitcoin",
    symbol: "BTC",
    address: "bc1qpdfchangerexample8h4x4n7qk0r6xw2f6f0p7m3q9a",
    note: "Use native SegWit where possible.",
  },
  {
    network: "Ethereum",
    symbol: "ETH",
    address: "0x7E57f6BfA3f8e7864A6f5F0469C88b3d4A58cB2E",
    note: "Verify checksum and network before sending.",
  },
  {
    network: "Monero",
    symbol: "XMR",
    address:
      "89aJ9N9dYcXPPDFChangerExampleYwR9FoJ8jCQ4fVQk3v7eML6zvQxR1VdAayhE2qkGgKV9Yv7QzYt8fYXs5U7nYmxnq6Gr3m",
    note: "Use integrated address/payment ID only if explicitly required.",
  },
];

