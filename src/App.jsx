import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp, VIEW_STATES } from './context/AppContext';
import { FilterProvider } from './context/FilterContext';
import { ItineraryProvider, useItinerary } from './context/ItineraryContext';
import { CompareProvider } from './context/CompareContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import GlobeSearch from './features/globe-home/GlobeSearch';
import MapLibreGlobe from './features/globe-home/MapLibreGlobe';

const DiscoveryQuiz = lazy(() => import('./features/discovery-quiz/DiscoveryQuiz'));
const ItineraryBuilder = lazy(() => import('./features/itinerary/ItineraryBuilder'));
const PackingList = lazy(() => import('./features/itinerary/PackingList'));
const BudgetCalculator = lazy(() => import('./features/itinerary/BudgetCalculator'));
const DetailPanel = lazy(() => import('./features/destination-map/DetailPanel'));
const CompareDrawer = lazy(() => import('./features/destination-map/CompareDrawer'));
const PremadeItineraries = lazy(() => import('./features/itinerary/PremadeItineraries'));

function PremadeTriggerButton({ onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="pointer-events-auto flex items-center gap-2 cursor-pointer select-none transition-all py-2 px-3 group"
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        className="text-white/80 group-hover:text-accent-sky text-xs sm:text-sm flex items-center justify-center transition-colors"
      >
        ▲
      </motion.div>

      <AnimatePresence initial={false}>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, width: 0, x: -4 }}
            animate={{ opacity: 1, width: 'auto', x: 0 }}
            exit={{ opacity: 0, width: 0, x: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden whitespace-nowrap"
          >
            <span className="text-xs font-normal text-white/90 tracking-wide font-body">
              Explore trending destinations
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  } = useApp();

  const [activeDrawer, setActiveDrawer] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const { tripDays } = useItinerary();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isOverlayHidden =
    viewState === VIEW_STATES.DESTINATION_MAP ||
    selectedDestination !== null ||
    isTransitioning;

  const quizActive = viewState === VIEW_STATES.DISCOVERY_QUIZ;

  const toggleDrawer = (drawer) => {
    setActiveDrawer((prev) => (prev === drawer ? null : drawer));
  };

  return (
    <div className="w-full h-full bg-[#06090F] relative overflow-hidden flex flex-row select-none">
      {/* ─── Map Workspace ─── */}
      <div className="flex-1 h-full relative overflow-hidden">
        <MapLibreGlobe
          activeDrawer={activeDrawer}
          onToggleDrawer={toggleDrawer}
        />

        {/* Floating Brand & Search Bar (Landing View) */}
        <div
          className={`absolute inset-x-0 top-0 z-20 pointer-events-none flex flex-col items-center transition-all duration-700 ease-in-out ${
            isOverlayHidden ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Brand Header */}
          <div className="pt-7 sm:pt-9 pb-2 text-center pointer-events-auto flex flex-col items-center">
            <h1 className="font-brand text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.22em] text-white uppercase drop-shadow-md select-none">
              TRIPNEST
            </h1>
            <p className="text-text-secondary/80 text-[11px] sm:text-xs mt-1.5 font-body font-semibold tracking-[0.28em] uppercase select-none">
              Explore · Plan · Fly
            </p>
          </div>

          {/* Floating Search */}
          {!quizActive && (
            <div className="w-full px-4 max-w-xl mt-1.5 pointer-events-auto">
              <GlobeSearch />
            </div>
          )}
        </div>

        {/* Bottom Slide-Up Arrow Trigger */}
        {!isOverlayHidden && !quizActive && (
          <div className="absolute bottom-6 sm:bottom-8 inset-x-0 z-20 flex justify-center pointer-events-none">
            <PremadeTriggerButton onClick={openPremade} />
          </div>
        )}
      </div>

      {/* ─── Desktop Smooth Retractable Sidebar ─── */}
      {!isMobile && (
        <AnimatePresence>
          {activeDrawer && selectedDestination && (
            <motion.aside
              key="desktop-sidebar-container"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 440, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="flex-shrink-0 h-full border-l border-white/[0.06] bg-[#0B101B] z-40 overflow-hidden"
            >
              <div className="w-[440px] h-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeDrawer}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="w-full h-full"
                  >
                    <Suspense
                      fallback={
                        <div className="h-full flex items-center justify-center text-text-secondary text-xs">
                          Loading...
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

      {/* ─── Mobile Bottom Sheet Drawer ─── */}
      {isMobile && (
        <AnimatePresence>
          {activeDrawer && selectedDestination && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
              onClick={() => setActiveDrawer(null)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-h-[82vh] bg-[#0B101B] border-t border-white/[0.08] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-2.5" />

                <div className="flex-1 overflow-y-auto">
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
                      />
                    )}
                  </Suspense>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ─── Trending Itineraries Slide-Up Screen ─── */}
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

      {/* ─── AI Travel Matchmaker Quiz ─── */}
      <AnimatePresence>
        {viewState === VIEW_STATES.DISCOVERY_QUIZ && (
          <Suspense fallback={null}>
            <DiscoveryQuiz />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ─── Compare Destinations Modal ─── */}
      <AnimatePresence>
        {isCompareOpen && (
          <Suspense fallback={null}>
            <CompareDrawer
              isOpen={true}
              onClose={closeCompare}
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
          <CurrencyProvider>
            <FilterProvider>
              <ItineraryProvider>
                <CompareProvider>
                  <AppContent />
                </CompareProvider>
              </ItineraryProvider>
            </FilterProvider>
          </CurrencyProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
