import { motion } from 'framer-motion';

export default function FloatingExploreArrow({ onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ y: 0 }}
      className="pointer-events-auto flex flex-col items-center gap-1 group cursor-pointer"
      title="Explore Trending Destinations & Routes"
    >
      <span className="text-xs font-mono font-bold tracking-[0.2em] uppercase text-zinc-400 dark:text-zinc-400 light:text-zinc-600 group-hover:text-white dark:group-hover:text-white light:group-hover:text-black transition-colors">
        EXPLORE TRENDING
      </span>
      <div className="w-10 h-10 rounded-xl bg-[#0E0E14]/90 dark:bg-[#0E0E14]/90 light:bg-white/90 border border-white/20 dark:border-white/20 light:border-zinc-300 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/50 shadow-[0_0_15px_rgba(255,255,255,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.1)] light:shadow-[0_0_15px_rgba(0,0,0,0.1)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-300">
        <svg
          className="w-5 h-5 transition-transform group-hover:-translate-y-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M5 15l7-7 7 7"
          />
        </svg>
      </div>
    </motion.button>
  );
}
