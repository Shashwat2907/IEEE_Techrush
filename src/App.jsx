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
import { KeyIcon } from './components/ui/Icons';

const DiscoveryQuiz = lazy(() => import('./features/discovery-quiz/DiscoveryQuiz'));
const ItineraryBuilder = lazy(() => import('./features/itinerary/ItineraryBuilder'));
const PackingList = lazy(() => import('./features/itinerary/PackingList'));
const CompareDrawer = lazy(() => import('./features/destination-map/CompareDrawer'));
const PremadeItineraries = lazy(() => import('./features/itinerary/PremadeItineraries'));
const ApiKeyModal = lazy(() => import('./components/ui/ApiKeyModal'));

function PremadeTriggerButton({ onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileTap={{ scale: 0.95 }}
      layout
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="group pointer-events-auto flex items-center justify-center gap-2 px-3 py-2 sm:py-2.5 rounded-full bg-[#07090E]/90 hover:bg-[#0A0E17]/98 backdrop-blur-2xl border border-white/15 hover:border-accent-sky/40 text-white shadow-2xl transition-colors cursor-pointer overflow-hidden"
    >
      <motion.span
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
        className="text-accent-sky font-bold text-sm sm:text-base px-1"
      >
        ▲
      </motion.span>

      <AnimatePresence initial={false}>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden whitespace-nowrap pr-2 flex items-center gap-2"
          >
            <span className="text-xs sm:text-sm font-display font-medium text-white/95 tracking-wide">
              Check already made itineraries
            </span>
            <span className="text-[10px] font-mono text-accent-sky bg-accent-sky/15 border border-accent-sky/30 px-1.5 py-0.5 rounded-full">
              15+ Guides
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function AppContent() {
  const {
    viewState,
    isTransitioning,
    selectedDestination,
    isPremadeOpen,
    openPremade,
    closePremade,
    isCompareOpen,
    closeCompare,
    isApiKeyModalOpen,
    openApiKeyModal,
    closeApiKeyModal,
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
        {/* Top-Right API Keys Trigger Button */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 pointer-events-auto">
          <button
            type="button"
            onClick={openApiKeyModal}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[#0A0E17]/80 hover:bg-[#0A0E17]/95 border border-white/10 hover:border-accent-sky/30 text-text-secondary hover:text-white shadow-xl backdrop-blur-xl transition-all flex items-center gap-1.5 group"
            title="Configure API Keys & Services"
          >
            <KeyIcon className="w-3.5 h-3.5 text-accent-sky group-hover:rotate-45 transition-transform" />
            <span className="text-[11px] font-mono hidden sm:inline text-text-secondary group-hover:text-white">
              API Keys
            </span>
          </button>
        </div>

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
          <PremadeTriggerButton onClick={openPremade} />
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

      {/* ─── Discovery Quiz / AI Travel Concierge Overlay ─── */}
      <AnimatePresence>
        {viewState === VIEW_STATES.DISCOVERY_QUIZ && isFeatureEnabled('discovery-quiz') && (
          <Suspense fallback={null}>
            <DiscoveryQuiz />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ─── Compare Destinations Modal / Drawer ─── */}
      <AnimatePresence>
        {(isCompareOpen || activeDrawer === 'compare') && isFeatureEnabled('compare') && (
          <Suspense fallback={null}>
            <CompareDrawer
              isOpen={true}
              onClose={() => {
                closeCompare();
                setActiveDrawer(null);
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ─── API Key Settings Modal ─── */}
      <AnimatePresence>
        {isApiKeyModalOpen && (
          <Suspense fallback={null}>
            <ApiKeyModal
              isOpen={isApiKeyModalOpen}
              onClose={closeApiKeyModal}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ─── Single Exclusive Drawer for Itinerary & Packing ─── */}
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
