import { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp, VIEW_STATES } from './context/AppContext';
import { FilterProvider } from './context/FilterContext';
import { ItineraryProvider, useItinerary } from './context/ItineraryContext';
import { CompareProvider } from './context/CompareContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { isFeatureEnabled } from './config/features';
import GlobeSearch from './features/globe-home/GlobeSearch';
import MapLibreGlobe from './features/globe-home/MapLibreGlobe';

const DiscoveryQuiz = lazy(() => import('./features/discovery-quiz/DiscoveryQuiz'));
const ItineraryBuilder = lazy(() => import('./features/itinerary/ItineraryBuilder'));
const PackingList = lazy(() => import('./features/itinerary/PackingList'));
const CompareDrawer = lazy(() => import('./features/destination-map/CompareDrawer'));
const PremadeItineraries = lazy(() => import('./features/itinerary/PremadeItineraries'));

function AppContent() {
  const {
    viewState,
    isTransitioning,
    selectedDestination,
    isPremadeOpen,
    openPremade,
    closePremade,
  } = useApp();
  // Single exclusive drawer — only one panel can be open at a time
  const [activeDrawer, setActiveDrawer] = useState(null); // 'itinerary' | 'packing' | 'compare' | null

  const { tripDays } = useItinerary();

  const isOverlayHidden =
    viewState === VIEW_STATES.DESTINATION_MAP ||
    selectedDestination !== null ||
    isTransitioning;

  const quizActive = viewState === VIEW_STATES.DISCOVERY_QUIZ;

  // Toggle drawer — clicking same button closes it
  const toggleDrawer = (drawer) => {
    setActiveDrawer((prev) => (prev === drawer ? null : drawer));
  };

  return (
    <div className="w-full h-full bg-bg-base relative overflow-hidden flex flex-col select-none">
      {/* ─── Unified MapLibre 3D Globe & Map ─── */}
      <div className="absolute inset-0 z-0">
        <MapLibreGlobe
          activeDrawer={activeDrawer}
          onToggleDrawer={toggleDrawer}
        />
      </div>

      {/* ─── Floating Header & Search on Orbit View ─── */}
      <div
        className={`absolute inset-x-0 top-0 z-20 pointer-events-none flex flex-col items-center transition-all duration-700 ease-in-out ${
          isOverlayHidden ? 'opacity-0 -translate-y-3 pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Centered Luxury Brand Header */}
        <div className="pt-6 sm:pt-8 lg:pt-10 pb-1 sm:pb-2 text-center pointer-events-auto flex flex-col items-center">
          <h1 className="font-brand text-2xl sm:text-3xl lg:text-5xl font-extrabold tracking-[0.22em] text-white uppercase drop-shadow-md select-none">
            TRIPNEST
          </h1>
          <p className="text-text-secondary/80 text-[10px] sm:text-xs mt-1 sm:mt-1.5 font-body font-semibold tracking-[0.28em] uppercase select-none">
            Explore · Plan · Fly
          </p>
        </div>

        {/* Floating Search Bar */}
        {!quizActive && (
          <div className="w-full px-3 sm:px-4 max-w-2xl mt-1 sm:mt-2 pointer-events-auto">
            <GlobeSearch />
          </div>
        )}
      </div>

      {/* ─── Bottom Slide-Up Trigger for Premade Itineraries (Landing Page) ─── */}
      {!isOverlayHidden && !quizActive && (
        <div className="absolute bottom-6 sm:bottom-8 inset-x-0 z-20 flex justify-center pointer-events-none">
          <motion.button
            type="button"
            onClick={openPremade}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.96 }}
            className="group pointer-events-auto flex items-center gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#0A0E17]/85 hover:bg-[#0A0E17]/95 backdrop-blur-xl border border-white/15 hover:border-white/30 text-white shadow-2xl transition-all cursor-pointer"
          >
            <motion.span
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="text-accent-sky font-bold text-sm"
            >
              ▲
            </motion.span>
            <span className="text-xs sm:text-sm font-display font-medium text-white/90 group-hover:text-white tracking-wide">
              Explore Premade Itineraries
            </span>
            <span className="text-[10px] font-mono text-accent-sky/90 bg-accent-sky/10 border border-accent-sky/20 px-2 py-0.5 rounded-full hidden sm:inline-block">
              15+ Guides
            </span>
          </motion.button>
        </div>
      )}

      {/* ─── Premade Itineraries Slide-Up Modal ─── */}
      <AnimatePresence>
        {isPremadeOpen && (
          <Suspense fallback={null}>
            <PremadeItineraries
              isOpen={isPremadeOpen}
              onClose={closePremade}
              onSelectItinerary={() => setActiveDrawer('itinerary')}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ─── Discovery Quiz Overlay ─── */}
      <AnimatePresence>
        {viewState === VIEW_STATES.DISCOVERY_QUIZ && isFeatureEnabled('discovery-quiz') && (
          <Suspense fallback={null}>
            <DiscoveryQuiz />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ─── Single Exclusive Drawer ─── */}
      <AnimatePresence mode="wait">
        {activeDrawer === 'itinerary' && isFeatureEnabled('itinerary') && (
          <Suspense fallback={null}>
            <ItineraryBuilder
              key="itinerary"
              isOpen={true}
              onClose={() => setActiveDrawer(null)}
            />
          </Suspense>
        )}

        {activeDrawer === 'packing' && isFeatureEnabled('packing') && (
          <Suspense fallback={null}>
            <PackingList
              key="packing"
              destination={selectedDestination}
              weatherData={null}
              tripDays={tripDays}
              isOpen={true}
              onClose={() => setActiveDrawer(null)}
            />
          </Suspense>
        )}

        {activeDrawer === 'compare' && isFeatureEnabled('compare') && (
          <Suspense fallback={null}>
            <CompareDrawer
              key="compare"
              isOpen={true}
              onClose={() => setActiveDrawer(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary name="TripNest">
      <ThemeProvider>
        <AppProvider>
          <FilterProvider>
            <ItineraryProvider>
              <CompareProvider>
                <AppContent />
              </CompareProvider>
            </ItineraryProvider>
          </FilterProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
