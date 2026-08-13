import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { useItinerary } from '../../context/ItineraryContext';
import { generateTripPlan, chatWithAssistant } from '../../services/tripAssistantAI';
import { CloseIcon } from '../../components/ui/Icons';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-emerald-400"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

export default function AiTripAssistant({ isOpen, onClose, destination }) {
  const { isDark } = useTheme();
  const { addActivity, importAiPlan, days, setDestination } = useItinerary();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  // Plan form fields
  const [planDays, setPlanDays] = useState(3);
  const [planCurrency, setPlanCurrency] = useState('USD');
  const [planBudget, setPlanBudget] = useState(1500);
  const [planInterests, setPlanInterests] = useState('');
  const [planStyle, setPlanStyle] = useState('balanced');
  const [planDietary, setPlanDietary] = useState('');

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0) {
      const destName = destination?.name?.split(',')[0] || 'your destination';
      setMessages([
        {
          role: 'assistant',
          content: `👋 Hi! I'm your TripNest AI assistant. I can help you plan an amazing trip${destination ? ` to **${destName}**` : ''}!\n\nYou can:\n• Ask me about places to visit, food to try, or where to stay\n• Click **"Generate Full Plan"** for a complete day-by-day itinerary\n• Tell me your interests, budget, and preferences\n\nWhat would you like to know?`,
        },
      ]);
    }
  }, [destination]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    const chatHistory = [...messages.filter((m) => m.role !== 'system'), { role: 'user', content: userMessage }].slice(-10);

    const result = await chatWithAssistant(chatHistory, destination);
    setIsLoading(false);

    if (result.success) {
      setMessages((prev) => [...prev, { role: 'assistant', content: result.content }]);
    } else {
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${result.error}` }]);
    }
  };

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setShowPlanForm(false);
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: `Generate a ${planDays}-day trip plan. Budget: ${planCurrency} ${planBudget}. Interests: ${planInterests || 'general sightseeing'}. Style: ${planStyle}. ${planDietary ? `Dietary: ${planDietary}` : ''}`,
      },
    ]);

    const result = await generateTripPlan(
      {
        days: planDays,
        budget: planBudget,
        interests: planInterests,
        travelStyle: planStyle,
        dietary: planDietary,
      },
      destination
    );

    setIsLoading(false);

    if (result.success) {
      setGeneratedPlan(result.plan);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `✨ I've created your **${result.plan.days.length}-day trip plan**!\n\n${result.plan.summary}\n\nYou can review the plan below and click **"Add to Itinerary"** to import it into your trip planner.`,
          plan: result.plan,
        },
      ]);
    } else {
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${result.error}` }]);
    }
  };

  const handleImportPlan = () => {
    if (!generatedPlan) return;

    if (destination) {
      setDestination(destination);
    }

    // Add activities via atomic import
    importAiPlan(generatedPlan.days);

    setMessages((prev) => [...prev, { role: 'assistant', content: '✅ Plan imported to your itinerary! Switch to the **Itinerary** tab to see it.' }]);
    setGeneratedPlan(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`h-full flex flex-col ${isDark ? 'text-white' : 'text-slate-900'} font-sans select-none overflow-hidden`}>
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b apple-liquid-glass flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-500 dark:text-purple-400 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="truncate">
            <span className="text-xs font-bold uppercase tracking-wider block truncate">
              AI Trip Assistant
            </span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium truncate block">
              {destination?.name || 'Ready to plan'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowPlanForm(true)}
            className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-500 dark:text-purple-400 text-[11px] font-bold rounded-full transition-colors cursor-pointer border border-purple-500/20"
          >
            Generate Full Plan
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? isDark
                    ? 'bg-purple-500/20 border border-purple-500/30 text-white'
                    : 'bg-purple-500 text-white'
                  : isDark
                  ? 'bg-white/10 border border-white/10 text-zinc-200'
                  : 'bg-slate-100 border border-slate-200 text-slate-800'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content?.split('**').map((part, i) =>
                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
              )}</div>

              {/* Plan preview */}
              {msg.plan && (
                <div className="mt-3 space-y-2">
                  {msg.plan.days.map((day, di) => (
                    <div key={di} className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/100'}`}>
                      <div className="text-xs font-bold mb-1">{day.label}{day.theme ? ` — ${day.theme}` : ''}</div>
                      <div className="space-y-1">
                        {(day.activities || []).slice(0, 4).map((act, ai) => (
                          <div key={ai} className="text-[11px] flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              act.type === 'food' ? 'bg-green-400' : act.type === 'stay' ? 'bg-amber-400' : act.type === 'transport' ? 'bg-slate-400' : 'bg-blue-400'
                            }`} />
                            <span className="truncate flex-1">{act.name}</span>
                            <span className="text-[10px] opacity-60 shrink-0">${act.cost}</span>
                          </div>
                        ))}
                        {(day.activities || []).length > 4 && (
                          <div className="text-[10px] opacity-50 ml-3.5">+{day.activities.length - 4} more</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {generatedPlan && (
                    <button
                      type="button"
                      onClick={handleImportPlan}
                      className="w-full py-2.5 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-full transition-colors cursor-pointer shadow-md"
                    >
                      ✚ Add to Itinerary
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className={`rounded-2xl ${isDark ? 'bg-white/10 border border-white/10' : 'bg-slate-100 border border-slate-200'}`}>
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Plan Form Modal */}
      <AnimatePresence>
        {showPlanForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`absolute inset-x-0 bottom-0 z-20 p-4 ${isDark ? 'bg-[#0E0E14]/95' : 'bg-white/95'} backdrop-blur-xl border-t ${isDark ? 'border-white/10' : 'border-black/10'} rounded-t-3xl shadow-2xl`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Plan Your Trip</h3>
              <button type="button" onClick={() => setShowPlanForm(false)} className="text-xs opacity-60 hover:opacity-100 cursor-pointer">Cancel</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-1">Days</label>
                  <input type="number" value={planDays} onChange={(e) => setPlanDays(Math.max(1, Math.min(7, parseInt(e.target.value) || 1)))} min="1" max="7"
                    className={`w-full px-3 py-2 rounded-xl text-sm font-semibold outline-none border ${isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-1">Currency</label>
                  <select value={planCurrency} onChange={(e) => setPlanCurrency(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm outline-none border cursor-pointer ${isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-1">Budget ({planCurrency})</label>
                  <input type="number" min="100" step="100" value={planBudget} onChange={(e) => setPlanBudget(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm outline-none border ${isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-1">Interests</label>
                <input type="text" value={planInterests} onChange={(e) => setPlanInterests(e.target.value)} placeholder="e.g. beaches, history, street food, nightlife..."
                  className={`w-full px-3 py-2 rounded-xl text-sm outline-none border ${isDark ? 'bg-white/10 border-white/15 text-white placeholder:text-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-1">Travel Style</label>
                  <select value={planStyle} onChange={(e) => setPlanStyle(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm outline-none border cursor-pointer ${isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                    <option value="balanced">Balanced</option>
                    <option value="adventure">Adventure</option>
                    <option value="relaxed">Relaxed</option>
                    <option value="cultural">Cultural</option>
                    <option value="luxury">Luxury</option>
                    <option value="backpacker">Backpacker</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block mb-1">Dietary</label>
                  <input type="text" value={planDietary} onChange={(e) => setPlanDietary(e.target.value)} placeholder="Vegetarian, halal..."
                    className={`w-full px-3 py-2 rounded-xl text-sm outline-none border ${isDark ? 'bg-white/10 border-white/15 text-white placeholder:text-zinc-500' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                </div>
              </div>
              <button type="button" onClick={handleGeneratePlan}
                className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold rounded-full transition-colors cursor-pointer shadow-lg">
                ✨ Generate Trip Plan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className={`p-3 border-t shrink-0 ${isDark ? 'border-white/10' : 'border-black/10'}`}>
        <div className={`flex items-center gap-2 rounded-full px-4 py-2 ${isDark ? 'bg-white/10 border border-white/10' : 'bg-slate-100 border border-slate-200'}`}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about places, food, stays..."
            disabled={isLoading}
            className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder:text-zinc-500' : 'text-slate-900 placeholder:text-slate-400'}`}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              input.trim() && !isLoading
                ? 'bg-purple-500 text-white hover:bg-purple-600 shadow-sm'
                : isDark ? 'bg-white/10 text-zinc-500' : 'bg-slate-200 text-slate-400'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
