import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { getDestinations } from '../../services/destinations';
import { getDestinationPhoto } from '../../services/photos';
import { generateMatchmakerDestinations } from '../../services/tripAssistantAI';
import {
  SparklesIcon,
  CloseIcon,
} from '../../components/ui/Icons';

const QUIZ_QUESTIONS = [
  {
    id: 'vibe',
    title: 'What atmosphere do you seek for this expedition?',
    subtitle: 'Select the primary landscape & tempo',
    options: [
      { id: 'beach', label: 'Sun-Soaked Coast & Islands', desc: 'Warm sands, turquoise water, coastal ease' },
      { id: 'nature', label: 'Alpine Peaks & Deep Wilderness', desc: 'Mountain air, hiking trails, solitude' },
      { id: 'culture', label: 'Ancient Heritage & Arts', desc: 'Museums, architecture, culinary traditions' },
      { id: 'urban', label: 'High-Energy Metropolis', desc: 'Skyline views, nightlife, dynamic streets' },
    ],
  },
  {
    id: 'tempo',
    title: 'What pace aligns best with your journey?',
    subtitle: 'Crowd density and activity volume preference',
    options: [
      { id: 'low', label: 'Quiet & Serene (Low Density)', desc: 'Off the beaten track, peaceful retreats' },
      { id: 'medium', label: 'Balanced & Steady', desc: 'Popular sights without overwhelming crowds' },
      { id: 'high', label: 'Vibrant & World-Famous', desc: 'Iconic global landmarks and bustling centers' },
    ],
  },
  {
    id: 'budget',
    title: 'Target financial profile for this trip?',
    subtitle: 'Expense allocation range',
    options: [
      { id: 'budget', label: 'Backpacker / Economy', desc: 'Value-first hostels, street food, free exploration' },
      { id: 'mid', label: 'Comfortable Mid-Range', desc: 'Boutique hotels, curated dining, guided sights' },
      { id: 'luxury', label: 'High-End Luxury', desc: '5-star accommodations, private transport & fine dining' },
    ],
  },
];

export default function DiscoveryQuiz() {
  const { hideQuiz, flyToDestination } = useApp();
  const { isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [matchedResults, setMatchedResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectOption = async (questionId, optionId) => {
    const nextAnswers = { ...answers, [questionId]: optionId };
    setAnswers(nextAnswers);

    if (currentStep < QUIZ_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsLoading(true);
      const res = await generateMatchmakerDestinations({
        vibe: nextAnswers.vibe,
        tempo: nextAnswers.tempo,
        budget: nextAnswers.budget,
      });
      setIsLoading(false);
      
      if (res.success && res.destinations) {
        setMatchedResults(res.destinations.slice(0, 3));
      } else {
        // Fallback
        const allDests = getDestinations();
        const scored = allDests.map((dest) => {
          let score = 0;
          if (dest.type?.includes(nextAnswers.vibe)) score += 3;
          if (dest.crowdLevel === nextAnswers.tempo) score += 2;
          if (dest.budgetTier === nextAnswers.budget) score += 2;
          return { ...dest, matchScore: score };
        });
        scored.sort((a, b) => b.matchScore - a.matchScore);
        setMatchedResults(scored.slice(0, 3));
      }
    }
  };

  const handleLaunchDestination = (dest) => {
    hideQuiz();
    flyToDestination(dest);
  };

  const question = QUIZ_QUESTIONS[currentStep];
  const progressPct = ((currentStep + 1) / QUIZ_QUESTIONS.length) * 100;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col border transition-colors ${
          isDark
            ? 'bg-[#0E0E12] border-white/15 text-white'
            : 'bg-white border-black/10 text-slate-900'
        }`}
      >
        {/* Header Bar */}
        <div
          className={`p-5 flex items-center justify-between border-b transition-colors ${
            isDark
              ? 'bg-[#131318]/90 border-white/10'
              : 'bg-slate-50/90 border-black/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <SparklesIcon className="w-5 h-5 text-emerald-500" />
            <h2
              className={`font-display text-sm font-bold uppercase tracking-wider ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              AI Travel Matchmaker
            </h2>
          </div>
          <button
            type="button"
            onClick={hideQuiz}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-white/15'
                : 'text-slate-500 hover:text-slate-900 hover:bg-black/10'
            }`}
            title="Exit"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Line */}
        {!matchedResults && (
          <div className={`w-full h-1 ${isDark ? 'bg-[#1A1A22]' : 'bg-slate-100'}`}>
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 sm:p-8 space-y-6">
          {!matchedResults ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-500 uppercase">
                    STEP {currentStep + 1} OF {QUIZ_QUESTIONS.length}
                  </span>
                  <h3
                    className={`font-display text-2xl font-bold tracking-tight mt-1 ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {question.title}
                  </h3>
                  <p
                    className={`text-xs mt-1 ${
                      isDark ? 'text-zinc-400' : 'text-slate-500'
                    }`}
                  >
                    {question.subtitle}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {question.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(question.id, opt.id)}
                      className={`p-4 text-left border rounded-2xl transition-all group cursor-pointer space-y-1.5 ${
                        isDark
                          ? 'bg-[#131318] hover:bg-[#1C1C24] border-white/10 hover:border-emerald-500/50'
                          : 'bg-slate-50 hover:bg-slate-100 border-black/10 hover:border-emerald-500/50 shadow-sm'
                      }`}
                    >
                      <div
                        className={`text-sm font-bold transition-colors ${
                          isDark
                            ? 'text-white group-hover:text-emerald-400'
                            : 'text-slate-900 group-hover:text-emerald-600'
                        }`}
                      >
                        {opt.label}
                      </div>
                      <div
                        className={`text-xs leading-relaxed ${
                          isDark ? 'text-zinc-400' : 'text-slate-500'
                        }`}
                      >
                        {opt.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center"
            >
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <h3 className="text-xl font-bold mb-2">Analyzing your travel vibe...</h3>
              <p className="text-sm opacity-60">Consulting AI for the perfect destination match</p>
            </motion.div>
          ) : (
            /* Results View */
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <div className="text-xs font-mono font-bold text-emerald-500 uppercase tracking-widest">
                  MATCHING COMPLETE
                </div>
                <h3
                  className={`font-display text-2xl font-bold ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Top Recommended Expeditions
                </h3>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  Based on your pace, landscape preference, and financial tier.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {matchedResults.map((dest) => {
                  const photo = getDestinationPhoto(dest);
                  return (
                    <div
                      key={dest.id}
                      className={`border rounded-2xl overflow-hidden flex flex-col justify-between group cursor-pointer transition-all ${
                        isDark
                          ? 'bg-[#131318] border-white/10 hover:border-white/30'
                          : 'bg-white border-black/10 hover:border-black/30 shadow-sm'
                      }`}
                      onClick={() => handleLaunchDestination(dest)}
                    >
                      <div className="relative h-32 w-full overflow-hidden">
                        <img
                          src={photo}
                          alt={dest.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div
                          className={`absolute inset-0 bg-gradient-to-t ${
                            isDark ? 'from-[#131318]' : 'from-slate-900/80'
                          } to-transparent opacity-80`}
                        />
                        <div className="absolute bottom-2 left-3 right-3">
                          <div className="text-[10px] text-zinc-300 uppercase font-mono">
                            {dest.country || (dest.name.includes(',') ? dest.name.split(',')[1].trim() : '')}
                          </div>
                          <div className="text-sm font-bold text-white truncate">{dest.name}</div>
                        </div>
                      </div>

                      <div className="p-3">
                        <button
                          type="button"
                          className="w-full btn-primary py-2 text-xs font-bold"
                        >
                          Fly to Destination ↗
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMatchedResults(null);
                    setCurrentStep(0);
                    setAnswers({});
                  }}
                  className={`text-xs font-bold py-2 px-5 rounded-full transition-all cursor-pointer ${
                    isDark
                      ? 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
                      : 'bg-black/5 text-slate-800 hover:bg-black/10 border border-black/10'
                  }`}
                >
                  Restart Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
