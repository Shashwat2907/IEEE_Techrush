import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStoredApiKey, setStoredApiKey } from '../../config/api';
import { CloseIcon, KeyIcon, CheckIcon, SparklesIcon } from './Icons';

export default function ApiKeyModal({ isOpen, onClose }) {
  const [llmKey, setLlmKey] = useState('');
  const [owmKey, setOwmKey] = useState('');
  const [crowdKey, setCrowdKey] = useState('');
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLlmKey(getStoredApiKey('llm') || '');
      setOwmKey(getStoredApiKey('openweathermap') || '');
      setCrowdKey(getStoredApiKey('crowd') || '');
      setSavedMessage(false);
    }
  }, [isOpen]);

  const handleSave = (e) => {
    e.preventDefault();
    setStoredApiKey('llm', llmKey);
    setStoredApiKey('openweathermap', owmKey);
    setStoredApiKey('crowd', crowdKey);
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      onClose();
    }, 900);
  };

  const handleClear = () => {
    setStoredApiKey('llm', '');
    setStoredApiKey('openweathermap', '');
    setStoredApiKey('crowd', '');
    setLlmKey('');
    setOwmKey('');
    setCrowdKey('');
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="w-full max-w-md bg-[#0A0E17]/95 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent-sky/10 border border-accent-sky/20 flex items-center justify-center text-accent-sky">
              <KeyIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">API Keys & Services</h3>
              <p className="text-[11px] text-text-secondary font-mono">Custom API configuration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Note on Free Defaults */}
        <div className="mb-4 p-3 rounded-xl bg-accent-sky/10 border border-accent-sky/20 text-xs text-slate-200 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-accent-sky">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Ready Out of the Box</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Real-time weather via Open-Meteo and intelligent travel recommendations run automatically with zero setup. You can optionally configure your own keys below:
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* AI / LLM API Key */}
          <div>
            <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-1">
              AI / LLM API Key (Gemini / OpenAI / OpenRouter)
            </label>
            <input
              type="password"
              placeholder="e.g. AIzaSy... or sk-..."
              value={llmKey}
              onChange={(e) => setLlmKey(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-white/10 focus:border-accent-sky rounded-xl text-xs font-mono text-white outline-none transition-colors"
            />
          </div>

          {/* OpenWeatherMap Key */}
          <div>
            <label className="block text-xs font-mono text-text-secondary uppercase tracking-wider mb-1">
              OpenWeatherMap API Key (Optional)
            </label>
            <input
              type="password"
              placeholder="e.g. 4a2b9..."
              value={owmKey}
              onChange={(e) => setOwmKey(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-white/10 focus:border-accent-sky rounded-xl text-xs font-mono text-white outline-none transition-colors"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-mono text-text-secondary/60 hover:text-accent-rose transition-colors"
            >
              Clear Keys
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl border border-white/10 text-xs text-text-secondary hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-accent-sky text-slate-950 font-body font-semibold text-xs hover:bg-sky-400 active:scale-95 transition-all shadow-md shadow-accent-sky/20 flex items-center gap-1.5"
              >
                {savedMessage ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Keys</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
