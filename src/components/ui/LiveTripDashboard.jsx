import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useItinerary } from '../../context/ItineraryContext';
import { useCurrency } from '../../context/CurrencyContext';
import { ClockIcon, CalendarIcon, CompassIcon } from './Icons';

export default function LiveTripDashboard({ onOpenPlanner }) {
  const { days, destination } = useItinerary();
  const { formatPrice } = useCurrency();
  const today = new Date().toISOString().split('T')[0];
  const activeDay = useMemo(() => days.find((day) => day.dateStr === today) || days[0], [days, today]);
  const next = activeDay?.activities?.find((item) => (item.startHour || 9) >= new Date().getHours()) || activeDay?.activities?.[0];

  return (
    <motion.main initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-0 z-[70] p-4 sm:p-6 bg-[#080A0E]/88 backdrop-blur-xl text-white overflow-y-auto">
      <div className="max-w-lg mx-auto space-y-4 pb-8">
        <header className="pt-4 flex items-center justify-between">
          <div><p className="text-[10px] uppercase tracking-[0.22em] text-emerald-400 font-bold">Live Mode · on trip</p><h1 className="text-2xl font-black mt-1">{destination?.name || 'Your trip'}</h1></div>
          <button type="button" onClick={onOpenPlanner} className="rounded-full px-3 py-2 text-xs font-bold bg-white/10 border border-white/15">Planner</button>
        </header>
        <section className="rounded-3xl p-5 border border-emerald-400/30 bg-emerald-500/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Up next</p>
          <h2 className="text-xl font-bold mt-2">{next?.name || 'Enjoy the moment — nothing scheduled.'}</h2>
          {next && <p className="mt-2 text-sm text-zinc-300 flex gap-2 items-center"><ClockIcon className="w-4 h-4" />{next.startHour || 9}:00 · {next.durationHrs || 2}h · {formatPrice(next.cost || 0)}</p>}
        </section>
        <section className="rounded-3xl p-4 bg-white/8 border border-white/10">
          <div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-emerald-400" /><p className="font-bold text-sm">{activeDay?.label || 'Today'} schedule</p></div>
          <div className="mt-3 space-y-2">
            {(activeDay?.activities || []).map((item) => <div key={item.uid} className="flex items-center gap-3 rounded-2xl bg-black/20 p-3"><CompassIcon className="w-4 h-4 text-emerald-400 shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{item.name}</p><p className="text-[11px] text-zinc-400">{item.startHour || 9}:00 · {item.durationHrs || 2}h</p></div></div>)}
            {!activeDay?.activities?.length && <p className="text-xs text-zinc-400 py-4 text-center">Your day is clear. Add a stop from the planner when ready.</p>}
          </div>
        </section>
      </div>
    </motion.main>
  );
}
