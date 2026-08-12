import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { StarsBackground } from '../../App';

const DESTINATION_POOL = [
  { id: 'paris', city: 'Paris', country: 'France', img: 'https://plus.unsplash.com/premium_photo-1718035557075-5111d9d906d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8MXx8cGFyaXMlMjBuaWdodHxlbnwwfHx8fDE3ODY1MzU4OTV8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 'dubai', city: 'Dubai', country: 'UAE', img: 'https://plus.unsplash.com/premium_photo-1697729914552-368899dc4757?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8MXx8ZHViYWklMjBuaWdodHxlbnwwfHx8fDE3ODY1MzU4OTZ8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 'new-york', city: 'New York', country: 'USA', img: 'https://plus.unsplash.com/premium_photo-1714051660720-888e8454a021?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8MXx8bmV3JTIweW9yayUyMG5pZ2h0fGVufDB8fHx8MTc4NjUzNTg5Nnww&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 'tokyo', city: 'Tokyo', country: 'Japan', img: 'https://plus.unsplash.com/premium_photo-1661914240950-b0124f20a5c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8MXx8dG9reW8lMjBuaWdodHxlbnwwfHx8fDE3ODY1MzU4OTd8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 'sydney', city: 'Sydney', country: 'Australia', img: 'https://plus.unsplash.com/premium_photo-1697730262092-03c94e7dd8fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8MXx8c3lkbmV5JTIwbmlnaHR8ZW58MHx8fHwxNzg2NTM1ODk4fDA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 'rome', city: 'Rome', country: 'Italy', img: 'https://plus.unsplash.com/premium_photo-1675975706513-9daba0ec12a8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8MXx8cm9tZSUyMG5pZ2h0fGVufDB8fHx8MTc4NjUzNTg5OXww&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 'cairo', city: 'Cairo', country: 'Egypt', img: 'https://plus.unsplash.com/premium_photo-1697729777503-5a6ff8d6d877?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8MXx8Y2Fpcm8lMjBuaWdodHxlbnwwfHx8fDE3ODY1MzU5MDB8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 'rio', city: 'Rio de Janeiro', country: 'Brazil', img: 'https://plus.unsplash.com/premium_photo-1679690867090-4a742837d75b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8MXx8cmlvJTIwbmlnaHR8ZW58MHx8fHwxNzg2NTM1OTAwfDA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 'machu', city: 'Machu Picchu', country: 'Peru', img: 'https://plus.unsplash.com/premium_photo-1733342585862-075c3a4b1038?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8MXx8bWFjaHUlMjBwaWNjaHUlMjBuaWdodHxlbnwwfHx8fDE3ODY1MzU5MDJ8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 'santorini', city: 'Santorini', country: 'Greece', img: 'https://plus.unsplash.com/premium_photo-1661964149725-fbf14eabd38c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8MXx8c2FudG9yaW5pJTIwbmlnaHR8ZW58MHx8fHwxNzg2NTM1OTAyfDA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 'london', city: 'London', country: 'UK', img: 'https://plus.unsplash.com/premium_photo-1682056762907-23d08f913805?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8MXx8bG9uZG9uJTIwbmlnaHR8ZW58MHx8fHwxNzg2NTM1OTAzfDA&ixlib=rb-4.1.0&q=80&w=1080' },
  { id: 'bali', city: 'Bali', country: 'Indonesia', img: 'https://plus.unsplash.com/premium_photo-1678303396234-4180231353df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMjA3fDB8MXxzZWFyY2h8MXx8YmFsaSUyMG5pZ2h0fGVufDB8fHx8MTc4NjUzNTkwNHww&ixlib=rb-4.1.0&q=80&w=1080' }
];

export default function LandingHero() {
  const navigate = useNavigate();
  const [startIndex, setStartIndex] = useState(0);
  const [isFlying, setIsFlying] = useState(false);

  const handleStartExploring = () => {
    setIsFlying(true);
    setTimeout(() => {
      navigate('/explore', { state: { incomingPlane: true } });
    }, 1000);
  };

  const planePath = useMemo(() => {
    const endY = -150 - Math.random() * 150;
    const midY = endY * 0.4;
    const endRotate = -5 - Math.random() * 20;
    const midRotate = endRotate * 0.5;
    return {
      initial: { opacity: 0, scale: 0.5, x: 0, y: 0, rotate: 0 },
      animate: { 
        opacity: 1, 
        scale: [0.5, 3, 5], 
        x: [0, "40vw", "120vw"], 
        y: [0, midY, endY], 
        rotate: [0, midRotate, endRotate] 
      }
    };
  }, []);

  useEffect(() => {
    // 5-second rotation (5000ms) for small span change
    const interval = setInterval(() => {
      setStartIndex((prev) => (prev + 4) % DESTINATION_POOL.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeDestinations = useMemo(() => {
    const result = [];
    for (let i = 0; i < 4; i++) {
      result.push(DESTINATION_POOL[(startIndex + i) % DESTINATION_POOL.length]);
    }
    return result;
  }, [startIndex]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.5 }}
      className="relative w-screen min-h-screen bg-[#0a1128] text-white overflow-y-auto overflow-x-hidden flex flex-col items-center justify-between font-sans selection:bg-emerald-500/30"
    >
      <StarsBackground />

      {/* Soft Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center">
        <div className="w-[120%] h-[50%] bg-emerald-500/10 rounded-full blur-[150px] opacity-30 transform -translate-y-20" />
      </div>

      <header className="w-full relative z-20 flex flex-col items-center pt-8 md:pt-12 shrink-0">
        <div className="flex items-center gap-3 md:gap-4 mb-4">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-transparent border-2 border-emerald-400 flex items-center justify-center">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-emerald-400" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-[0.25em] uppercase text-white drop-shadow-xl">TripNest</h1>
        </div>
        <p className="text-[10px] md:text-xs tracking-[0.3em] font-mono text-emerald-400/80">DISCOVER. PLAN. TAKE OFF.</p>
      </header>

      {/* Center: Carousel & Airplane Graphic */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex-1 flex flex-col items-center justify-center mt-8 mb-4 px-4">
        {/* The 4 Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full h-[65vh] md:h-[80vh] max-h-[800px]">
          {activeDestinations.map((dest, i) => (
            <div 
              key={i} 
              className={`relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden border border-emerald-500/20 shadow-[0_0_30px_rgba(0,0,0,0.5)]`}
            >
              <AnimatePresence initial={false}>
                <motion.div
                  key={dest.id}
                  initial={{ x: "20%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "-20%", opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="absolute inset-0 w-full h-full"
                >
                  <img src={dest.img} alt={dest.city} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#0a1128]/95 via-[#0a1128]/20 to-[#0a1128]/90" />
                  
                  <div className="absolute top-0 left-0 w-full p-5 md:p-8 flex flex-col items-center mt-2">
                    <div className="flex items-center gap-2 mb-1.5 text-white">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.242-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      <h3 className="text-sm md:text-lg font-black tracking-widest uppercase drop-shadow-md">{dest.city}</h3>
                    </div>
                    <p className="text-[9px] md:text-xs tracking-[0.2em] font-mono font-bold text-emerald-400 uppercase drop-shadow-md">{dest.country}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action Section (Glassmorphic Bottom Overlay) */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] w-full max-w-lg px-4 pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-center bg-[#0a1128]/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
          <h2 className="text-[8px] md:text-[10px] tracking-[0.3em] font-mono text-emerald-400 mb-1">EXPLORING</h2>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-2 drop-shadow-xl text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
            WORLD
          </h1>
          <div className="flex items-center gap-4 mb-4 md:mb-6">
            <div className="w-8 md:w-12 h-[1px] bg-emerald-400/50" />
            <span className="text-[8px] md:text-[10px] tracking-[0.3em] font-mono text-emerald-400">WITH US</span>
            <div className="w-8 md:w-12 h-[1px] bg-emerald-400/50" />
          </div>

          <button 
            onClick={handleStartExploring}
            disabled={isFlying}
            className="group px-6 md:px-8 py-2 md:py-3 rounded-full border border-emerald-400 bg-emerald-500/80 hover:bg-emerald-500/100 transition-all duration-300 flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)] hover:shadow-[0_0_25px_rgba(52,211,153,0.8)] scale-100 hover:scale-105 disabled:opacity-80 disabled:hover:scale-100"
            aria-label="Start Exploring"
          >
            <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-white drop-shadow-md">Start Exploring</span>
            
            <div className="relative w-4 h-4 overflow-visible">
              <AnimatePresence mode="wait">
                {!isFlying ? (
                  <motion.svg 
                    key="arrow"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute inset-0 w-4 h-4 text-white transition-transform group-hover:translate-x-1.5" 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                  </motion.svg>
                ) : (
                  <motion.svg 
                    key="plane"
                    initial={planePath.initial}
                    animate={planePath.animate}
                    transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute -inset-2 w-10 h-10 z-50 drop-shadow-[0_15px_30px_rgba(52,211,153,0.8)]" 
                    viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
                  >
                    <g transform="translate(5, 20)">
                      {/* Tail */}
                      <path d="M 5,30 L 15,5 L 25,5 L 25,30 Z" fill="#e2e8f0" />
                      <path d="M 22,5 L 25,5 L 25,30 L 22,30 Z" fill="#ef4444" />
                      
                      {/* Back Wing */}
                      <path d="M 40,35 L 20,15 L 30,15 L 50,35 Z" fill="#cbd5e1" />
                      
                      {/* Fuselage */}
                      <path d="M 5,35 C 5,25 65,25 75,30 C 85,35 85,45 75,50 C 65,55 5,55 5,35 Z" fill="#ffffff" />
                      
                      {/* Red Stripe on fuselage */}
                      <path d="M 10,40 L 75,40" stroke="#ef4444" strokeWidth="1.5" fill="none" />
                      
                      {/* Cockpit Window */}
                      <path d="M 68,30 C 72,30 75,32 75,35 L 70,35 Z" fill="#38bdf8" />
                      
                      {/* Passenger Windows */}
                      <circle cx="30" cy="34" r="1" fill="#38bdf8" />
                      <circle cx="35" cy="34" r="1" fill="#38bdf8" />
                      <circle cx="40" cy="34" r="1" fill="#38bdf8" />
                      <circle cx="45" cy="34" r="1" fill="#38bdf8" />
                      <circle cx="50" cy="34" r="1" fill="#38bdf8" />
                      <circle cx="55" cy="34" r="1" fill="#38bdf8" />
                      
                      {/* Front Wing */}
                      <path d="M 35,45 L 15,70 L 25,70 L 55,45 Z" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />
                      
                      {/* Front Engine */}
                      <rect x="30" y="47" width="12" height="6" rx="3" fill="#94a3b8" />
                      <rect x="40" y="48" width="2" height="4" fill="#334155" />
                    </g>
                  </motion.svg>
                )}
              </AnimatePresence>
            </div>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
