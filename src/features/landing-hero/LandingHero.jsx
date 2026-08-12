import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SignInModal from '../../components/ui/SignInModal';

/* ─── Images matching reference screenshot ─── */
const HERO_IMG  = 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=90&w=2400&auto=format&fit=crop';
const MAP_BG    = '/textures/custom_map.png';
const CTA_IMG   = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=85&w=2000&auto=format&fit=crop';

/* ─── Data ─── */
const STATS = [
  { num: 'Globe',    sub: 'Interactive 3D Map' },
  { num: 'AI Built', sub: 'Smart Itineraries' },
  { num: 'Compare',  sub: 'Side-by-Side View' },
  { num: 'Budget',   sub: 'Live Cost Tracking' },
];

/* Positions chosen to match the reference image layout */
const PINS = [
  { id: 'bali',     name: 'Bali',      country: 'Indonesia',    t: '51%', l: '85%', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=160&auto=format&fit=crop' },
  { id: 'dubai',    name: 'Dubai',     country: 'UAE',          t: '36%', l: '63%', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=160&auto=format&fit=crop' },
  { id: 'santorini',name: 'Santorini', country: 'Greece',       t: '26%', l: '57%', img: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=160&auto=format&fit=crop' },
  { id: 'kyoto',    name: 'Kyoto',     country: 'Japan',        t: '31%', l: '92%', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=160&auto=format&fit=crop' },
  { id: 'capetown', name: 'Cape Town', country: 'South Africa', t: '58%', l: '54%', img: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=160&auto=format&fit=crop' },
];

const DIARIES = [
  { id: 1, loc: 'Bali, Indonesia',       author: 'Emily R.', quote: '"Waking up to turquoise waters and golden sunrises felt like a dream I never wanted to end."',            img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=480&auto=format&fit=crop' },
  { id: 2, loc: 'Santorini, Greece',     author: 'James L.', quote: '"Every corner has a postcard view, but the memories I made here are priceless."',                        img: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=480&auto=format&fit=crop' },
  { id: 3, loc: 'Cape Town, South Africa', author: 'Sarah K.', quote: '"Between the mountains and the ocean, I found a peace I didn\'t know I was searching for."',            img: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=480&auto=format&fit=crop' },
];

const CATS = [
  { e: '🏔️', l: 'Adventure', s: 'Seek the thrill' },
  { e: '🏛️', l: 'Culture',   s: 'Embrace the world' },
  { e: '🌿', l: 'Nature',    s: 'Find your calm' },
  { e: '🍜', l: 'Food',      s: 'Taste the stories' },
  { e: '👥', l: 'People',    s: 'Connect deeply' },
];

/* ─── Scroll-reveal helper ─── */
function FadeUp({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 44 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Torn-paper divider ─── */
function TornEdge({ topColor, bottomColor }) {
  return (
    <div className="relative w-full pointer-events-none" style={{ height: 52, marginTop: -1 }}>
      <svg viewBox="0 0 1440 52" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%' }}>
        <path
          d="M0,0 L0,28 C80,48 160,8 240,28 C320,48 400,8 480,28 C560,48 640,8 720,28 C800,48 880,8 960,28 C1040,48 1120,8 1200,28 C1280,48 1360,8 1440,28 L1440,52 L0,52 Z"
          fill={bottomColor}
        />
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════ */
export default function LandingHero() {
  const navigate = useNavigate();
  const [showAbout, setShowAbout] = useState(false);
  const [hoveredNav, setHoveredNav] = useState(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const wrapRef  = useRef(null);
  const heroRef  = useRef(null);
  const mapRef   = useRef(null);
  const diarRef  = useRef(null);
  const aboutRef = useRef(null);

  /* Hero parallax */
  const { scrollYProgress } = useScroll({ target: heroRef, container: wrapRef, offset: ['start start', 'end start'] });
  const heroY     = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  const handleExplore = () => {
    navigate('/explore', { state: { incomingPlane: true } });
  };

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /* ── Colour tokens (clean dark palette) ── */
  const C = {
    hero:    'transparent',
    map:     'transparent',
    diaries: 'transparent',
    accent:  '#ffffff',
    gold:    '#d1d5db',
    text:    'rgba(255,255,255,0.88)',
    muted:   'rgba(255,255,255,0.50)',
    faint:   'rgba(255,255,255,0.28)',
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-screen h-screen overflow-y-auto overflow-x-hidden text-white font-sans bg-[#040814]"
      style={{ scrollSnapType: 'y proximity' }}
    >
      {/* Blurred fixed background for the whole page */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img src={HERO_IMG} alt="" className="w-full h-full object-cover blur-[60px] opacity-[0.22] scale-110" />
      </div>

      {/* ╔══════════════════════════════════════════
          ║  PART 1 — HERO
          ╚══════════════════════════════════════════ */}
      <section ref={heroRef} className="relative z-10 w-full min-h-screen flex flex-col overflow-hidden" style={{ scrollSnapAlign: 'start', backgroundColor: C.hero }}>

        {/* Parallax image */}
        <motion.div style={{ y: heroY, scale: heroScale }} className="absolute inset-0 will-change-transform">
          <img
            src={HERO_IMG}
            alt="Traveler at golden sunset"
            className="w-full h-full object-cover object-[center_30%]"
            fetchpriority="high"
          />
          {/* Subtle dark overlays for text readability without blue tint */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.8) 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 55%)' }} />
        </motion.div>

        {/* Navbar */}
        <motion.nav
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative z-30 flex items-center justify-between px-6 md:px-10 py-4"
        >
          {/* Logo */}
          <button onClick={() => wrapRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 cursor-pointer group">
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-black tracking-[0.16em] uppercase text-white">TripNest</span>
              <span className="text-[7px] tracking-[0.26em] uppercase font-semibold" style={{ color: C.accent }}>Explore the World</span>
            </div>
          </button>

          {/* Links — Capsule segmented control */}
          <div
            className="hidden md:flex items-center p-1.5 rounded-full border shadow-2xl backdrop-blur-md"
            style={{ backgroundColor: 'rgba(20,24,32,0.65)', borderColor: 'rgba(255,255,255,0.08)' }}
            onMouseLeave={() => setHoveredNav(null)}
          >
            {[['Destinations', () => scrollTo(mapRef)], ['Stories', () => scrollTo(diarRef)], ['About', () => scrollTo(aboutRef)]].map(([lbl, fn]) => {
              const isHovered = hoveredNav === lbl;
              return (
                <button
                  key={lbl}
                  onClick={fn}
                  onMouseEnter={() => setHoveredNav(lbl)}
                  className="relative px-5 py-2 text-[10px] font-bold tracking-[0.18em] uppercase cursor-pointer rounded-full transition-colors"
                  style={{ color: isHovered ? '#ffffff' : 'rgba(255,255,255,0.55)' }}
                >
                  {isHovered && (
                    <motion.div
                      layoutId="navPill"
                      className="absolute inset-0 rounded-full border"
                      style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.05)' }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{lbl}</span>
                </button>
              );
            })}
          </div>

          {/* Sign In button */}
          <button
            onClick={() => setShowSignIn(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black tracking-widest uppercase cursor-pointer transition-all duration-300 hover:scale-105 border shadow-xl backdrop-blur-md"
            style={{ borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(20,24,32,0.65)', color: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(20,24,32,0.65)'; }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Sign In
          </button>
        </motion.nav>

        {/* Hero body */}
        <div className="relative z-20 flex-1 flex flex-col justify-center px-6 md:px-10 pb-16 pt-2">



          {/* Headline clip-up animation */}
          {['Plan Your'].map((line, i) => (
            <div key={line} className="overflow-hidden">
              <motion.h1
                initial={{ y: '120%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.92, ease: [0.16, 1, 0.3, 1], delay: 0.3 + i * 0.13 }}
                className="font-black leading-none tracking-tight pb-2"
                style={{ fontSize: 'clamp(2.6rem,7.5vw,6.5rem)' }}
              >
                {line}
              </motion.h1>
            </div>
          ))}
          <div className="overflow-hidden mb-7">
            <motion.h1
              initial={{ y: '120%' }}
              animate={{ y: 0 }}
              transition={{ duration: 0.92, ease: [0.16, 1, 0.3, 1], delay: 0.43 }}
              className="font-black leading-none tracking-tight italic text-white/80 pb-4"
              style={{ fontSize: 'clamp(2.6rem,7.5vw,6.5rem)' }}
            >
              Trip.
            </motion.h1>
          </div>

          {/* Sub + CTA */}
          <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.70 }} className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <p className="text-sm leading-relaxed max-w-[255px]" style={{ color: C.muted }}>
              We don't just show you places, we take you on journeys that stay with you forever.
            </p>

            <button
              id="hero-cta"
              onClick={handleExplore}
              className="relative flex items-center gap-2.5 rounded-full text-[11px] font-black uppercase tracking-widest px-7 py-3.5 cursor-pointer transition-all duration-300 hover:scale-105"
              style={{ backgroundColor: '#fff', color: '#000' }}
            >
              Explore Journeys
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </motion.div>

          {/* Right italic quote */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="absolute right-7 md:right-12 bottom-16 hidden md:block text-right max-w-[130px]">
            <p className="text-[11px] italic leading-snug" style={{ color: 'rgba(255,255,255,0.42)' }}>
              The world is full of stories, go live yours.
            </p>
          </motion.div>
        </div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          onClick={() => scrollTo(mapRef)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 cursor-pointer"
        >
          <span className="text-[7px] tracking-[0.3em] uppercase font-bold" style={{ color: 'rgba(255,255,255,0.32)' }}>Scroll</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }} className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center pt-1.5">
            <div className="w-1 h-1.5 rounded-full bg-white/50" />
          </motion.div>
        </motion.div>

        {/* Torn-paper bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <TornEdge topColor="transparent" bottomColor={C.map} />
        </div>
      </section>

      {/* ╔══════════════════════════════════════════
          ║  PART 2 — STATS + JOURNEY MAP
          ╚══════════════════════════════════════════ */}
      <section
        ref={mapRef}
        className="relative w-full min-h-screen flex flex-col"
        style={{ scrollSnapAlign: 'start', backgroundColor: C.map }}
      >
        {/* Night sky texture background */}
        <div className="absolute inset-0" style={{ backgroundColor: C.map }} />

        {/* Stats bar */}
        <div className="relative z-10 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <FadeUp key={s.sub} delay={i * 0.08} className="flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-white/20 bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.07)] transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:border-white/50 cursor-pointer group">
                <span className="text-3xl font-black text-white mb-2 group-hover:scale-105 transition-transform">{s.num}</span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-white/50">{s.sub}</span>
              </FadeUp>
            ))}
          </div>
        </div>

        {/* Journey Map */}
        <div className="relative z-10 flex-1 flex items-center py-14 md:py-16">
          <div className="max-w-[100rem] mx-auto w-full px-6 md:px-12 grid md:grid-cols-12 gap-8 md:gap-10 items-center">

            {/* Left text */}
            <FadeUp className="md:col-span-4 lg:col-span-3">
              <h2 className="text-5xl md:text-7xl font-black leading-[0.9] mb-4 text-white">
                Journey<br />
                <span className="italic" style={{ color: 'rgba(255,255,255,0.35)' }}>Map</span>
              </h2>
              <p className="text-sm leading-relaxed mb-7 max-w-xs" style={{ color: C.muted }}>
                Every journey is a story. Here's where the road can take you.
              </p>
              <button onClick={handleExplore} className="inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4 cursor-pointer hover:opacity-80 transition-opacity text-white/70">
                Start exploring →
              </button>
            </FadeUp>

            {/* Right — Map canvas */}
            <FadeUp delay={0.16} className="md:col-span-8 lg:col-span-9">
              <div className="relative w-full rounded-2xl overflow-hidden border shadow-2xl" style={{ aspectRatio: '2/1', borderColor: 'rgba(255,255,255,0.12)', backgroundColor: '#0a1225' }}>
                {/* Real satellite world map */}
                <img src={MAP_BG} alt="World Map" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                {/* Subtle dark overlay for readability */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(8,16,32,0.3) 0%, rgba(8,16,32,0.1) 50%, rgba(8,16,32,0.3) 100%)' }} />
              </div>
            </FadeUp>
          </div>
        </div>

        {/* Torn-paper to section 3 */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <TornEdge topColor="transparent" bottomColor={C.diaries} />
        </div>
      </section>

      {/* ╔══════════════════════════════════════════
          ║  PART 3 — DIARIES + CTA + FOOTER
          ╚══════════════════════════════════════════ */}
      <section
        ref={diarRef}
        className="relative w-full min-h-screen flex flex-col"
        style={{ scrollSnapAlign: 'start', backgroundColor: C.diaries }}
      >
        {/* Subtle night texture */}


        {/* Traveler Diaries */}
        <div className="relative z-10 py-14 md:py-18 flex-1">
          <div className="max-w-7xl mx-auto px-6 md:px-10">

            {/* Section header */}
            <div className="grid md:grid-cols-2 gap-10 items-start mb-12">
              <FadeUp>
                <h2 className="text-5xl md:text-6xl font-black leading-[0.9] text-white">
                  Traveler<br />
                  <span className="italic" style={{ color: 'rgba(255,255,255,0.32)' }}>Diaries</span>
                </h2>
              </FadeUp>
              <FadeUp delay={0.1} className="flex flex-col justify-end">
                <p className="text-sm leading-relaxed mb-5 max-w-xs" style={{ color: C.muted }}>
                  Real stories from real travelers. Be inspired by their adventures.
                </p>
                <button onClick={handleExplore} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-bold cursor-pointer self-start hover:opacity-80 transition-all border-white/30 text-white/70">
                  Read Diaries →
                </button>
              </FadeUp>
            </div>

            {/* Polaroid cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {DIARIES.map((d, i) => (
                <FadeUp key={d.id} delay={i * 0.12}>
                  <motion.div
                    whileHover={{ y: -7, rotate: i === 1 ? 0 : i === 0 ? -1.2 : 1.2 }}
                    transition={{ type: 'spring', stiffness: 240 }}
                    onClick={handleExplore}
                    className="relative rounded-xl overflow-hidden cursor-pointer group border"
                    style={{ backgroundColor: '#0c1426', borderColor: 'rgba(255,255,255,0.08)' }}
                  >
                    {/* Photo */}
                    <div className="relative h-44 overflow-hidden">
                      <img src={d.img} alt={d.loc} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      {/* Tape strips like reference */}
                      <div className="absolute top-2 left-5 w-10 h-3 rounded-sm -rotate-2" style={{ backgroundColor: 'rgba(255,255,255,0.32)', backdropFilter: 'blur(2px)' }} />
                      <div className="absolute top-2 right-5 w-10 h-3 rounded-sm rotate-2"  style={{ backgroundColor: 'rgba(255,255,255,0.32)', backdropFilter: 'blur(2px)' }} />
                      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(12,20,38,0.88) 0%, transparent 58%)' }} />
                      <div className="absolute bottom-2.5 left-3.5 text-xs font-bold" style={{ color: 'rgba(255,255,255,0.78)' }}>{d.loc}</div>
                    </div>
                    {/* Content */}
                    <div className="p-4">
                      <p className="text-sm italic leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.62)' }}>{d.quote}</p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0 bg-white/20">{d.author[0]}</div>
                        <span className="text-xs font-semibold" style={{ color: C.faint }}>— {d.author}</span>
                      </div>
                    </div>
                  </motion.div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>

        {/* Full-bleed CTA — "The World is Waiting" */}
        <div className="relative w-full" style={{ height: '52vh', minHeight: 380 }}>
          <img src={CTA_IMG} alt="" className="absolute inset-0 w-full h-full object-cover object-[center_35%]" />
          {/* Subtle neutral overlay for text readability */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.9) 100%)' }} />

          <FadeUp className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
            <h2 className="font-black italic mb-3 leading-tight text-white" style={{ fontSize: 'clamp(2.4rem,6vw,5.5rem)' }}>
              The World is Waiting.
            </h2>
            <p className="text-sm mb-9 max-w-md leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)' }}>
              Pack your bag, open your heart, and let's create stories for a lifetime.
            </p>
            <button
              onClick={handleExplore}
              className="flex items-center gap-3 rounded-full text-[11px] font-black tracking-widest uppercase px-8 py-4 cursor-pointer transition-all duration-300 hover:scale-105 border-2 border-white/40 bg-white/10 text-white hover:bg-white hover:text-black"
            >
              Plan Your Journey →
            </button>
          </FadeUp>
        </div>



        {/* ── ABOUT SECTION ── */}
        <div ref={aboutRef} className="relative z-10 border-t py-14 md:py-20" style={{ backgroundColor: C.diaries, borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="max-w-3xl mx-auto px-6 md:px-10 text-center">
            <FadeUp>
              <h2 className="text-4xl md:text-5xl mb-6 text-white" style={{ fontFamily: '"Playfair Display", "Times New Roman", Times, serif' }}>About <span className="italic">TripNest</span></h2>
              <p className="text-sm md:text-base leading-relaxed mb-6" style={{ color: C.muted }}>
                TripNest is your AI-powered travel companion that transforms the way you plan, explore, and experience the world.
                We combine real-time data, smart itinerary planning, and crowd insights to craft personalized journeys
                tailored to your interests, budget, and travel style.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
                {[
                  { title: 'Smart Globe Explorer', desc: 'Spin the interactive 3D globe to discover destinations with real-time weather, crowd levels, and travel data.' },
                  { title: 'AI Itinerary Builder', desc: 'Get personalized day-by-day travel plans crafted by AI, optimized for your preferences and budget.' },
                  { title: 'Live Crowd Insights', desc: 'See real-time crowd levels at popular attractions so you can avoid the rush and enjoy hidden gems.' },
                ].map((feat, i) => (
                  <FadeUp key={feat.title} delay={i * 0.1} className="flex flex-col h-full">
                    <div className="flex-1 flex flex-col justify-center rounded-2xl p-6 border border-white/20 bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.07)] text-center transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:border-white/50 cursor-pointer group">
                      <h3 className="text-lg font-black text-white mb-3 group-hover:scale-105 transition-transform">{feat.title}</h3>
                      <p className="text-xs leading-relaxed text-white/60">{feat.desc}</p>
                    </div>
                  </FadeUp>
                ))}
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="mt-10 text-xs italic" style={{ color: C.faint }}
              >
                Built with ❤️ for travelers who believe the best stories are lived, not told.
              </motion.p>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* Modals */}
      <SignInModal isOpen={showSignIn} onClose={() => setShowSignIn(false)} />

    </div>
  );
}
