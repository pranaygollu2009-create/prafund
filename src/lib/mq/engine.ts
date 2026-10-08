import { HOUSING, LIFESTYLE, TRANSPORT } from "./data";

export type GameState = {
  career: string;
  takeHome: number;
  housing: string;
  transport: string;
  lifestyle: string;
  month: number;
  cash: number;
  savings: number;
  investments: number;
  debt: number;
  xp: number;
  history: { month: number; netWorth: number }[];
  lessonsDone: string[];
  achievements: string[];
  plan: { save: number; invest: number; extraDebt: number };
  eventIndex: number;
  lastMonth: null | {
    income: number;
    spent: number;
    saved: number;
    invested: number;
    change: number;
    eventNote: string;
  };
};

const opt = (list: typeof HOUSING, id: string) => list.find((o) => o.id === id) ?? list[0]!;

export function expenses(s: Pick<GameState, "housing" | "transport" | "lifestyle">) {
  const housing = opt(HOUSING, s.housing).cost;
  const transport = opt(TRANSPORT, s.transport).cost;
  const life = opt(LIFESTYLE, s.lifestyle).cost;
  const food = Math.round(life * 0.55);
  const fun = life - food;
  return { housing, transport, food, fun, total: housing + transport + food + fun };
}

export const netWorth = (s: GameState) => s.cash + s.savings + s.investments - s.debt;

export function financialHealth(s: GameState) {
  const e = expenses(s);
  const monthlyLeft = s.takeHome - e.total;
  const savingsRate = monthlyLeft > 0 ? (s.plan.save + s.plan.invest) / s.takeHome : 0;
  const parts = [
    { label: "Savings rate", score: Math.min(30, Math.round(savingsRate * 150)), max: 30 },
    {
      label: "Emergency fund",
      score: Math.min(25, Math.round((s.savings / (e.total * 3)) * 25)),
      max: 25,
    },
    { label: "Debt level", score: Math.max(0, 20 - Math.round(s.debt / 250)), max: 20 },
    {
      label: "Investing started",
      score: s.investments > 0 ? Math.min(15, 5 + Math.round(s.investments / 800)) : 0,
      max: 15,
    },
    { label: "Learning progress", score: Math.min(10, s.lessonsDone.length * 2), max: 10 },
  ];
  const total = parts.reduce((a, p) => a + Math.max(0, p.score), 0);
  return { total: Math.max(0, Math.min(100, total)), parts };
}

export const money = (n: number) =>
  (n < 0 ? "-" : "") +
  "$" +
  Math.abs(Math.round(n)).toLocaleString("en-US");

/** Box-Muller standard normal. */
function randNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const ASSET_STATS = {
  stocks: { name: "Broad-market stock fund", mean: 0.07, vol: 0.16 },
  bonds: { name: "Bond fund", mean: 0.03, vol: 0.06 },
  cash: { name: "Cash / savings", mean: 0.02, vol: 0.01 },
};

export type Allocation = { stocks: number; bonds: number; cash: number };

export function blended(a: Allocation) {
  const w = { stocks: a.stocks / 100, bonds: a.bonds / 100, cash: a.cash / 100 };
  const mean =
    w.stocks * ASSET_STATS.stocks.mean + w.bonds * ASSET_STATS.bonds.mean + w.cash * ASSET_STATS.cash.mean;
  // assumes low correlation between the three sleeves
  const vol = Math.sqrt(
    (w.stocks * ASSET_STATS.stocks.vol) ** 2 +
      (w.bonds * ASSET_STATS.bonds.vol) ** 2 +
      (w.cash * ASSET_STATS.cash.vol) ** 2,
  );
  return { mean, vol };
}

export type SimInput = {
  initial: number;
  monthly: number;
  years: number;
  allocation: Allocation;
  runs?: number;
};

export type SimResult = {
  runs: number;
  contributions: number;
  p10: number;
  median: number;
  p90: number;
  values: number[];
  buckets: { label: string; count: number; from: number }[];
  mean: number;
  vol: number;
  path: { year: number; low: number; median: number; high: number }[];
};

export function monteCarlo(input: SimInput): SimResult {
  const runs = input.runs ?? 10000;
  const { mean, vol } = blended(input.allocation);
  const months = input.years * 12;
  const mMean = mean / 12;
  const mVol = vol / Math.sqrt(12);
  const finals: number[] = new Array(runs);
  const yearly: number[][] = Array.from({ length: input.years + 1 }, () => []);

  for (let r = 0; r < runs; r++) {
    let v = input.initial;
    yearly[0]!.push(v);
    for (let m = 1; m <= months; m++) {
      v = v * (1 + mMean + mVol * randNormal()) + input.monthly;
      if (v < 0) v = 0;
      if (m % 12 === 0) yearly[m / 12]!.push(v);
    }
    finals[r] = v;
  }
  const sorted = [...finals].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;

  const min = q(0.02);
  const max = q(0.98);
  const step = (max - min) / 18 || 1;
  const buckets = Array.from({ length: 18 }, (_, i) => ({
    label: money(min + i * step),
    from: min + i * step,
    count: 0,
  }));
  for (const v of finals) {
    const i = Math.min(17, Math.max(0, Math.floor((v - min) / step)));
    buckets[i]!.count++;
  }

  const path = yearly.map((vals, year) => {
    const s = [...vals].sort((a, b) => a - b);
    const pick = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
    return { year, low: pick(0.1), median: pick(0.5), high: pick(0.9) };
  });

  return {
    runs,
    contributions: input.initial + input.monthly * months,
    p10: q(0.1),
    median: q(0.5),
    p90: q(0.9),
    values: sorted,
    buckets,
    mean,
    vol,
    path,
  };
}

export const chanceAbove = (values: number[], target: number) =>
  Math.round((values.filter((v) => v >= target).length / values.length) * 100);
