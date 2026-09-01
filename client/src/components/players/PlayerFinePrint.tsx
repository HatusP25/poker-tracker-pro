import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatMoney, formatPercent } from '@/lib/viz/money';
import type { PlayerStats, RebuySummary } from '@/types';

/**
 * The numbers that used to be the page.
 *
 * ROI, cash-out rate, average buy-in and rebuy rate had four of the eight
 * identical KPI cards at the top of the old player page — "Cash-Out Rate 134% ·
 * Capital efficiency" on a friend's poker card. They are bankroll-management
 * metrics for a game where the buy-in is five dollars and the prize is being
 * allowed to talk about it until next Friday (D-002).
 *
 * They are demoted rather than deleted: the API still returns them and the CSV
 * export still writes them, so anyone who wants them can open this. The rebuy
 * figure is also fixed on the way past — the server returns rebuys *per night*
 * and the old tile printed it as a percentage, so "1.2 rebuys a night" rendered
 * as "Rebuy Rate 118%".
 */

interface PlayerFinePrintProps {
  stats: PlayerStats;
  rebuys: RebuySummary | null;
  currency?: string | null;
}

const Row = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <div className="min-w-0">
    <dt className="eyebrow">{label}</dt>
    <dd className="mt-1 font-display text-label font-bold tnum text-foreground">{value}</dd>
    {note && <p className="mt-0.5 text-caption text-muted-foreground">{note}</p>}
  </div>
);

const PlayerFinePrint = ({ stats, rebuys, currency }: PlayerFinePrintProps) => {
  const money = (value: number) => formatMoney(value, { currency, decimals: 2 });
  const perNight = stats.rebuyRate / 100;

  return (
    <Card className="overflow-hidden">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 transition-colors hover:bg-surface-2/50">
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold tracking-tight">The fine print</h3>
            <p className="mt-0.5 text-label-sm text-muted-foreground">
              Buy-ins, cash-outs and the ratios between them. Kept for the export, not for the
              bragging.
            </p>
          </div>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          />
        </summary>

        <dl className="grid grid-cols-2 gap-x-5 gap-y-5 border-t border-border p-5 sm:grid-cols-3 lg:grid-cols-4">
          <Row label="Total buy-in" value={money(stats.totalBuyIn)} note="Everything ever staked" />
          <Row label="Total cash-out" value={money(stats.totalCashOut)} note="Everything ever taken home" />
          <Row
            label="Avg buy-in"
            value={money(stats.avgBuyIn)}
            note="Per night, rebuys included"
          />
          <Row
            label="Avg result"
            value={formatMoney(stats.avgProfit, { currency, signed: true, decimals: 2 })}
            note="Per night"
          />
          <Row label="Win rate" value={formatPercent(stats.winRate / 100, { decimals: 1 })} note="Nights finished up" />
          <Row
            label="Recent form"
            value={formatPercent(stats.recentFormWinRate / 100, { decimals: 0 })}
            note="Last five nights"
          />
          <Row label="ROI" value={formatPercent(stats.roi / 100, { decimals: 1 })} note="Return on everything staked" />
          <Row
            label="Cash-out rate"
            value={formatPercent(stats.cashOutRate / 100, { decimals: 0 })}
            note="Cash-out over buy-in"
          />
          <Row
            label="Rebuys"
            value={`${perNight.toFixed(1)} a night`}
            note={`${stats.totalRebuys.toFixed(0)} in total`}
          />
          {rebuys && (
            <Row
              label="Rebuy money"
              value={money(rebuys.totalAmount)}
              note={`${rebuys.count} rebuys, ${money(rebuys.avgPerNight)} a night`}
            />
          )}
          {rebuys?.biggestNight && (
            <Row
              label="Biggest rebuy night"
              value={money(rebuys.biggestNight.amount)}
              note={`${rebuys.biggestNight.count} in one sitting`}
            />
          )}
          <Row
            label="Longest streaks"
            value={`${stats.longestWinStreak} up · ${stats.longestLossStreak} down`}
            note="Best and worst runs"
          />
        </dl>
      </details>
    </Card>
  );
};

export default PlayerFinePrint;
