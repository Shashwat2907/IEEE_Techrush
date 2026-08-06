import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { getDestinations } from '../../services/destinations';
import {
  BeachIcon,
  MountainIcon,
  LandmarkIcon,
  BuildingIcon,
  SunIcon,
  RainIcon,
  LeafIcon,
  SnowflakeIcon,
  GlobeIcon,
  CloseIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '../../components/ui/Icons';

const MOODS = [
  { id: 'relax', label: 'Relaxation & Nature', icon: BeachIcon, types: ['beach', 'nature'] },
  { id: 'adventure', label: 'Outdoor Adventure', icon: MountainIcon, types: ['adventure', 'nature'] },
  { id: 'culture', label: 'Art & Heritage', icon: LandmarkIcon, types: ['culture', 'heritage'] },
  { id: 'urban', label: 'City & Modern Life', icon: BuildingIcon, types: ['urban', 'culture'] },
];

const BUDGETS = [
  { id: 'budget', label: 'Budget-Friendly', symbol: '$' },
  { id: 'mid', label: 'Mid-Range Comfort', symbol: '$$' },
  { id: 'premium', label: 'Luxury & Premium', symbol: '$$$' },
];

const SEASONS = [
  { id: 'spring', label: 'Spring', icon: LeafIcon },
  { id: 'summer', label: 'Summer', icon: SunIcon },
  { id: 'monsoon', label: 'Monsoon', icon: RainIcon },
  { id: 'autumn', label: 'Autumn', icon: LeafIcon },
  { id: 'winter', label: 'Winter', icon: SnowflakeIcon },
];

export default function DiscoveryQuiz() {
  const { hideQuiz, flyToDestination } = useApp();
  const [step, setStep] = useState(0);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [selectedSeasons, setSelectedSeasons] = useState([]);

  const results = useMemo(() => {
    if (step < 3) return [];
    const moodTypes = selectedMoods.flatMap((m) => MOODS.find((mood) => mood.id === m)?.types || []);
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

  const toggleMood = (id) =>
    setSelectedMoods((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  const toggleSeason = (id) =>
    setSelectedSeasons((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => Math.max(0, prev - 1));

  const handleSelectResult = useCallback(
    (dest) => {
      hideQuiz();
      setTimeout(() => flyToDestination(dest), 400);
    },
    [hideQuiz, flyToDestination]
  );

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl"
    >
      <div className="relative w-full max-w-lg">
        {/* Close Button */}
        <button
          onClick={hideQuiz}
          className="absolute -top-12 right-0 p-2 text-text-secondary hover:text-white transition-colors"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        {/* Quiz Card */}
        <motion.div
          layout
          className="bg-surface/95 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl"
        >
          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[0, 1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-accent-sky' : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="mood" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <h2 className="font-display text-2xl font-bold text-white mb-2">What's your travel style?</h2>
                <p className="text-text-secondary text-sm mb-6">Choose one or more travel styles you enjoy.</p>
                <div className="grid grid-cols-2 gap-3">
                  {MOODS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = selectedMoods.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        onClick={() => toggleMood(m.id)}
                        className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col gap-2 ${
                          isSelected
                            ? 'bg-accent-sky/15 border-accent-sky text-white'
                            : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-accent-sky' : 'text-text-secondary'}`} />
                        <span className="font-body font-semibold text-sm">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={nextStep}
                  disabled={selectedMoods.length === 0}
                  className="w-full mt-6 py-3.5 bg-accent-sky text-bg-base rounded-xl font-body font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  Continue →
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="budget" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <h2 className="font-display text-2xl font-bold text-white mb-2">What is your target budget?</h2>
                <p className="text-text-secondary text-sm mb-6">Select your preferred expense tier.</p>
                <div className="space-y-3">
                  {BUDGETS.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBudget(b.id)}
                      className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-center justify-between ${
                        selectedBudget === b.id
                          ? 'bg-accent-sky/15 border-accent-sky text-white'
                          : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <span className="font-body font-semibold text-sm">{b.label}</span>
                      <span className="font-mono text-sm text-accent-amber font-bold">{b.symbol}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={prevStep}
                    className="flex-1 py-3.5 border border-white/10 text-text-secondary rounded-xl font-body text-sm hover:border-accent-sky/30 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={nextStep}
                    disabled={!selectedBudget}
                    className="flex-1 py-3.5 bg-accent-sky text-bg-base rounded-xl font-body font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  >
                    Continue →
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="season" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <h2 className="font-display text-2xl font-bold text-white mb-2">When do you want to travel?</h2>
                <p className="text-text-secondary text-sm mb-6">Pick your ideal travel seasons.</p>
                <div className="flex flex-wrap gap-2.5">
                  {SEASONS.map((s) => {
                    const Icon = s.icon;
                    const isSelected = selectedSeasons.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSeason(s.id)}
                        className={`chip flex items-center gap-2 px-4 py-2.5 rounded-xl ${
                          isSelected ? 'active' : ''
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="capitalize">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={prevStep}
                    className="flex-1 py-3.5 border border-white/10 text-text-secondary rounded-xl font-body text-sm hover:border-accent-sky/30 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={nextStep}
                    className="flex-1 py-3.5 bg-accent-sky text-bg-base rounded-xl font-body font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <SparklesIcon className="w-4 h-4" />
                    <span>Discover Places</span>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="results" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <h2 className="font-display text-2xl font-bold text-white mb-1">
                  We found <span className="text-accent-sky">{results.length}</span> curated matches
                </h2>
                <p className="text-text-secondary text-sm mb-5">Click any place to fly there directly.</p>

                {results.length > 0 ? (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {results.map((dest, idx) => (
                      <button
                        key={dest.id}
                        onClick={() => handleSelectResult(dest)}
                        className="w-full p-4 rounded-xl border border-white/10 text-left hover:border-accent-sky/40 hover:bg-white/5 transition-all duration-200 group flex items-start justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-text-secondary">#{idx + 1}</span>
                            <span className="font-display font-semibold text-white group-hover:text-accent-sky transition-colors">
                              {dest.name}
                            </span>
                          </div>
                          <p className="text-text-secondary text-xs mt-1 line-clamp-1">{dest.description}</p>
                          <div className="flex gap-1.5 mt-2">
                            {dest.type.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] bg-white/5 text-accent-sky px-2 py-0.5 rounded-full font-mono uppercase"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="text-accent-sky group-hover:translate-x-1 transition-transform mt-1">
                          <ArrowRightIcon className="w-4 h-4" />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <GlobeIcon className="w-12 h-12 text-text-secondary mx-auto mb-2 opacity-50" />
                    <p className="text-text-secondary text-sm">No exact matches — try adjusting your preferences</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setStep(0);
                    setSelectedMoods([]);
                    setSelectedBudget(null);
                    setSelectedSeasons([]);
                  }}
                  className="w-full mt-4 py-3 border border-white/10 text-text-secondary rounded-xl font-body text-sm hover:border-accent-sky/30 transition-colors"
                >
                  Start Over
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
