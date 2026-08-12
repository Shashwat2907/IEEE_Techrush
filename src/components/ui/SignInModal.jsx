import { motion, AnimatePresence } from 'framer-motion';

export default function SignInModal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-sm rounded-[24px] overflow-hidden border shadow-2xl p-8 flex flex-col items-center text-center"
            style={{
              backgroundColor: 'rgba(15, 20, 32, 0.85)',
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(255,255,255,0.08)'
            }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Logo/Icon */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-6 border" style={{ backgroundColor: 'rgba(56,189,248,0.08)', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.2)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>

            <h2 className="text-xl font-black text-white mb-2 tracking-tight">Welcome to TripNest</h2>
            <p className="text-[11px] text-white/50 mb-8 font-medium leading-relaxed px-2">Log in to save your itineraries and access your travel diaries across all devices.</p>

            {/* Google Sign In Button */}
            <button 
              onClick={() => {
                // Simulate login
                setTimeout(() => onClose(), 800);
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-bold text-[13px] tracking-wide cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] border shadow-lg"
              style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: 'transparent' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="w-full flex items-center justify-between my-5 gap-3 opacity-70">
              <div className="flex-1 h-[1px] bg-white/10"></div>
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">or</span>
              <div className="flex-1 h-[1px] bg-white/10"></div>
            </div>

            {/* Apple Sign In Button */}
            <button 
              onClick={() => {
                // Simulate login
                setTimeout(() => onClose(), 800);
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-bold text-[13px] tracking-wide cursor-pointer transition-all hover:bg-white/5 active:scale-[0.98] border"
              style={{ backgroundColor: 'transparent', color: '#ffffff', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <svg className="w-4 h-4 mb-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.4 7.6c-.5 0-1.4-.4-2.5-.4-1.6 0-3.1 1-3.9 2.4-1.7 3-.4 7.4 1.2 9.7 1.2 1.8 2.6 3.9 4.7 3.9s2.6-.9 4.8-.9c2.2 0 3 .9 4.8.9 1.8 0 3.3-2.1 4.5-3.9.7-1.1 1.3-2.6 1.7-4.1-2.2-1-3.6-3.2-3.6-5.8 0-3 2.1-5 2.2-5.1-1.3-1.9-3.4-2.1-4.1-2.2-1.3-.1-2.7.5-3.6.5zm-1.8-3c.8-1 1.4-2.4 1.3-3.8-1.2.1-2.7.7-3.6 1.7-.7.8-1.4 2.2-1.2 3.7 1.4.1 2.7-.6 3.5-1.6z"/>
              </svg>
              Continue with Apple
            </button>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
