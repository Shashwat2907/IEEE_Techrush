import { motion } from 'framer-motion';
import { useCompare } from '../../context/CompareContext';
import { ScaleIcon, CloseIcon } from '../../components/ui/Icons';

export default function CompareDrawer({ isOpen, onClose }) {
  const { compareList, removeFromCompare, clearCompare } = useCompare();

  if (!isOpen || compareList.length === 0) return null;

  const fields = [
    { key: 'budgetTier', label: 'Budget', format: (v) => v?.charAt(0).toUpperCase() + v?.slice(1) },
    { key: 'crowdLevel', label: 'Crowd', format: (v) => v?.charAt(0).toUpperCase() + v?.slice(1) },
    { key: 'bestTimeToVisit', label: 'Best Time', format: (v) => v || '—' },
    { key: 'activities', label: 'Activities', format: (v) => `${v?.length || 0} available` },
  ];

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="absolute bottom-0 inset-x-0 z-[1004] bg-surface/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl shadow-2xl max-h-[60vh] overflow-y-auto"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <ScaleIcon className="w-5 h-5 text-accent-sky" />
            <h3 className="font-display text-lg font-bold text-white tracking-wide">Compare Destinations</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearCompare}
              className="text-xs font-mono text-accent-rose hover:text-accent-rose/80 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compare table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-xs font-mono text-text-secondary uppercase py-3 pr-4 w-28">Attribute</th>
                {compareList.map((dest) => (
                  <th key={dest.id} className="text-left py-3 px-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-white text-sm">{dest.name}</span>
                      <button
                        onClick={() => removeFromCompare(dest.id)}
                        className="text-text-secondary/40 hover:text-accent-rose ml-2 transition-colors"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {fields.map((field) => (
                <tr key={field.key}>
                  <td className="text-xs font-mono text-text-secondary py-3 pr-4">{field.label}</td>
                  {compareList.map((dest) => (
                    <td key={dest.id} className="text-white font-body py-3 px-3 capitalize">
                      {field.format(dest[field.key])}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Types */}
              <tr>
                <td className="text-xs font-mono text-text-secondary py-3 pr-4">Categories</td>
                {compareList.map((dest) => (
                  <td key={dest.id} className="py-3 px-3">
                    <div className="flex flex-wrap gap-1.5">
                      {dest.type?.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] bg-accent-sky/10 border border-accent-sky/20 text-accent-sky px-2.5 py-0.5 rounded-full font-mono uppercase"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
