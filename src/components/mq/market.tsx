import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { pctLabel, priceLabel, type Quote } from "@/lib/mq/market";
import { cn } from "@/lib/utils";

export function Sparkline({ quote, height = 44 }: { quote: Quote; height?: number }) {
  const up = quote.changePct >= 0;
  const color = up ? "var(--gain)" : "var(--alert)";
  const id = `spark-${quote.symbol}`;
  return (
    <div style={{ height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={quote.points} margin={{ top: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area
            type="monotone"
            dataKey="p"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${id})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChangeChip({ pct, className }: { pct: number; className?: string }) {
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "mq-num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        up ? "bg-gain-soft text-gain" : "bg-alert-soft text-alert",
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {pctLabel(pct)}
    </span>
  );
}

export function QuoteCard({
  quote,
  selected,
  onSelect,
}: {
  quote: Quote;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "mq-card mq-glow w-full p-4 text-left transition-colors",
        selected ? "border-info ring-2 ring-info" : "hover:border-info/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mq-num text-sm font-bold tracking-wide">{quote.symbol}</p>
          <p className="truncate text-xs text-muted-foreground">{quote.name}</p>
        </div>
        <ChangeChip pct={quote.changePct} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="mq-num text-xl font-bold" aria-live="off">
          {priceLabel(quote.price)}
        </p>
        <div className="w-28">
          <Sparkline quote={quote} />
        </div>
      </div>
      <p className="sr-only">
        {quote.name} price {priceLabel(quote.price)}, {pctLabel(quote.changePct)} this session.
      </p>
    </button>
  );
}

export function TickerTape({ quotes }: { quotes: Quote[] }) {
  const row = [...quotes, ...quotes];
  return (
    <div className="mq-tape border-b border-border bg-surface/70">
      <div className="mq-tape-track flex w-max items-center gap-6 py-2">
        {row.map((q, i) => (
          <span key={`${q.symbol}-${i}`} className="flex items-center gap-2 px-1 text-xs whitespace-nowrap">
            <span className="mq-num font-bold">{q.symbol}</span>
            <span className="mq-num text-muted-foreground">{priceLabel(q.price)}</span>
            <span className={cn("mq-num font-semibold", q.changePct >= 0 ? "text-gain" : "text-alert")}>
              {q.changePct >= 0 ? "↑" : "↓"} {pctLabel(q.changePct)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
