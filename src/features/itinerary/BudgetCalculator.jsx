import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useItinerary } from '../../context/ItineraryContext';
import { useCurrency } from '../../context/CurrencyContext';
import {
  DollarIcon,
  BedIcon,
  UtensilsIcon,
  CompassIcon,
  CarIcon,
  MoonIcon,
  CloseIcon,
  CalendarIcon,
} from '../../components/ui/Icons';

export default function BudgetCalculator({ isOpen, onClose, onOpenItinerary }) {
  const { isDark } = useTheme();
  const { days, tripDays, destination } = useItinerary();
  const { formatPrice, currency, setCurrency, currencies } = useCurrency();

  const [targetBudget, setTargetBudget] = useState(2500);

  // Total and category calculation
  const { breakdown, totalCommitted, perDay, maxDaySpend } = useMemo(() => {
    let stay = 0;
    let food = 0;
    let activity = 0;
    let transport = 0;
    let rest = 0;

    const dayList = days || [];
    const dayTotals = dayList.map((day, idx) => {
      let daySum = 0;
      (day.activities || []).forEach((act) => {
        const cost = parseFloat(act.cost) || 0;
        daySum += cost;
        switch (act.type) {
          case 'stay':
            stay += cost;
            break;
          case 'food':
            food += cost;
            break;
          case 'activity':
            activity += cost;
            break;
          case 'transport':
            transport += cost;
            break;
          case 'rest':
          default:
            rest += cost;
        }
      });
      return {
        id: day.id,
        label: day.formattedDate || `Day ${day.dayNumber || idx + 1}`,
        total: daySum,
        count: day.activities?.length || 0,
      };
    });

    const total = stay + food + activity + transport + rest;
    const maxDay = Math.max(...dayTotals.map((d) => d.total), 1);

    return {
      breakdown: { stay, food, activity, transport, rest },
      totalCommitted: total,
      perDay: dayTotals,
      maxDaySpend: maxDay,
    };
  }, [days]);

  const remaining = targetBudget - totalCommitted;
  const daysCount = Math.max(1, tripDays || (days ? days.length : 1));
  const dailyAverage = totalCommitted / daysCount;

  if (!isOpen) return null;

  const categories = [
    { key: 'stay', label: 'Accommodation', amount: breakdown.stay, color: '#F59E0B', icon: <BedIcon className="w-3.5 h-3.5" /> },
    { key: 'food', label: 'Dining & Cuisine', amount: breakdown.food, color: '#10B981', icon: <UtensilsIcon className="w-3.5 h-3.5" /> },
    { key: 'activity', label: 'Attractions & Sights', amount: breakdown.activity, color: '#38BDF8', icon: <CompassIcon className="w-3.5 h-3.5" /> },
    { key: 'transport', label: 'Transit & Logistics', amount: breakdown.transport, color: '#94A3B8', icon: <CarIcon className="w-3.5 h-3.5" /> },
    { key: 'rest', label: 'Leisure & Other', amount: breakdown.rest, color: '#A78BFA', icon: <MoonIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className={`h-full flex flex-col ${isDark ? 'text-white' : 'text-slate-900'} font-sans select-none overflow-hidden`}>
      {/* ─── Top Navigation Header ─── */}
      <div className="p-3.5 sm:p-4 border-b apple-liquid-glass flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <DollarIcon className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white block truncate">
              Budget Ledger
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium truncate block">
              {destination?.name || 'Active Itinerary'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Multi-Currency Dropdown */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={`rounded-full ${
              isDark ? 'bg-[#1A1A22] border-white/15 text-white' : 'bg-white border-black/15 text-slate-900'
            } border text-xs py-1.5 px-3 outline-none cursor-pointer font-semibold shadow-sm`}
          >
            {(currencies || []).map((c) => (
              <option key={c.code} value={c.code} className={isDark ? 'bg-[#131318] text-white' : 'bg-white text-black'}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Main Content Workspace ─── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
        {/* ─── Financial Metric Bento Cards ─── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Target Budget Input Card */}
          <div className="p-3.5 rounded-2xl apple-liquid-glass space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
              Target Budget
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-slate-400">$</span>
              <input
                type="number"
                value={targetBudget}
                onChange={(e) => setTargetBudget(Math.max(0, parseFloat(e.target.value) || 0))}
                className={`w-full text-base font-bold outline-none bg-transparent ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Committed Total Spend Card */}
          <div className="p-3.5 rounded-2xl apple-liquid-glass space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
              Scheduled Spend
            </div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 truncate">
              {formatPrice(totalCommitted)}
            </div>
          </div>

          {/* Daily Run Rate */}
          <div className="p-3.5 rounded-2xl apple-liquid-glass space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
              Daily Run Rate
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white truncate">
              {formatPrice(dailyAverage)}
              <span className="text-[10px] font-medium text-slate-400 ml-1">/ day</span>
            </div>
          </div>

          {/* Remaining Surplus / Deficit */}
          <div
            className={`p-3.5 rounded-2xl border ${
              remaining >= 0
                ? isDark
                  ? 'bg-emerald-500/10 border-emerald-500/25'
                  : 'bg-emerald-50 border-emerald-200 shadow-sm'
                : isDark
                ? 'bg-red-500/10 border-red-500/25'
                : 'bg-red-50 border-red-200 shadow-sm'
            } backdrop-blur-xl space-y-1.5`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">
              {remaining >= 0 ? 'Surplus Left' : 'Over Budget'}
            </div>
            <div
              className={`text-base font-black truncate ${
                remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
              }`}
            >
              {remaining >= 0 ? formatPrice(remaining) : `-${formatPrice(Math.abs(remaining))}`}
            </div>
          </div>
        </div>

        {/* ─── Category Breakdown Section ─── */}
        <div className="p-4 rounded-3xl apple-liquid-glass space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
            Category Allocation
          </h3>

          <div className="space-y-3">
            {categories.map((cat) => {
              const pct = totalCommitted > 0 ? Math.round((cat.amount / totalCommitted) * 100) : 0;
              return (
                <div key={cat.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                      >
                        {cat.icon}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">
                        {cat.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-bold">
                      <span className="text-slate-500 dark:text-zinc-400 text-[11px]">
                        {pct}%
                      </span>
                      <span className="text-slate-900 dark:text-white">
                        {formatPrice(cat.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Day-by-Day Spend Allocation ─── */}
        <div className="p-4 rounded-3xl apple-liquid-glass space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
              Daily Spend Curve
            </h3>
            {onOpenItinerary && (
              <button
                type="button"
                onClick={onOpenItinerary}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CalendarIcon className="w-3 h-3" />
                <span>Adjust in Itinerary</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {perDay.map((d) => {
              const dayPct = maxDaySpend > 0 ? Math.round((d.total / maxDaySpend) * 100) : 0;
              return (
                <div key={d.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-zinc-300">
                      {d.label}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatPrice(d.total)}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${dayPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
