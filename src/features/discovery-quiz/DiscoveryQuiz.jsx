import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { getDestinations } from '../../services/destinations';

const MOODS = [
  { id: 'relax', label: 'Relax', icon: '🧘', types: ['beach', 'nature'] },
  { id: 'adventure', label: 'Adventure', icon: '🏔️', types: ['adventure', 'nature'] },
  { id: 'culture', label: 'Culture', icon: '🏛️', types: ['culture', 'heritage'] },
  { id: 'urban', label: 'City Life', icon: '🌃', types: ['urban', 'culture'] },
];

const BUDGETS = [
  { id: 'budget', label: 'Budget-Friendly', icon: '💚' },
  { id: 'mid', label: 'Mid-Range', icon: '💛' },
  { id: 'premium', label: 'Premium', icon: '💎' },
];

const SEASONS = [
  { id: 'spring', label: 'Spring', icon: '🌸' },
  { id: 'summer', label: 'Summer', icon: '☀️' },
  { id: 'monsoon', label: 'Monsoon', icon: '🌧️' },
  { id: 'autumn', label: 'Autumn', icon: '🍂' },
  { id: 'winter', label: 'Winter', icon: '❄️' },
];

export default function DiscoveryQuiz() {
  const { hideQuiz, flyToDestination } = useApp();
  const [step, setStep] = useState(0);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [selectedSeasons, setSelectedSeasons] = useState([]);

  const results = useMemo(() => {
    if (step < 3) return [];
    const moodTypes = selectedMoods.flatMap(m => MOODS.find(mood => mood.id === m)?.types || []);
    const uniqueTypes = [...new Set(moodTypes)];
    let filtered = getDestinations({
      type: uniqueTypes.length > 0 ? uniqueTypes : undefined,
      budgetTier: selectedBudget,
      season: selectedSeasons.length > 0 ? selectedSeasons : undefined,
    });
    if (filtered.length === 0) filtered = getDestinations({ type: uniqueTypes.length > 0 ? uniqueTypes : undefined });
    if (filtered.length === 0) filtered = getDestinations();
    return filtered.slice(0, 5);
  }, [step, selectedMoods, selectedBudget, selectedSeasons]);

  const toggleMood = (id) => setSelectedMoods(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  const toggleSeason = (id) => setSelectedSeasons(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => Math.max(0, prev - 1));

  const handleSelectResult = useCallback((dest) => {
    hideQuiz();
    setTimeout(() => flyToDestination(dest), 400);
  }, [hideQuiz, flyToDestination]);

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-auto">
      <div className="relative w-full max-w-xl mx-4">
        <button onClick={hideQuiz}
          className="absolute -top-12 right-0 text-text-secondary hover:text-white text-sm font-mono transition-colors">
          ← Back to globe
        </button>

        <motion.div className="glass rounded-card p-8 shadow-2xl shadow-black/60"
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}>

          {/* Progress */}
          <div className="flex gap-1 mb-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                ${i <= step ? 'bg-accent-sky' : 'bg-white/10'}`} />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="mood" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <h2 className="font-display text-2xl text-white mb-2">What's your <span className="text-accent-amber">vibe</span>?</h2>
                <p className="text-text-secondary text-sm mb-6">Pick all that call to you</p>
                <div className="grid grid-cols-2 gap-3">
                  {MOODS.map(mood => (
                    <button key={mood.id} onClick={() => toggleMood(mood.id)}
                      className={`p-4 rounded-card border text-left transition-all duration-200
                        ${selectedMoods.includes(mood.id)
                          ? 'border-accent-sky/50 bg-accent-sky/10 shadow-lg shadow-accent-sky/5'
                          : 'border-white/10 hover:border-accent-sky/30'}`}>
                      <span className="text-2xl">{mood.icon}</span>
                      <div className="mt-2 font-body text-sm font-medium text-white">{mood.label}</div>
                    </button>
                  ))}
                </div>
                <button onClick={nextStep} disabled={selectedMoods.length === 0}
                  className="w-full mt-6 py-3 bg-accent-amber text-bg-base rounded-card font-body font-semibold text-sm
                    disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
                  Continue →
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="budget" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <h2 className="font-display text-2xl text-white mb-2">What's the <span className="text-accent-amber">budget</span>?</h2>
                <p className="text-text-secondary text-sm mb-6">This helps narrow things down</p>
                <div className="space-y-3">
                  {BUDGETS.map(b => (
                    <button key={b.id} onClick={() => setSelectedBudget(b.id)}
                      className={`w-full p-4 rounded-card border text-left transition-all duration-200 flex items-center gap-3
                        ${selectedBudget === b.id ? 'border-accent-sky/50 bg-accent-sky/10' : 'border-white/10 hover:border-accent-sky/30'}`}>
                      <span className="text-xl">{b.icon}</span>
                      <span className="font-body text-sm font-medium text-white">{b.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={prevStep} className="flex-1 py-3 border border-white/10 text-text-secondary
                    rounded-card font-body text-sm hover:border-accent-sky/30 transition-colors">← Back</button>
                  <button onClick={nextStep} className="flex-1 py-3 bg-accent-amber text-bg-base rounded-card font-body
                    font-semibold text-sm hover:opacity-90 transition-opacity">Continue →</button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="season" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <h2 className="font-display text-2xl text-white mb-2">When are you <span className="text-accent-amber">going</span>?</h2>
                <p className="text-text-secondary text-sm mb-6">Pick one or more seasons</p>
                <div className="flex flex-wrap gap-2">
                  {SEASONS.map(s => (
                    <button key={s.id} onClick={() => toggleSeason(s.id)}
                      className={`chip ${selectedSeasons.includes(s.id) ? 'active' : ''}`}>
                      <span>{s.icon}</span><span>{s.label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={prevStep} className="flex-1 py-3 border border-white/10 text-text-secondary
                    rounded-card font-body text-sm hover:border-accent-sky/30 transition-colors">← Back</button>
                  <button onClick={nextStep} className="flex-1 py-3 bg-accent-amber text-bg-base rounded-card font-body
                    font-semibold text-sm hover:opacity-90 transition-opacity">Show me places ✨</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="results" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <h2 className="font-display text-2xl text-white mb-2">
                  We found <span className="text-accent-amber">{results.length}</span> match{results.length !== 1 ? 'es' : ''}
                </h2>
                <p className="text-text-secondary text-sm mb-6">Click to fly there</p>

                {results.length > 0 ? (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {results.map((dest, idx) => (
                      <button key={dest.id} onClick={() => handleSelectResult(dest)}
                        className="w-full p-4 rounded-card border border-white/10 text-left
                          hover:border-accent-sky/40 hover:bg-white/5 transition-all duration-200 group">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-text-secondary">#{idx + 1}</span>
                              <span className="font-display font-semibold text-white group-hover:text-accent-amber transition-colors">{dest.name}</span>
                            </div>
                            <p className="text-text-secondary text-xs mt-1 line-clamp-1">{dest.description}</p>
                            <div className="flex gap-1 mt-2">
                              {dest.type.map(t => (
                                <span key={t} className="text-[10px] bg-white/5 text-accent-sky px-2 py-0.5 rounded-full font-mono uppercase">{t}</span>
                              ))}
                            </div>
                          </div>
                          <span className="text-accent-sky group-hover:translate-x-1 transition-transform text-lg">→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <span className="text-4xl">🌍</span>
                    <p className="text-text-secondary mt-2">No exact matches — try adjusting your preferences</p>
                  </div>
                )}

                <button onClick={() => { setStep(0); setSelectedMoods([]); setSelectedBudget(null); setSelectedSeasons([]); }}
                  className="w-full mt-4 py-3 border border-white/10 text-text-secondary
                    rounded-card font-body text-sm hover:border-accent-sky/30 transition-colors">
                  Start over
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
