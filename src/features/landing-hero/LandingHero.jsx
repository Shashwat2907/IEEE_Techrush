import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

/* ─── Reusable Section Reveal Wrapper ─── */
function RevealSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 1, 0.5, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Card Stacking Feature Cards ─── */
function StackingFeatureCards({ scrollContainerRef }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const features = [
    { title: 'Globe', sub: 'INTERACTIVE 3D MAP', desc: 'Spin a stunning 3D globe to explore every corner of the world with real-time data layers.' },
    { title: 'AI Built', sub: 'SMART ITINERARIES', desc: 'Get AI-crafted day-by-day travel plans tailored to your style, budget, and interests.' },
    { title: 'Compare', sub: 'SIDE-BY-SIDE VIEW', desc: 'Compare destinations head-to-head — weather, costs, crowd levels — all at a glance.' },
    { title: 'Budget', sub: 'LIVE COST TRACKING', desc: 'Track every dollar in real time with category breakdowns and smart spend alerts.' },
  ];

  return (
    <div ref={containerRef} className="relative py-20 px-4 max-w-6xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {features.map((f, i) => {
          const start = i * 0.08;
          const y = useTransform(scrollYProgress, [0, 0.3 + start, 0.5 + start], [80 + i * 30, 0, 0]);
          const scale = useTransform(scrollYProgress, [0, 0.3 + start, 0.5 + start], [0.85, 1, 1]);
          const opacity = useTransform(scrollYProgress, [0, 0.25 + start, 0.45 + start], [0, 1, 1]);
          const rotate = useTransform(scrollYProgress, [0, 0.3 + start], [3 - i * 1.5, 0]);

          return (
            <motion.div
              key={i}
              style={{ y, scale, opacity, rotate }}
              className="bg-white/5 border border-white/10 rounded-3xl p-5 md:p-7 text-center backdrop-blur-sm hover:bg-white/10 hover:border-white/25 transition-all duration-300 cursor-default group"
            >
              <h3 className="font-bold text-xl md:text-2xl mb-1 group-hover:text-emerald-400 transition-colors">{f.title}</h3>
              <p className="text-[9px] tracking-[0.25em] text-gray-500 uppercase mb-3">{f.sub}</p>
              <p className="text-xs text-gray-400 leading-relaxed hidden md:block">{f.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Horizontal Stacking Diary Cards ─── */
function StackingDiaryCards({ navigate, scrollContainerRef }) {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const diaries = [
    {
      place: 'Bali, Indonesia',
      img: '/diaries/1.jpg',
      quote: '"Waking up to turquoise waters and golden sunrises felt like a dream I never wanted to end."',
      author: 'Emily R.',
      initial: 'E',
    },
    {
      place: 'Santorini, Greece',
      img: '/diaries/2.jpg',
      quote: '"Every corner has a postcard view, but the memories I made here are priceless."',
      author: 'James L.',
      initial: 'J',
    },
    {
      place: 'Cape Town, South Africa',
      img: '/diaries/3.jpg',
      quote: '"Between the mountains and the ocean, I found a peace I didn\'t know I was searching for."',
      author: 'Sarah K.',
      initial: 'S',
    },
    {
      place: 'Kyoto, Japan',
      img: '/diaries/4.jpg',
      quote: '"The temples and gardens felt timeless. A journey that truly changed my perspective."',
      author: 'Michael T.',
      initial: 'M',
    },
    {
      place: 'Banff, Canada',
      img: '/diaries/5.jpg',
      quote: '"Pristine lakes and towering peaks. Nature at its absolute finest."',
      author: 'Anna B.',
      initial: 'A',
    },
    {
      place: 'Amalfi Coast, Italy',
      img: '/diaries/6.jpg',
      quote: '"The food, the views, the people. Everything was just spectacular."',
      author: 'David L.',
      initial: 'D',
    },
  ];

  return (
    <div ref={containerRef} className="h-[400vh] relative w-full bg-[#16161C]" id="stories">
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden px-4 md:px-8">
        
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-5xl md:text-7xl font-bold mb-2 leading-tight">
            Traveler <span className="italic text-gray-500">Diaries</span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto">
            Real stories from real travelers. Scroll to read their adventures, stacking one by one.
          </p>
        </div>

        <div className="relative w-full max-w-sm md:max-w-xl h-[380px] md:h-[450px]">
          {diaries.map((d, i) => {
            const step = 1 / diaries.length;
            const start = i * step;
            // The card comes from the right (100vw), reaches 0 when its start threshold hits.
            // As we scroll further, it slightly shifts left and scales down.
            
            const xTransform = useTransform(
              scrollYProgress,
              [Math.max(0, start - step), start, 1],
              ['100vw', '0vw', `-${(diaries.length - 1 - i) * 3}vw`]
            );
            
            const scaleTransform = useTransform(
              scrollYProgress,
              [start, 1],
              [1, 1 - (diaries.length - 1 - i) * 0.05]
            );

            const zIndex = i;

            return (
              <motion.div
                key={i}
                style={{ x: xTransform, scale: scaleTransform, zIndex }}
                className="absolute inset-0 bg-[#1A1A1D] rounded-3xl overflow-hidden border border-white/15 shadow-2xl cursor-pointer hover:border-white/40 transition-colors flex flex-col"
                onClick={() => navigate('/explore')}
              >
                <div className="h-3/5 overflow-hidden relative shrink-0">
                  <img
                    src={d.img}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    alt={d.place}
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#1A1A1D] to-transparent h-2/3" />
                  <span className="absolute bottom-4 left-5 font-bold text-lg md:text-xl">{d.place}</span>
                </div>
                <div className="p-5 md:p-8 flex flex-col justify-between flex-grow">
                  <p className="italic text-gray-300 md:text-lg leading-relaxed text-sm">
                    {d.quote}
                  </p>
                  <div className="flex items-center mt-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold mr-3 shadow-md">
                      {d.initial}
                    </div>
                    <span className="text-gray-400 font-medium text-sm md:text-base">{d.author}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LANDING HERO — Full scrollable landing page
   ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingHero() {
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);
  const { scrollY } = useScroll({ container: scrollContainerRef });
  const heroScale = useTransform(scrollY, [0, 800], [1, 1.25]);
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);

  return (
    <div ref={scrollContainerRef} className="w-full h-screen overflow-y-auto bg-[#0E0E12] text-white font-sans overflow-x-hidden">
      {/* ─── Fixed Navbar ─── */}
      <nav className="fixed top-0 inset-x-0 flex items-center justify-between px-6 md:px-8 py-4 z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm text-white">
        <div>
          <span className="text-lg font-bold tracking-wider">TRIPNEST</span>
          <br />
          <span className="text-[9px] tracking-[0.3em] font-normal text-gray-300 uppercase">
            Explore the world
          </span>
        </div>
        <div className="hidden md:flex space-x-6 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full text-sm font-medium border border-white/15">
          <a href="#about" className="text-white hover:text-emerald-400 transition-colors">ABOUT</a>
          <a href="#destinations" className="text-white hover:text-emerald-400 transition-colors">DESTINATIONS</a>
          <a href="#stories" className="text-white hover:text-emerald-400 transition-colors">STORIES</a>
        </div>
        <button
          onClick={() => navigate('/explore')}
          className="bg-white/8 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium border border-white/15 hover:bg-white/15 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="hidden sm:inline">SIGN IN</span>
        </button>
      </nav>

      {/* ─── 1. Hero Section (Zooming Background) ─── */}
      <section className="relative h-screen flex items-center justify-start px-8 md:px-24 overflow-hidden">
        <motion.div 
          className="absolute inset-0 z-0 origin-center"
          style={{ scale: heroScale, opacity: heroOpacity }}
        >
          <img
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"
            alt="Hiker in mountain valley"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E12] via-transparent to-black/30" />
        </motion.div>

        <div className="relative z-10 max-w-2xl mt-12">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1] }}
            className="text-6xl md:text-9xl font-bold leading-[0.95]"
          >
            Plan Your
            <br />
            <span className="italic text-gray-200">Trip.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="mt-6 text-gray-300 text-base md:text-lg max-w-sm leading-relaxed"
          >
            We don't just show you places; we take you on journeys that stay
            with you forever.
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            onClick={() => navigate('/explore')}
            className="mt-8 bg-white text-black px-7 py-3.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]"
          >
            EXPLORE JOURNEYS <span className="text-lg">→</span>
          </motion.button>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-60">
          <span className="text-[10px] tracking-[0.3em] uppercase mb-2">Scroll</span>
          <div className="w-5 h-7 border-2 border-white/50 rounded-full flex justify-center pt-1.5">
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="w-1 h-1 bg-white rounded-full"
            />
          </div>
        </div>
      </section>

      {/* ─── 2. About TripNest (Moved UP as requested) ─── */}
      <section id="about" className="relative z-10 bg-[#0E0E12] py-24 px-8 md:px-24">
        <RevealSection className="max-w-4xl mx-auto text-center mb-16">
          <h3 className="text-4xl md:text-5xl font-bold mb-6">
            About <span className="italic text-gray-500">TripNest</span>
          </h3>
          <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
            TripNest is your AI-powered travel companion that transforms the
            way you plan, explore, and experience the world. We combine
            real-time data, smart itinerary planning, and crowd insights to
            craft personalized journeys tailored to your interests, budget,
            and travel style.
          </p>
        </RevealSection>
      </section>

      {/* ─── 3. Feature Cards ─── */}
      <section className="bg-[#0E0E12]">
        <StackingFeatureCards scrollContainerRef={scrollContainerRef} />
      </section>

      {/* ─── 4. Journey Map Section (Updated with Map Screenshot) ─── */}
      <section
        id="destinations"
        className="py-24 px-8 md:px-24 flex flex-col md:flex-row items-center justify-between gap-12 bg-gradient-to-b from-[#0E0E12] to-[#16161C]"
      >
        <RevealSection className="md:w-1/3 text-center md:text-left">
          <h2 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            Journey
            <br />
            <span className="italic text-gray-500">Map</span>
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed text-lg">
            Every journey is a story. Explore our interactive 3D globe to see where the road can take you, complete with real-time routes and data.
          </p>
          <button
            onClick={() => navigate('/explore')}
            className="text-base font-bold bg-white text-black px-6 py-3 rounded-full hover:bg-gray-200 transition-colors shadow-lg"
          >
            Open Interactive Globe →
          </button>
        </RevealSection>
        <RevealSection className="md:w-2/3 w-full" delay={0.15}>
          <div 
            className="w-full h-[350px] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl relative bg-black border-2 border-white/10 group cursor-pointer" 
            onClick={() => navigate('/explore')}
          >
            {/* Using the actual map screenshot rather than random image */}
            <img
              src="/map-screenshot.png"
              alt="TripNest 3D Map Interface"
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-700"
              onError={(e) => {
                // Fallback if the map screenshot fails to load
                e.target.src = "https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2074&auto=format&fit=crop";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0E0E12]/80 to-transparent pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <span className="bg-black/60 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full text-base font-bold shadow-2xl">
                Explore The Globe
              </span>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ─── 5. Traveler Diaries (Horizontal Stacking Cards) ─── */}
      <StackingDiaryCards navigate={navigate} scrollContainerRef={scrollContainerRef} />

      {/* ─── 6. Final CTA / The World is Waiting ─── */}
      <section className="relative min-h-[80vh] flex flex-col justify-center items-center">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop"
            alt="Mountain sunset"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-[#16161C]" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
          <RevealSection>
            <h2 className="text-5xl sm:text-7xl md:text-8xl font-bold italic mb-6 drop-shadow-2xl">
              The World is Waiting.
            </h2>
            <p className="text-gray-200 mb-10 max-w-lg mx-auto drop-shadow-md leading-relaxed text-lg md:text-xl">
              Pack your bag, open your heart, and let's create stories for a lifetime.
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-10 py-4 rounded-full text-lg font-bold transition-all shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] hover:scale-[1.03] active:scale-[0.98]"
            >
              PLAN YOUR JOURNEY →
            </button>
          </RevealSection>
        </div>

        <div className="absolute bottom-6 inset-x-0 text-center text-xs text-gray-500 italic z-10">
          Built with ❤️ for travelers who believe the best stories are lived, not told.
        </div>
      </section>
    </div>
  );
}
