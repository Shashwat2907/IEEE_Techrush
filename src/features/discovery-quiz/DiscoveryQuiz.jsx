import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { getDestinations } from '../../services/destinations';
import { getStoredApiKey } from '../../config/api';
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
  SettingsIcon,
  KeyIcon,
} from '../../components/ui/Icons';

const VIBES = [
  { id: 'relax', label: 'Beach & Wellness', icon: BeachIcon, types: ['beach', 'nature'] },
  { id: 'adventure', label: 'Outdoor Adventure', icon: MountainIcon, types: ['adventure', 'nature'] },
  { id: 'culture', label: 'Art, Temples & Heritage', icon: LandmarkIcon, types: ['culture', 'heritage'] },
  { id: 'urban', label: 'Metropolis & Nightlife', icon: BuildingIcon, types: ['urban', 'culture'] },
  { id: 'scenic', label: 'Alpine Lakes & Mountains', icon: MountainIcon, types: ['nature', 'adventure'] },
];

const BUDGETS = [
  { id: 'budget', label: 'Budget Conscious', desc: '<$60/day backpacker style', symbol: '$' },
  { id: 'mid', label: 'Balanced Comfort', desc: '$120-$200/day boutique stays', symbol: '$$' },
  { id: 'premium', label: 'Luxury & 5-Star', desc: '$350+/day premium resorts', symbol: '$$$' },
];

const CLIMATES = [
  { id: 'summer', label: 'Tropical & Sunny', icon: SunIcon },
  { id: 'spring', label: 'Mild Spring & Blossom', icon: LeafIcon },
  { id: 'autumn', label: 'Crisp Autumn Foliage', icon: LeafIcon },
  { id: 'winter', label: 'Snow & Alpine Chill', icon: SnowflakeIcon },
  { id: 'monsoon', label: 'Lush Monsoon & Rain', icon: RainIcon },
];

const COMPANIONS = [
  { id: 'solo', label: 'Solo Traveler' },
  { id: 'couple', label: 'Romantic Couple' },
  { id: 'family', label: 'Family with Kids' },
  { id: 'friends', label: 'Group of Friends' },
];

export default function DiscoveryQuiz() {
  const { hideQuiz, flyToDestination, openApiKeyModal } = useApp();

  const [step, setStep] = useState(0);
  const [selectedVibes, setSelectedVibes] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [selectedClimates, setSelectedClimates] = useState([]);
  const [selectedCompanion, setSelectedCompanion] = useState('solo');
  const [customWishlist, setCustomWishlist] = useState('');

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Active question toggles
  const [enabledQuestions, setEnabledQuestions] = useState({
    vibes: true,
    budget: true,
    climate: true,
    companions: true,
    wishlist: true,
  });

  const toggleVibe = (id) =>
    setSelectedVibes((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  const toggleClimate = (id) =>
    setSelectedClimates((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  // Local rule-based recommendation calculator
  const fallbackResults = useMemo(() => {
    const allDests = getDestinations();
    const moodTypes = selectedVibes.flatMap(
      (m) => VIBES.find((vibe) => vibe.id === m)?.types || []
    );
    const uniqueTypes = [...new Set(moodTypes)];

    let scored = allDests.map((dest) => {
      let score = 70; // baseline

      // Match type
      const typeOverlap = dest.type.filter((t) => uniqueTypes.includes(t)).length;
      score += typeOverlap * 10;

      // Match budget
      if (selectedBudget && dest.budgetTier === selectedBudget) {
        score += 15;
      }

      // Match climate/season
      if (selectedClimates.some((s) => dest.season?.includes(s))) {
        score += 10;
      }

      // Cap at 98%
      const matchPct = Math.min(98, score);

      let reason = `Ideal match for ${selectedVibes.join(', ') || 'travel'} with ${dest.budgetTier} budget tier.`;
      if (customWishlist.trim()) {
        reason = `Matches your preference for "${customWishlist.slice(0, 35)}..." with world-class ${dest.type.join(', ')}.`;
      }

      return {
        ...dest,
        matchPct,
        aiReason: reason,
      };
    });

    scored.sort((a, b) => b.matchPct - a.matchPct);
    return scored.slice(0, 4);
  }, [selectedVibes, selectedBudget, selectedClimates, customWishlist]);

  // Request AI Advice (using LLM key if available, otherwise local AI scoring)
  const handleGenerateRecommendations = async () => {
    setIsAiLoading(true);
    setStep(4); // Results step

    const openAiKey = getStoredApiKey('OPENAI_API_KEY');
    const geminiKey = getStoredApiKey('GEMINI_API_KEY');

    if (openAiKey || geminiKey) {
      try {
        // Live OpenAI / LLM call if key provided
        if (openAiKey) {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${openAiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content:
                    'You are an expert luxury travel concierge. Return a JSON array of 3 top destination recommendations with keys: "name", "country", "matchPct", "aiReason", "lat", "lng", "budgetTier".',
                },
                {
                  role: 'user',
                  content: `User travel profile: Vibes: ${selectedVibes.join(', ')}, Budget: ${selectedBudget}, Climates: ${selectedClimates.join(', ')}, Companion: ${selectedCompanion}, Wishlist: "${customWishlist}". Return strictly valid JSON array only.`,
                },
              ],
              temperature: 0.7,
            }),
          });
          const data = await res.json();
          if (data?.choices?.[0]?.message?.content) {
            const parsed = JSON.parse(data.choices[0].message.content);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setAiSuggestions(parsed);
              setIsAiLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('AI Concierge API call error, using local fallback:', err);
      }
    }

    // Local engine fallback
    setTimeout(() => {
      setAiSuggestions(fallbackResults);
      setIsAiLoading(false);
    }, 600);
  };

  const handleSelectResult = useCallback(
    (dest) => {
      hideQuiz();
      setTimeout(() => flyToDestination(dest), 350);
    },
    [hideQuiz, flyToDestination]
  );

  const containerVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl"
    >
      <div className="relative w-full max-w-xl">
        {/* Header Controls */}
        <div className="absolute -top-12 inset-x-0 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setIsConfiguring(!isConfiguring)}
            className="flex items-center gap-1.5 text-xs font-mono text-text-secondary hover:text-white transition-colors bg-white/5 border border-white/10 px-2.5 py-1 rounded-xl"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-accent-sky" />
            <span>Configure Questions</span>
          </button>

          <button
            type="button"
            onClick={hideQuiz}
            className="p-1.5 text-text-secondary hover:text-white transition-colors bg-white/5 border border-white/10 rounded-xl"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Card */}
        <motion.div
          layout
          className="bg-[#07090E]/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden"
        >
          {/* Question Configuration Modal View */}
          {isConfiguring ? (
            <div className="space-y-4">
              <h3 className="font-display text-lg font-bold text-white">Configure AI Questionnaire</h3>
              <p className="text-xs text-text-secondary">
                Select which travel preference questions you want the AI Concierge to ask:
              </p>
              <div className="space-y-2.5 pt-2">
                {[
                  { key: 'vibes', label: '1. Travel Vibe & Activity Style' },
                  { key: 'budget', label: '2. Target Budget Tier' },
                  { key: 'climate', label: '3. Climate & Season Preferences' },
                  { key: 'companions', label: '4. Traveling Companions' },
                  { key: 'wishlist', label: '5. Custom Wishlist & Special Needs' },
                ].map((q) => (
                  <label
                    key={q.key}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10"
                  >
                    <span className="text-xs font-body text-white">{q.label}</span>
                    <input
                      type="checkbox"
                      checked={enabledQuestions[q.key]}
                      onChange={(e) =>
                        setEnabledQuestions((prev) => ({ ...prev, [q.key]: e.target.checked }))
                      }
                      className="rounded accent-accent-sky"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIsConfiguring(false)}
                className="w-full py-2.5 bg-accent-sky text-bg-base font-bold text-xs rounded-xl mt-4"
              >
                Save & Continue
              </button>
            </div>
          ) : (
            <>
              {/* Step Progress Bar */}
              <div className="flex items-center gap-1.5 mb-6">
                {[0, 1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      s <= step ? 'bg-accent-sky shadow-sm shadow-accent-sky/30' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* ── STEP 0: VIBE & STYLE ── */}
                {step === 0 && (
                  <motion.div
                    key="vibes"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="flex items-center gap-2 text-accent-sky text-xs font-mono mb-1">
                      <SparklesIcon className="w-4 h-4" />
                      <span>AI TRAVEL CONCIERGE · 1 of 4</span>
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
                      What is your ideal travel vibe?
                    </h2>
                    <p className="text-text-secondary text-xs sm:text-sm mb-5">
                      Select all experiences you would love on this getaway:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {VIBES.map((v) => {
                        const Icon = v.icon;
                        const isSelected = selectedVibes.includes(v.id);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => toggleVibe(v.id)}
                            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 flex items-center gap-3 ${
                              isSelected
                                ? 'bg-accent-sky/15 border-accent-sky text-white shadow-lg shadow-accent-sky/10'
                                : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20 hover:text-white'
                            }`}
                          >
                            <div
                              className={`p-2 rounded-xl ${
                                isSelected ? 'bg-accent-sky text-bg-base' : 'bg-white/5 text-accent-sky'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="font-body font-medium text-xs sm:text-sm">{v.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={selectedVibes.length === 0}
                      className="w-full mt-6 py-3.5 bg-accent-sky text-bg-base rounded-2xl font-body font-bold text-sm disabled:opacity-40 hover:bg-accent-sky-dark transition-colors shadow-lg shadow-accent-sky/20"
                    >
                      Continue →
                    </button>
                  </motion.div>
                )}

                {/* ── STEP 1: BUDGET TIER ── */}
                {step === 1 && (
                  <motion.div
                    key="budget"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="flex items-center gap-2 text-accent-sky text-xs font-mono mb-1">
                      <SparklesIcon className="w-4 h-4" />
                      <span>AI TRAVEL CONCIERGE · 2 of 4</span>
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
                      What is your comfortable budget?
                    </h2>
                    <p className="text-text-secondary text-xs sm:text-sm mb-5">
                      We'll tune accommodations and activity costs to your tier:
                    </p>

                    <div className="space-y-3">
                      {BUDGETS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBudget(b.id)}
                          className={`w-full p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between ${
                            selectedBudget === b.id
                              ? 'bg-accent-sky/15 border-accent-sky text-white shadow-lg shadow-accent-sky/10'
                              : 'bg-white/5 border-white/10 text-text-secondary hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <div>
                            <div className="font-body font-bold text-sm text-white">{b.label}</div>
                            <div className="text-xs text-text-secondary font-mono mt-0.5">{b.desc}</div>
                          </div>
                          <span className="font-mono text-sm text-accent-amber font-bold bg-accent-amber/10 border border-accent-amber/20 px-2.5 py-1 rounded-xl">
                            {b.symbol}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setStep(0)}
                        className="flex-1 py-3.5 border border-white/10 text-text-secondary rounded-2xl font-body text-xs sm:text-sm hover:border-white/25 transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        disabled={!selectedBudget}
                        className="flex-1 py-3.5 bg-accent-sky text-bg-base rounded-2xl font-body font-bold text-xs sm:text-sm disabled:opacity-40 hover:bg-accent-sky-dark transition-colors"
                      >
                        Continue →
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 2: CLIMATE & COMPANION ── */}
                {step === 2 && (
                  <motion.div
                    key="climate"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="flex items-center gap-2 text-accent-sky text-xs font-mono mb-1">
                      <SparklesIcon className="w-4 h-4" />
                      <span>AI TRAVEL CONCIERGE · 3 of 4</span>
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
                      Climate & Travel Companions
                    </h2>
                    <p className="text-text-secondary text-xs sm:text-sm mb-4">
                      Who is coming along, and what weather do you crave?
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[11px] font-mono text-text-secondary uppercase tracking-wider block mb-2">
                          Traveling As:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {COMPANIONS.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setSelectedCompanion(c.id)}
                              className={`p-2.5 rounded-xl border text-xs font-body transition-all text-center ${
                                selectedCompanion === c.id
                                  ? 'bg-accent-sky/20 border-accent-sky text-white font-bold'
                                  : 'bg-white/5 border-white/10 text-text-secondary hover:text-white'
                              }`}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-mono text-text-secondary uppercase tracking-wider block mb-2">
                          Preferred Climate:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {CLIMATES.map((c) => {
                            const Icon = c.icon;
                            const isSelected = selectedClimates.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => toggleClimate(c.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-body transition-all border ${
                                  isSelected
                                    ? 'bg-accent-sky/20 border-accent-sky text-white font-semibold'
                                    : 'bg-white/5 border-white/10 text-text-secondary hover:text-white'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5 text-accent-sky" />
                                <span>{c.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 py-3.5 border border-white/10 text-text-secondary rounded-2xl font-body text-xs sm:text-sm hover:border-white/25 transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="flex-1 py-3.5 bg-accent-sky text-bg-base rounded-2xl font-body font-bold text-xs sm:text-sm hover:bg-accent-sky-dark transition-colors"
                      >
                        Next: Custom Needs →
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 3: CUSTOM WISHLIST & AI PROMPT ── */}
                {step === 3 && (
                  <motion.div
                    key="wishlist"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="flex items-center gap-2 text-accent-sky text-xs font-mono mb-1">
                      <SparklesIcon className="w-4 h-4" />
                      <span>AI TRAVEL CONCIERGE · 4 of 4</span>
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-white mb-2">
                      Any specific wishes or requirements?
                    </h2>
                    <p className="text-text-secondary text-xs sm:text-sm mb-4">
                      Describe your dream trip, dietary needs, accessibility, or specific interests:
                    </p>

                    <textarea
                      rows={3}
                      value={customWishlist}
                      onChange={(e) => setCustomWishlist(e.target.value)}
                      placeholder="e.g. Seeking great vegetarian food, walkable historic streets, vibrant coffee culture, and quiet evening views..."
                      className="w-full p-3.5 bg-surface rounded-2xl border border-white/10 focus:border-accent-sky text-xs sm:text-sm text-white placeholder-text-secondary/50 outline-none resize-none"
                    />

                    {/* API Key Status Notice */}
                    <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyIcon className="w-3.5 h-3.5 text-accent-sky" />
                        <span className="text-[11px] font-mono text-text-secondary">
                          {getStoredApiKey('OPENAI_API_KEY')
                            ? 'OpenAI API Connected'
                            : 'Smart Hybrid AI Engine Ready'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={openApiKeyModal}
                        className="text-[11px] font-mono text-accent-sky hover:underline"
                      >
                        {getStoredApiKey('OPENAI_API_KEY') ? 'Manage Key' : '+ Add Key'}
                      </button>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="flex-1 py-3.5 border border-white/10 text-text-secondary rounded-2xl font-body text-xs sm:text-sm hover:border-white/25 transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateRecommendations}
                        className="flex-1 py-3.5 bg-accent-sky text-bg-base rounded-2xl font-body font-bold text-xs sm:text-sm hover:bg-accent-sky-dark transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent-sky/20"
                      >
                        <SparklesIcon className="w-4 h-4" />
                        <span>Find My Dream Destination</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 4: BESPOKE AI RECOMMENDATIONS ── */}
                {step === 4 && (
                  <motion.div
                    key="results"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {isAiLoading ? (
                      <div className="text-center py-12 space-y-4">
                        <div className="w-12 h-12 rounded-full border-2 border-accent-sky border-t-transparent animate-spin mx-auto" />
                        <p className="text-sm font-display font-medium text-white">
                          Synthesizing climate, budget, and experiences...
                        </p>
                        <p className="text-xs font-mono text-text-secondary">
                          Ranking top destinations for you
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                              Your Curated AI Matches
                            </h2>
                            <p className="text-xs text-text-secondary font-mono mt-0.5">
                              Personalized according to your vibe & budget profile
                            </p>
                          </div>
                          <span className="text-xs font-mono text-accent-sky bg-accent-sky/10 border border-accent-sky/20 px-2.5 py-1 rounded-xl">
                            {aiSuggestions?.length || 0} Places
                          </span>
                        </div>

                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                          {(aiSuggestions || fallbackResults).map((dest, idx) => (
                            <div
                              key={dest.id || idx}
                              className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-accent-sky/40 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                            >
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-display font-bold text-white text-base group-hover:text-accent-sky transition-colors">
                                    {dest.name}
                                  </span>
                                  {dest.matchPct && (
                                    <span className="text-[10px] font-mono text-accent-emerald bg-accent-emerald/10 border border-accent-emerald/20 px-2 py-0.5 rounded-full font-bold">
                                      {dest.matchPct}% Match
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-text-secondary font-body leading-relaxed">
                                  {dest.aiReason || dest.description}
                                </p>

                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {dest.type?.map((t) => (
                                    <span
                                      key={t}
                                      className="text-[9px] bg-white/5 text-accent-sky px-2 py-0.5 rounded-full font-mono uppercase"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                  {dest.budgetTier && (
                                    <span className="text-[9px] bg-accent-amber/10 text-accent-amber px-2 py-0.5 rounded-full font-mono uppercase">
                                      {dest.budgetTier}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSelectResult(dest)}
                                className="w-full sm:w-auto py-2 px-4 rounded-xl bg-accent-sky text-bg-base hover:bg-accent-sky-dark text-xs font-bold font-body flex items-center justify-center gap-1.5 transition-all shadow-md shadow-accent-sky/20 shrink-0"
                              >
                                <span>Fly & Plan</span>
                                <ArrowRightIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setStep(0);
                              setSelectedVibes([]);
                              setSelectedBudget(null);
                              setCustomWishlist('');
                            }}
                            className="text-xs font-mono text-text-secondary hover:text-white transition-colors"
                          >
                            ← Retake Quiz
                          </button>
                          <button
                            type="button"
                            onClick={hideQuiz}
                            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-xl transition-colors"
                          >
                            Explore Map Freely
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
