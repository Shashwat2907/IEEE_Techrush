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
      <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-zinc-400 dark:text-zinc-400 light:text-zinc-600 group-hover:text-white dark:group-hover:text-white light:group-hover:text-black transition-colors">
        EXPLORE TRENDING
      </span>
      <div className="w-8 h-8 rounded-lg bg-[#0E0E14]/90 dark:bg-[#0E0E14]/90 light:bg-white/90 border border-white/15 dark:border-white/15 light:border-zinc-300 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/50 shadow-lg transition-all">
        <svg
          className="w-4 h-4 transition-transform group-hover:-translate-y-0.5"
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
