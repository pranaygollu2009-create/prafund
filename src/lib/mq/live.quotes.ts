/**
 * Client access to the live market feed (Supabase Edge Function proxying
 * Yahoo Finance). Used by the /markets page; the sim/trading pages use
 * lib/mq/market.ts, which shares the same feed.
 */

export type LiveQuote = {
  symbol: string;
  name?: string;
  type?: string;
  exchange?: string;
  price: number;
  change?: number;
  changePct?: number;
  open?: number;
  prevClose?: number;
  dayHigh?: number;
  dayLow?: number;
  high52?: number;
  low52?: number;
  volume?: number;
  avgVolume?: number;
  marketCap?: number;
  pe?: number;
  forwardPe?: number;
  eps?: number;
  divYield?: number;
  priceToBook?: number;
  earningsDate?: number;
  marketState?: string;
  currency?: string;
  time?: number;
};

export type ChartSeries = { points: { t: number; p: number }[]; prevClose: number | null };

const URL_ = (import.meta as unknown as { env: Record<string, string | undefined> }).env[
  "VITE_MARKET_QUOTES_URL"
];

function base(): string {
  if (!URL_) throw new Error("Live market feed is not configured (VITE_MARKET_QUOTES_URL).");
  return URL_;
}

export async function fetchLiveQuotes(symbols: string[]): Promise<LiveQuote[]> {
  const res = await fetch(`${base()}?batch=${encodeURIComponent(symbols.join(","))}`);
  if (!res.ok) throw new Error(`Market feed returned ${res.status}`);
  const data = (await res.json()) as { quotes?: LiveQuote[] };
  if (!data?.quotes) throw new Error("Market feed returned no quotes.");
  return data.quotes;
}

export async function fetchLiveChart(symbol: string, range: string): Promise<ChartSeries> {
  const res = await fetch(
    `${base()}?chart=1&symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`,
  );
  if (!res.ok) throw new Error(`Chart feed returned ${res.status}`);
  return (await res.json()) as ChartSeries;
}
