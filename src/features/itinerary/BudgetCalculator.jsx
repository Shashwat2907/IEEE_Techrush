import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useItinerary, getTripBudget, ACTIVITY_TYPES } from '../../context/ItineraryContext';
import { useCurrency } from '../../context/CurrencyContext';
import {
  DollarIcon,
  CloseIcon,
  BedIcon,
  UtensilsIcon,
  CompassIcon,
  CarIcon,
  MoonIcon,
  ChartBarIcon,
} from '../../components/ui/Icons';

export default function BudgetCalculator({ isOpen, onClose, onOpenItinerary }) {
  const { days, tripDays } = useItinerary();
  const { formatPrice, currency, setCurrency, currencies } = useCurrency();

  const { total, breakdown, perDay } = useMemo(() => {
    return getTripBudget(days);
  }, [days]);

  const dailyAverage = useMemo(() => {
    return tripDays > 0 ? total / tripDays : 0;
  }, [total, tripDays]);

  const maxDaySpend = useMemo(() => {
    const max = Math.max(...perDay.map((d) => d.total), 0);
    return max > 0 ? max : 1;
  }, [perDay]);

  const categories = [
    { key: 'stay', label: 'Accommodation', icon: <BedIcon className="w-3.5 h-3.5" />, color: '#F59E0B' },
    { key: 'food', label: 'Food & Dining', icon: <UtensilsIcon className="w-3.5 h-3.5" />, color: '#10B981' },
    { key: 'activity', label: 'Activities', icon: <CompassIcon className="w-3.5 h-3.5" />, color: '#38BDF8' },
    { key: 'transport', label: 'Travel & Transport', icon: <CarIcon className="w-3.5 h-3.5" />, color: '#94A3B8' },
    { key: 'rest', label: 'Other / Leisure', icon: <MoonIcon className="w-3.5 h-3.5" />, color: '#A78BFA' },
  ];

  if (!isOpen) return null;

  return (
    <div className="h-full w-full flex flex-col bg-[#0B101B]/95 backdrop-blur-2xl text-text-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent-emerald/10 flex items-center justify-center text-accent-emerald">
            <DollarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-white tracking-wide">Budget Analytics</h3>
            <p className="text-[11px] font-body text-text-secondary">Smart cost breakdown & day tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Currency Selector */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-white/[0.05] border border-white/[0.08] hover:border-white/20 text-xs font-mono text-white rounded-lg px-2 py-1 outline-none transition-colors cursor-pointer"
            title="Change Currency"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code} className="bg-[#0B101B] text-white">
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Total Cost Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">Estimated Total</span>
            <span className="text-[10px] font-mono text-accent-emerald bg-accent-emerald/10 px-2 py-0.5 rounded-full">
              {tripDays} {tripDays === 1 ? 'Day' : 'Days'} Trip
            </span>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-display font-extrabold text-white tracking-tight">
              {formatPrice(total)}
            </span>
            <span className="text-xs font-mono text-text-secondary">
              avg {formatPrice(dailyAverage)}/day
            </span>
          </div>

          {/* Multi-segment progress bar */}
          {total > 0 && (
            <div className="mt-4 h-2 w-full bg-white/5 rounded-full overflow-hidden flex gap-0.5">
              {categories.map((cat) => {
                const amount = breakdown[cat.key] || 0;
                const pct = (amount / total) * 100;
                if (pct <= 0) return null;
                return (
                  <div
                    key={cat.key}
                    style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    className="h-full rounded-full transition-all duration-500"
                    title={`${cat.label}: ${formatPrice(amount)} (${Math.round(pct)}%)`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div>
          <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider mb-3">
            Spending by Category
          </h4>

          <div className="space-y-2">
            {categories.map((cat) => {
              const amount = breakdown[cat.key] || 0;
              const pct = total > 0 ? (amount / total) * 100 : 0;

              return (
                <div
                  key={cat.key}
                  className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                    >
                      {cat.icon}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white">{cat.label}</div>
                      <div className="text-[10px] font-mono text-text-secondary">
                        {Math.round(pct)}% of budget
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-white">
                      {formatPrice(amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day-by-Day Spending Chart */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-mono text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <ChartBarIcon className="w-3.5 h-3.5 text-accent-sky" />
              Day-by-Day Analysis
            </h4>
            <span className="text-[10px] font-mono text-text-secondary">Daily Load</span>
          </div>

          <div className="space-y-2">
            {perDay.map((d, index) => {
              const pct = (d.total / maxDaySpend) * 100;

              return (
                <div key={d.dayId} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono text-text-secondary font-medium">{d.label}</span>
                    <span className="font-mono font-bold text-white">{formatPrice(d.total)}</span>
                  </div>

                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut', delay: index * 0.05 }}
                      className="h-full bg-gradient-to-r from-accent-sky to-accent-emerald rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button to Itinerary */}
        {onOpenItinerary && (
          <button
            type="button"
            onClick={onOpenItinerary}
            className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-white text-xs font-semibold font-body border border-white/[0.08] transition-all flex items-center justify-center gap-2"
          >
            <span>Modify Activities in Itinerary</span>
          </button>
        )}
      </div>
    </div>
  );
}
