import { motion } from 'framer-motion';
import { useCompare } from '../../context/CompareContext';

export default function CompareDrawer({ isOpen, onClose }) {
  const { compareList, removeFromCompare, clearCompare } = useCompare();

  if (!isOpen || compareList.length === 0) return null;

  const fields = [
    { key: 'budgetTier', label: 'Budget', format: v => v?.charAt(0).toUpperCase() + v?.slice(1) },
    { key: 'crowdLevel', label: 'Crowd', format: v => v?.charAt(0).toUpperCase() + v?.slice(1) },
    { key: 'bestTimeToVisit', label: 'Best Time', format: v => v || '—' },
    { key: 'activities', label: 'Activities', format: v => `${v?.length || 0} available` },
  ];

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="absolute bottom-0 inset-x-0 z-[1004] glass rounded-t-2xl shadow-2xl shadow-black/60
        max-h-[60vh] overflow-y-auto"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-white">Compare Destinations</h3>
          <div className="flex gap-2">
            <button onClick={clearCompare}
              className="text-xs font-mono text-accent-rose hover:text-accent-rose/80 transition-colors">
              Clear
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full
                hover:bg-white/10 text-text-secondary hover:text-white transition-colors">✕</button>
          </div>
        </div>

        {/* Compare table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-mono text-text-secondary uppercase py-2 pr-4 w-24">Field</th>
                {compareList.map(dest => (
                  <th key={dest.id} className="text-left py-2 px-2">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-white">{dest.name}</span>
                      <button onClick={() => removeFromCompare(dest.id)}
                        className="text-text-secondary/30 hover:text-accent-rose text-xs ml-2">✕</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map(field => (
                <tr key={field.key} className="border-b border-white/5">
                  <td className="text-xs font-mono text-text-secondary py-2.5 pr-4">{field.label}</td>
                  {compareList.map(dest => (
                    <td key={dest.id} className="text-white font-body py-2.5 px-2 capitalize">
                      {field.format(dest[field.key])}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Types */}
              <tr className="border-b border-white/5">
                <td className="text-xs font-mono text-text-secondary py-2.5 pr-4">Types</td>
                {compareList.map(dest => (
                  <td key={dest.id} className="py-2.5 px-2">
                    <div className="flex flex-wrap gap-1">
                      {dest.type?.map(t => (
                        <span key={t} className="text-[10px] bg-accent-sky/10 text-accent-sky px-2 py-0.5 rounded-full font-mono">{t}</span>
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
