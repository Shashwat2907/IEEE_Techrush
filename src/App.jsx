import { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { ItineraryProvider, useItinerary } from './context/ItineraryContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CompareProvider } from './context/CompareContext';
import useIsMobile from './hooks/useIsMobile';
import MapLibreGlobe from './features/globe-home/MapLibreGlobe';
import GlobeSearch from './features/globe-home/GlobeSearch';
import InteractiveTitle from './components/ui/InteractiveTitle';
import FloatingExploreArrow from './components/ui/FloatingExploreArrow';
import { getDestinationPhoto } from './services/photos';
import { SunIcon, MoonIcon } from './components/ui/Icons';
import LiveTripDashboard from './components/ui/LiveTripDashboard';

// Code-split heavy sidebars and modals
const DetailPanel = lazy(() => import('./features/destination-map/DetailPanel'));
const ItineraryBuilder = lazy(() => import('./features/itinerary/ItineraryBuilder'));
const PackingList = lazy(() => import('./features/itinerary/PackingList'));
const BudgetCalculator = lazy(() => import('./features/itinerary/BudgetCalculator'));
const PremadeItineraries = lazy(() => import('./features/itinerary/PremadeItineraries'));
const DiscoveryQuiz = lazy(() => import('./features/discovery-quiz/DiscoveryQuiz'));
const CompareDrawer = lazy(() => import('./features/destination-map/CompareDrawer'));

function TripNestMain() {
  const {
    viewState,
    selectedDestination,
    isPremadeOpen,
    isCompareOpen,
    isTransitioning,
    flightTarget,
    closePremade,
    openPremade,
    closeCompare,
    setSelectedDestination,
    activeDrawer,
    setActiveDrawer,
  } = useApp();

  const { isDark, toggleTheme } = useTheme();
  const { days } = useItinerary();
  const [liveModeDismissed, setLiveModeDismissed] = useState(false);

  const tripDays = useMemo(() => days?.length || 3, [days]);
  const isOverlayHidden = selectedDestination !== null || isTransitioning || flightTarget !== null;
  const quizActive = viewState === 'DISCOVERY_QUIZ';

  // Instantaneous, reactive mobile/desktop breakpoint detection (no reload needed)
  const isMobile = useIsMobile(768);
  const isTripLive = useMemo(() => {
    const start = days?.find((day) => day.dateStr)?.dateStr;
    const end = [...(days || [])].reverse().find((day) => day.dateStr)?.dateStr;
    const today = new Date().toISOString().split('T')[0];
    return Boolean(start && end && today >= start && today <= end);
  }, [days]);

  useEffect(() => {
    setLiveModeDismissed(false);
  }, [isTripLive]);

  const destPhoto = useMemo(() => {
    if (selectedDestination) return getDestinationPhoto(selectedDestination);
    return null;
  }, [selectedDestination]);

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${isDark ? 'dark bg-[#09090B] text-white' : 'light bg-[#F8F9FA] text-[#0F172A]'} bg-tactile-surface font-sans select-none`}>
      {/* ─── Full-Screen Map / Globe Stage (Always stays full-screen behind sidebar) ─── */}
      <div className="absolute inset-0 w-full h-full">
        <MapLibreGlobe />
      </div>

      {/* ─── Top Right Theme Toggle (Orbit View) ─── */}
      {!isOverlayHidden && (
        <div className="absolute top-5 right-5 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={toggleTheme}
            className="apple-liquid-glass w-9 h-9 rounded-full flex items-center justify-center border border-white/20 dark:border-white/20 light:border-black/10 shadow-lg hover:scale-105 transition-all cursor-pointer"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <SunIcon className="w-4 h-4 text-amber-400" /> : <MoonIcon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      )}

      {/* ─── Top Brand Title & HUD Search (Overlaid on Globe in Orbit View) ─── */}
      {!isOverlayHidden && (
        <div className="absolute inset-x-0 top-0 z-20 pointer-events-none flex flex-col items-center">
          <div className="pt-6 sm:pt-8 pb-1 text-center pointer-events-auto">
            <InteractiveTitle />
          </div>

          {!quizActive && (
            <div className="w-full px-4 max-w-2xl mt-1 pointer-events-auto">
              <GlobeSearch />
            </div>
          )}
        </div>
      )}

      {/* ─── Bottom Floating Minimal Arrow (Expands to Explore Trending Destinations) ─── */}
      {!isOverlayHidden && !quizActive && (
        <div className="absolute bottom-8 inset-x-0 z-20 flex justify-center pointer-events-none">
          <FloatingExploreArrow onClick={openPremade} />
        </div>
      )}

      {/* ─── Desktop Apple OS 26 Liquid Glass Dossier Drawer ─── */}
      {!isMobile && (
        <AnimatePresence>
          {activeDrawer && selectedDestination && (
            <motion.aside
              key="desktop-sidebar-container"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 280, mass: 0.8 }}
              className={`fixed top-4 right-4 bottom-4 w-[460px] max-w-[calc(100vw-2rem)] z-40 apple-liquid-glass rounded-[28px] overflow-hidden shadow-2xl flex flex-col border ${
                isDark ? 'border-white/15 text-white' : 'border-black/10 text-[#0F172A]'
              }`}
            >
              {/* Contextual Ambient Destination Photo Underlay */}
              {destPhoto && (
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-15">
                  <img
                    src={destPhoto}
                    alt=""
                    className="w-full h-full object-cover blur-2xl scale-125"
                  />
                  <div className={`absolute inset-0 ${isDark ? 'bg-[#0E0E14]/75' : 'bg-white/75'}`} />
                </div>
              )}

              <div className="relative z-10 w-full h-full flex flex-col">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeDrawer}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                    className="w-full h-full"
                  >
                    <Suspense
                      fallback={
                        <div className="h-full flex items-center justify-center text-zinc-400 text-xs font-mono">
                          Loading Expedition Dossier...
                        </div>
                      }
                    >
                      {activeDrawer === 'overview' && (
                        <DetailPanel
                          destination={selectedDestination}
                          weatherData={null}
                          crowdData={null}
                          onClose={() => setActiveDrawer(null)}
                          onPlanTrip={() => setActiveDrawer('itinerary')}
                        />
                      )}
                      {activeDrawer === 'itinerary' && (
                        <ItineraryBuilder
                          isOpen={true}
                          onClose={() => setActiveDrawer(null)}
                        />
                      )}
                      {activeDrawer === 'packing' && (
                        <PackingList
                          destination={selectedDestination}
                          weatherData={null}
                          tripDays={tripDays}
                          isOpen={true}
                          onClose={() => setActiveDrawer(null)}
                        />
                      )}
                      {activeDrawer === 'budget' && (
                        <BudgetCalculator
                          isOpen={true}
                          onClose={() => setActiveDrawer(null)}
                          onOpenItinerary={() => setActiveDrawer('itinerary')}
                        />
                      )}
                    </Suspense>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      )}

      {/* ─── Mobile Apple OS Liquid Bottom Drawer (Generous 92vh height, smooth spring) ─── */}
      {isMobile && (
        <AnimatePresence>
          {activeDrawer && selectedDestination && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-end bg-black/80 backdrop-blur-sm"
              onClick={() => setActiveDrawer(null)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 280, mass: 0.8 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full h-[92vh] max-h-[94vh] apple-liquid-glass rounded-t-[28px] border-t ${
                  isDark ? 'border-white/15 text-white' : 'border-black/10 text-black'
                } flex flex-col overflow-hidden shadow-2xl`}
              >
                {/* Subtle Grab Handle */}
                <div className="w-12 h-1 bg-white/30 dark:bg-white/30 light:bg-black/20 rounded-full mx-auto my-2.5 shrink-0" />

                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  <Suspense fallback={null}>
                    {activeDrawer === 'overview' && (
                      <DetailPanel
                        destination={selectedDestination}
                        weatherData={null}
                        crowdData={null}
                        onClose={() => setActiveDrawer(null)}
                        onPlanTrip={() => setActiveDrawer('itinerary')}
                      />
                    )}
                    {activeDrawer === 'itinerary' && (
                      <ItineraryBuilder
                        isOpen={true}
                        onClose={() => setActiveDrawer(null)}
                      />
                    )}
                    {activeDrawer === 'packing' && (
                      <PackingList
                        destination={selectedDestination}
                        weatherData={null}
                        tripDays={tripDays}
                        isOpen={true}
                        onClose={() => setActiveDrawer(null)}
                      />
                    )}
                    {activeDrawer === 'budget' && (
                      <BudgetCalculator
                        isOpen={true}
                        onClose={() => setActiveDrawer(null)}
                        onOpenItinerary={() => setActiveDrawer('itinerary')}
                      />
                    )}
                  </Suspense>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ─── Global Fullscreen Overlays ─── */}
      <Suspense fallback={null}>
        <AnimatePresence>
          {isPremadeOpen && (
            <PremadeItineraries
              isOpen={isPremadeOpen}
              onClose={closePremade}
              onSelectItinerary={() => {
                setActiveDrawer('overview');
              }}
            />
          )}

          {quizActive && (
            <DiscoveryQuiz
              onClose={() => {
                if (setSelectedDestination) setSelectedDestination(null);
              }}
            />
          )}

          {isCompareOpen && (
            <CompareDrawer
              isOpen={isCompareOpen}
              onClose={closeCompare}
            />
          )}
        </AnimatePresence>
      </Suspense>

      {isMobile && isTripLive && !liveModeDismissed && !quizActive && (
        <LiveTripDashboard onOpenPlanner={() => {
          setLiveModeDismissed(true);
          setActiveDrawer('itinerary');
        }} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <CompareProvider>
          <ItineraryProvider>
            <CurrencyProvider>
              <TripNestMain />
            </CurrencyProvider>
          </ItineraryProvider>
        </CompareProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
